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

## 🗄 Database Schema (8 Tables)

| Table | Purpose |
|---|---|
| `users` | Auth — email, hashed password, uuid |
| `mobiles` | Master table — brand, model, price, OS |
| `cameras` | Rear + front MP, aperture, OIS, video |
| `storage` | Internal GB, expandable, type (UFS/NVMe) |
| `ram` | RAM GB + LPDDR type |
| `processors` | Chip, manufacturer, cores, GHz, AnTuTu |
| `display` | Size, resolution, panel, refresh rate, HDR |
| `battery` | mAh, fast charge watts, wireless charge |
| `user_wishlist` | user_id ↔ mobile_id many-to-many |
| `refresh_tokens` | Rotating refresh token hashes |

All spec tables have `mobile_id` FK → `mobiles.id`

---

## 📡 API Reference

### Auth

#### POST `/api/auth/signup`
```json
Body:  { "name": "Rahul", "email": "rahul@example.com", "password": "Secret123" }

Response 201:
{
  "success": true,
  "data": {
    "user": { "id": 1, "uuid": "...", "name": "Rahul", "email": "rahul@example.com" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

#### POST `/api/auth/login`
```json
Body:  { "email": "rahul@example.com", "password": "Secret123" }
Response 200: same shape as signup
```

#### POST `/api/auth/refresh`
```json
Body:  { "refreshToken": "eyJ..." }
Response: { "accessToken": "...", "refreshToken": "..." }
```

#### POST `/api/auth/logout` 🔒
```json
Headers: Authorization: Bearer <accessToken>
Body:    { "refreshToken": "eyJ..." }
```

#### GET `/api/auth/me` 🔒
```json
Response: { "id": 1, "name": "Rahul", "email": "..." }
```

---

### Mobiles

#### GET `/api/mobiles` — Filter & Search

All query params are optional and combinable:

| Param | Type | Example | Description |
|---|---|---|---|
| `search` | string | `samsung` | Brand, model, or chip name search |
| `brand` | string | `Apple` | Exact brand match |
| `os` | string | `Android` | OS contains match |
| `min_price` | number | `20000` | Minimum price (INR) |
| `max_price` | number | `80000` | Maximum price |
| `min_ram` | int | `8` | Minimum RAM in GB |
| `max_ram` | int | `16` | Maximum RAM in GB |
| `min_storage` | int | `128` | Minimum internal storage (GB) |
| `min_camera_mp` | number | `50` | Minimum rear camera MP |
| `ois` | bool | `true` | Has optical image stabilisation |
| `min_battery_mah` | int | `4500` | Minimum battery capacity |
| `fast_charge` | int | `65` | Minimum fast charge watts |
| `min_display_size` | number | `6.5` | Minimum screen size (inches) |
| `max_display_size` | number | `6.9` | Maximum screen size |
| `min_refresh_rate` | int | `120` | Minimum refresh rate (Hz) |
| `panel_type` | string | `AMOLED` | Exact panel type |
| `processor_brand` | string | `Qualcomm` | Processor manufacturer |
| `min_antutu` | int | `1000000` | Minimum AnTuTu benchmark |
| `sort_by` | string | `price_inr` | Field to sort by |
| `sort_order` | string | `asc` | `asc` or `desc` |
| `page` | int | `1` | Page number |
| `limit` | int | `20` | Results per page (max 50) |

**Example:**
```
GET /api/mobiles?min_ram=8&min_camera_mp=50&max_price=80000&sort_by=price_inr&sort_order=asc
```

**Response:**
```json
{
  "success": true,
  "data": [ { "id": 3, "brand": "OnePlus", "model": "12", "price_inr": 64999, "ram_gb": 12, ... } ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

---

#### GET `/api/mobiles/options` — Filter Dropdown Options
```json
Response:
{
  "brands":           [{ "brand": "Apple" }, { "brand": "Samsung" }, ...],
  "os":               [{ "os": "Android 14" }, { "os": "iOS 17" }],
  "panel_types":      [{ "panel_type": "AMOLED" }, ...],
  "processor_brands": [{ "manufacturer": "Apple" }, { "manufacturer": "Qualcomm" }, ...],
  "price_range":      [{ "min": 64999, "max": 159900 }],
  "ram_options":      [{ "ram_gb": 8 }, { "ram_gb": 12 }, { "ram_gb": 16 }],
  "storage_options":  [{ "internal_gb": 128 }, { "internal_gb": 256 }, ...]
}
```

---

#### GET `/api/mobiles/:id` — Full Mobile Specs
```
GET /api/mobiles/1
```
Returns all columns from all 7 spec tables for a single mobile.

---

#### GET `/api/mobiles/compare?ids=1,2,3` — Side-by-side Comparison
```
GET /api/mobiles/compare?ids=1,2,3
```
- Min 2, max 4 IDs
- Returns full specs for each + `diffs` object highlighting which fields differ

```json
{
  "mobiles": [ { ...full specs... }, { ...full specs... } ],
  "diffs": {
    "price_inr":      { "values": [64999, 159900], "differs": true },
    "ram_gb":         { "values": [12, 8],          "differs": true },
    "rear_main_mp":   { "values": [50, 48],         "differs": true },
    "antutu_score":   { "values": [2050000, 1800000], "differs": true }
  }
}
```

---

### Users (all protected 🔒)

#### GET `/api/users/profile`
```json
{ "id": 1, "uuid": "...", "name": "Rahul", "email": "...", "created_at": "..." }
```

#### PATCH `/api/users/profile`
```json
Body: { "name": "Rahul Sharma" }
```

#### GET `/api/users/wishlist`
Returns list of wishlisted mobiles with key specs.

#### POST `/api/users/wishlist/:mobileId`
Add a mobile to wishlist.

#### DELETE `/api/users/wishlist/:mobileId`
Remove from wishlist.

---

## 🛡 Security Features

- **Helmet.js** — sets secure HTTP headers
- **bcryptjs** — password hashing with cost factor 12
- **JWT** — short-lived access tokens (7d) + rotating refresh tokens (30d)
- **Rate limiting** — 100 req/15min globally, 20 req/15min on auth routes
- **express-validator** — input validation on all endpoints
- **Parameterised SQL** — zero SQL injection risk (mysql2 prepared statements)
- **CORS whitelist** — only allowed origins accepted

## ⚡ Performance Features

- **Redis cache** — filter results cached 10min, mobile detail 30min, compare 5min
- **MySQL connection pool** — 10 persistent connections
- **Indexes** — on brand, price, ram_gb, camera_mp, antutu_score, capacity_mah
- **Promise.all** — parallel queries where possible (count + data, filter options)
- **Compression** — gzip on all responses
