const path = require("path");
const cors = require("cors");
const jsonServer = require("json-server");
const jwt = require("jsonwebtoken");

require("dotenv").config();

const server = jsonServer.create();

const dbFile = path.join(__dirname, "db.json");
const router = jsonServer.router(dbFile);

const middlewares = jsonServer.defaults();

const NODE_PORT = process.env.NODE_PORT || 8000;

const ENABLE_BASIC_AUTH = process.env.ENABLE_BASIC_AUTH === "true";
const BASIC_AUTH_USERNAME = process.env.BASIC_AUTH_USERNAME || "admin";
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD || "admin";

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

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

server.use(cors("*"));
server.use(middlewares);

// Add custom routes before JSON Server router
server.get("/echo", (req, res) => {
  res.jsonp(req.query);
});

server.use(jsonServer.bodyParser);

if (ENABLE_BASIC_AUTH) {
  // Basic Auth for all routes
  server.use(basicAuth);
}

server.use((req, res, next) => {
  if (req.method === "POST") {
    req.body.createdAt = Date.now();
  }
  next();
});

// GET full DB
server.get("/db", (req, res) => {
  const freshRouter = jsonServer.router(dbFile);
  res.json(freshRouter.db.getState());
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

server.post("/login", (req, res) => {
  const { email, password } = req.body;
  const users = router.db.getState().users;

  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const authUser = { ...user };
  delete authUser.password;
  delete authUser.createdAt;
  delete authUser.updatedAt;
  const token = generateToken(authUser);
  res.json({ ...authUser, token });
});

server.get("/profile", authenticateToken, (req, res) => {
  const users = router.db.getState().users;
  const { id: userId } = req.currentUser;
  const user = users.find(u => u.id === userId);
  if (!user) return res.sendStatus(404);
  const authUser = { ...user };
  delete authUser.password;
  delete authUser.createdAt;
  delete authUser.updatedAt;
  res.json(authUser);
});

// Mount the default router
server.use(router);

// Start the server
server.listen(NODE_PORT, () => {
  console.log(`JSON Server is running at http://localhost:${NODE_PORT}`);
});
