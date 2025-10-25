# Dynamic JSON Server

### Clone the Dynamic JSON Server

```bash
git clone https://github.com/mikdanjey/Dynamic-JSON-Server.git Dynamic-JSON-Server
```

```bash
cd Dynamic-JSON-Server
```

### Install the dependencies

```bash
yarn install
```

### Update the .env

```bash
cp .env.example .env
```

### Run in Dev Mode

```bash
yarn dev
```

### Install pm2 & setup

```bash
sudo npm install -g pm2
```

### Reset the DB

```bash
cp db-empty-reset.json db.json
```

### Run in Prod Mode

```bash
pm2 start dynamic-server.js --name "Dynamic JSON Server p=8000"
```

```bash
pm2 start static-server.js --name "Static JSON Server p=8000"
```

```bash
json-server db.json --port 8000
```

---

### List of Collections

GET http://localhost:8000/admin/collections

```json
["posts", "comments", "customers", "users", "vendors"]
```

### New Collection Create

POST http://localhost:8000/admin/collections/products

```json
[
  { "name": "Gadget 1", "price": 999 },
  { "name": "Gadget 2", "price": 2999 }
]
```

### Delete the existing Collection

DELETE http://localhost:8000/admin/collections/products
