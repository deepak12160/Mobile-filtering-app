# 📱 Mobile Filter App — Backend

Node.js + Express + MySQL + Redis backend for searching, filtering, and comparing smartphones.

---

## 🏗 Project Structure

```
mobile-filter-backend/
├── server.js                    # Entry point
├── .env.example                 # Environment variable template
├── package.json
│
├── config/
│   ├── database.js              # MySQL connection pool
│   └── redis.js                 # Redis cache client
│
├── database/
│   ├── schema.sql               # All 8 MySQL tables
│   └── seed.js                  # Sample mobile data
│
├── middlewares/
│   ├── auth.middleware.js       # JWT verification
│   ├── error.middleware.js      # Global error handler
│   └── validation.middleware.js # express-validator rules
│
├── services/
│   ├── auth.service.js          # Signup / login / token logic
│   ├── mobile.service.js        # Filter, compare, search
│   └── user.service.js          # Profile, wishlist
│
├── controllers/
│   ├── auth.controller.js
│   ├── mobile.controller.js
│   └── user.controller.js
│
├── routes/
│   ├── auth.routes.js
│   ├── mobile.routes.js
│   └── user.routes.js
│
└── utils/
    └── response.js              # Standardised response helpers
```

---

## ⚙️ Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your MySQL credentials and JWT secrets
```

### 3. Create the database
```bash
mysql -u root -p < database/schema.sql
```

### 4. Seed sample data (5 flagship phones)
```bash
npm run seed
```

### 5. Start the server
```bash
# Development (hot reload)
npm run dev

# Production
npm start
```

Server runs at `http://localhost:5000`

---

## 🗄 Database Schema (8 Tables)ssion** — gzip on all responses
