const fs = require("fs");
const path = require("path");
const cors = require("cors");
const jsonServer = require("json-server");

const server = jsonServer.create();

const dbFile = path.join(__dirname, "db.json");
const router = jsonServer.router(dbFile);

const middlewares = jsonServer.defaults();

server.use(cors("*"));
server.use(middlewares);
server.use(jsonServer.bodyParser);

server.use((req, res, next) => {
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

server.get("/admin/echo", (req, res) => {
  res.jsonp(req.query);
});

server.get("/admin/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// GET full DB
server.get("/admin/db", (req, res) => {
  const freshRouter = jsonServer.router(dbFile);
  res.json(freshRouter.db.getState());
});

// GET /admin/collections
server.get("/admin/collections", (req, res) => {
  const collections = Object.keys(router.db.getState());
  res.jsonp(collections);
});

// POST /admin/collections/:name → dynamically add new collection
server.post("/admin/collections/:name", (req, res) => {
  const collectionName = req.params.name;
  const db = router.db; // Lowdb instance

  const isValidCollectionName = /^[a-zA-Z0-9_-]+$/.test(collectionName);
  if (!isValidCollectionName) {
    return res.status(400).jsonp({ error: "Invalid collection name." });
  }

  // Check if collection already exists
  if (db.has(collectionName).value()) {
    return res.status(400).jsonp({ error: "Collection already exists." });
  }

  // Create new collection with optional initial data or empty array
  const initialData = Array.isArray(req.body) ? req.body : [];
  db.set(collectionName, initialData).write();

  // Optionally, persist changes to disk immediately
  fs.writeFileSync(dbFile, JSON.stringify(db.getState(), null, 2));

  // Recreate the router and re-mount it
  const newRouter = jsonServer.router(dbFile);
  server._router.stack = server._router.stack.filter(layer => !(layer && layer.name === "router"));
  server.use(newRouter);

  res.status(201).jsonp({ message: `Collection '${collectionName}' created.` });
});

// DELETE /admin/collections/:name → delete a collection from db.json
server.delete("/admin/collections/:name", (req, res) => {
  const collectionName = req.params.name;
  const db = router.db; // Lowdb instance

  const isValidCollectionName = /^[a-zA-Z0-9_-]+$/.test(collectionName);
  if (!isValidCollectionName) {
    return res.status(400).jsonp({ error: "Invalid collection name." });
  }

  // Check if collection exists
  if (!db.has(collectionName).value()) {
    return res.status(404).jsonp({ error: `Collection '${collectionName}' does not exist.` });
  }

  const protected = ["users", "admin"];
  if (protected.includes(collectionName)) {
    return res.status(403).jsonp({ error: "Cannot delete protected collection." });
  }

  // Remove the collection
  db.unset(collectionName).write();

  // Persist the changes to db.json
  fs.writeFileSync(dbFile, JSON.stringify(db.getState(), null, 2));
  console.log(`[${new Date().toISOString()}] Deleted collection: ${collectionName}`);

  res.status(200).jsonp({ message: `Collection '${collectionName}' deleted.` });
});

// Mount the default router
server.use(router);

// Start the server
server.listen(8000, () => {
  console.log("JSON Server is running at http://localhost:8000");
});
