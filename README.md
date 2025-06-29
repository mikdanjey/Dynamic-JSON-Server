# Dynamic JSON Server

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
pm2 start server.js --name "Dynamic JSON Server p=8000"
```

---

### List of Collections

GET http://localhost:8000/admin/collections

```json
["posts", "comments", "customers", "users", "vendors", "products"]
```

### New Collection Create

POST http://localhost:8000/admin/collections/products

```json
{ "name": "Laptop", "price": 1000 }
```

### Delete the existing Collection

DELETE http://localhost:8000/admin/collections/products
