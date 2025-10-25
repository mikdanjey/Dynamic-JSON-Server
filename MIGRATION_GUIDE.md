# JSON Server Migration Guide: 0.17.4 vs 1.0.0-beta.3

## The Problem

JSON Server 1.0.0-beta.3 introduced breaking changes that make it incompatible with code written for version 0.17.4:

1. **ES Modules**: The new version is an ES module (`"type": "module"`) instead of CommonJS
2. **API Changes**: The old `jsonServer.create()`, `jsonServer.router()`, `jsonServer.defaults()` API no longer exists
3. **Database Handling**: Uses `lowdb` v7 with a different API
4. **Import System**: Requires ES6 import syntax instead of `require()`

## Solutions Provided

### Option 1: Use json-server 0.17.4 (Recommended for existing projects)

**Files**: `dynamic-server.js`, `static-server.js`
**Command**: `npm start` or `npm run dev`

This maintains full compatibility with your existing code.

### Option 2: Use json-server 1.0.0-beta.3 (Future-proof)

**File**: `dynamic-server-v1.js`
**Command**: `npm run start:v1` or `npm run dev:v1`

This version is rewritten to work with the new API.

## Key Differences in 1.0.0-beta.3

### Import Changes

```javascript
// Old (0.17.4)
const jsonServer = require("json-server");

// New (1.0.0-beta.3)
import { createApp } from "json-server-beta/lib/app.js";
```

### Database Handling

```javascript
// Old (0.17.4)
const router = jsonServer.router(dbFile);
const db = router.db; // Lowdb v1 API

// New (1.0.0-beta.3)
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, {});
await db.read(); // Async operations
```

### Server Creation

```javascript
// Old (0.17.4)
const server = jsonServer.create();
const middlewares = jsonServer.defaults();
server.use(middlewares);
server.use(router);

// New (1.0.0-beta.3)
const app = createApp(db); // Direct app creation
```

## Running the Servers

### Version 0.17.4

```bash
npm start        # Runs dynamic-server.js
npm run dev      # Runs with nodemon
```

### Version 1.0.0-beta.3

```bash
npm run start:v1 # Runs dynamic-server-v1.js
npm run dev:v1   # Runs with nodemon
```

## Features Supported

Both versions support:

- ✅ Basic Auth
- ✅ JWT Authentication
- ✅ Dynamic collection creation/deletion
- ✅ CORS
- ✅ Automatic timestamps (createdAt/updatedAt)
- ✅ Custom admin endpoints
- ✅ Login/Profile endpoints

## Recommendation

For existing projects, stick with **json-server 0.17.4** until you're ready to migrate your entire codebase to ES modules.

For new projects, consider using **json-server 1.0.0-beta.3** for future compatibility.
