import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { createApp } from "json-server-beta/lib/app.js";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NODE_PORT = process.env.NODE_PORT || 8000;
const ENABLE_BASIC_AUTH = process.env.ENABLE_BASIC_AUTH === "true";
const BASIC_AUTH_USERNAME = process.env.BASIC_AUTH_USERNAME || "admin";
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD || "admin";
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

const dbFile = path.join(__dirname, "db.json");

// Initialize database
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, {});
await db.read();

// Create json-server app
const app = createApp(db);

const decodeBase64 = str => Buffer.from(str, "base64").toString("utf-8");

function basicAuth(req, res, next) {
  // Skip authentication for these paths
  const excludedPaths = ["/profile"];
  if (excludedPaths.includes(req.path)) return next();

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="JSON Server"');
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    const base64Credentials = authHeader.split(" ")[1];
    const decoded = decodeBase64(base64Credentials);
    const [username, password] = decoded.split(":");

    if (username === BASIC_AUTH_USERNAME && password === BASIC_AUTH_PASSWORD) {
      return next();
    } else {
      return res.status(403).json({ error: "Invalid credentials." });
    }
  } catch {
    return res.status(400).json({ error: "Malformed authorization header." });
  }
}

// Add CORS
app.use(cors());

if (ENABLE_BASIC_AUTH) {
  app.use(basicAuth);
}

// Add timestamp middleware
app.use((req, res, next) => {
  const isObject = obj => typeof obj === "object" && obj !== null;

  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    const now = new Date().toISOString();

    if (Array.isArray(req.body)) {
      req.body = req.body.map(item => (isObject(item) ? { ...item, ...(req.method === "POST" ? { createdAt: now } : {}), updatedAt: now } : item));
    } else if (isObject(req.body)) {
      if (req.method === "POST" && !req.body.createdAt) {
        req.body.createdAt = now;
      }
      req.body.updatedAt = now;
    }
  }
  next();
});

// Custom routes
app.get("/db", async (req, res) => {
  await db.read();
  res.json(db.data);
});

app.get("/admin/echo", (req, res) => {
  res.json(req.query);
});

app.get("/admin/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.get("/admin/collections", async (req, res) => {
  await db.read();
  const collections = Object.keys(db.data);
  res.json(collections);
});

function generateToken(user) {
  return jwt.sign(user, JWT_SECRET_KEY, { expiresIn: "7d" });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.sendStatus(401);
  const token = authHeader.split(" ")[1];
  jwt.verify(token, JWT_SECRET_KEY, (err, currentUser) => {
    if (err) return res.sendStatus(403);
    req.currentUser = currentUser;
    next();
  });
}

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  await db.read();
  const users = db.data.users || [];

  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const authUser = { ...user };
  delete authUser.password;
  delete authUser.createdAt;
  delete authUser.updatedAt;
  const token = generateToken(authUser);
  res.json({ ...authUser, token });
});

app.get("/profile", authenticateToken, async (req, res) => {
  await db.read();
  const users = db.data.users || [];
  const { id: userId } = req.currentUser;
  const user = users.find(u => u.id === userId);
  if (!user) return res.sendStatus(404);
  const authUser = { ...user };
  delete authUser.password;
  delete authUser.createdAt;
  delete authUser.updatedAt;
  res.json(authUser);
});

// Dynamic collection management
app.post("/admin/collections/:name", async (req, res) => {
  const collectionName = req.params.name;

  const isValidCollectionName = /^[a-zA-Z0-9_-]+$/.test(collectionName);
  if (!isValidCollectionName) {
    return res.status(400).json({ error: "Invalid collection name." });
  }

  await db.read();

  // Check if collection already exists
  if (db.data[collectionName]) {
    return res.status(400).json({ error: "Collection already exists." });
  }

  // Normalize input data
  const rawData = Array.isArray(req.body) ? req.body : typeof req.body === "object" && req.body !== null ? [req.body] : [];

  // Find the highest existing id (if any) to avoid duplicates
  const maxExistingId = rawData.map(item => (typeof item.id === "number" ? item.id : 0)).reduce((max, id) => Math.max(max, id), 0);

  let idCounter = maxExistingId + 1;

  const initialData = rawData
    .map(item => {
      if (typeof item !== "object" || item === null) return null;
      return {
        ...item,
        id: item.id ?? idCounter++,
      };
    })
    .filter(Boolean);

  db.data[collectionName] = initialData;
  await db.write();

  res.status(201).json({ message: `Collection '${collectionName}' created.`, count: initialData.length });
});

app.delete("/admin/collections/:name", async (req, res) => {
  const collectionName = req.params.name;

  const isValidCollectionName = /^[a-zA-Z0-9_-]+$/.test(collectionName);
  if (!isValidCollectionName) {
    return res.status(400).json({ error: "Invalid collection name." });
  }

  await db.read();

  // Check if collection exists
  if (!db.data[collectionName]) {
    return res.status(404).json({ error: `Collection '${collectionName}' does not exist.` });
  }

  const protectedCollections = ["users", "admin"];
  if (protectedCollections.includes(collectionName)) {
    return res.status(403).json({ error: "Cannot delete protected collection." });
  }

  // Remove the collection
  delete db.data[collectionName];
  await db.write();

  console.log(`[${new Date().toISOString()}] Deleted collection: ${collectionName}`);

  res.status(200).json({ message: `Collection '${collectionName}' deleted.` });
});

// Start the server
app.listen(NODE_PORT, () => {
  console.log(`Dynamic JSON Server (v1.0.0-beta.3) is running at http://localhost:${NODE_PORT}`);
});
