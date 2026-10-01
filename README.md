# 🕹️ PixelPOS – Backend API

A RESTful API built with Node.js and Express, designed to handle point-of-sale operations with inventory control, sales processing and role-based access control. Consumed by the [PixelPOS Frontend](https://github.com/EdannyDev/frontend-pos).

## 📌 Overview

PixelPOS Backend is a RESTful API designed to manage inventory, sales and user roles for a point-of-sale system.

It enforces stock consistency and role-based access control. Stock is decremented with one atomic conditional update per product (`stock >= quantity` and `$inc` in the same query), so concurrent sales cannot oversell. Accidental double submissions are handled with an `Idempotency-Key` header: retrying the same request returns the original sale instead of creating another one.

## 🏗 Architecture

The application follows a modular structure:

- **Routes** → Define API endpoints and handle request/response with business logic
- **Models** → MongoDB schemas (Mongoose)
- **Middlewares** → Authentication, role validation and input validation
- **Utils** → Transactional email sending (Resend integration)

This structure keeps responsibilities separated and makes the project easier to maintain.

## 🔐 Authentication & Security

- Password hashing using bcryptjs
- JWT-based authentication
- Secure session handling via HttpOnly cookies
- Role-based authorization middleware
- Input validation using express-validator
- Environment-based configuration using dotenv

## 👥 Role-Based Access Control (RBAC)

**Admin**
- Manage users
- Manage inventory
- View reports

**Seller**
- Register sales
- View only their own sales

Access restrictions are enforced through middleware validation.

## 📧 Email Notifications

Transactional emails (password reset) are sent via Resend. Configure `RESEND_API_KEY` and `EMAIL_FROM` to enable this feature.

## 📦 Core Modules

- Authentication System
- Inventory Management
- Sales Processing (atomic stock control, idempotent creation, cancellation with stock reversal)
- Low Stock Alerts
- Reports & Metrics (aggregation pipelines)
- Password Recovery via Email
- User Management (RBAC)

## 🛠 Tech Stack

| Category | Technologies |
|---|---|
| Runtime / Framework | Node.js, Express 5 |
| Database | MongoDB (Mongoose) |
| Auth | JWT, bcryptjs, cookie-parser |
| Validation | express-validator |
| Email | Resend |
| Configuration | dotenv |

## ⚠️ Known Limitations

- No MongoDB transactions: stock and sale writes are separate operations with compensation on failure. A process crash between them can leave stock decremented without a sale.
- `PUT /api/products/:id` sets `stock` to an absolute value and can overwrite a concurrent sale's decrement.
- Registration is open: anyone can create a seller account. The first admin is promoted manually in the database.
- No automated test suite. `scripts/concurrency.test.js` is a manual integrity check against a running instance (development database only).
- Sales list is capped at 500 with no server-side pagination.
- Money is stored as floating-point numbers rounded to 2 decimals.
- A password change does not invalidate existing sessions (role and account existence are checked on every request).
- No payment processing or cash-register closing.

## ⚙️ Getting Started

### Prerequisites

- Node.js 18+
- A running MongoDB instance

### Installation

```bash
git clone https://github.com/EdannyDev/backend-pos.git
cd backend-pos
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your own values:

```bash
cp .env.example .env
```

| Variable | Description | Example |
|---|---|---|
| PORT | Port the server listens on | 5000 |
| NODE_ENV | Environment mode | development |
| FRONTEND_URL | Frontend origin (used for CORS & password reset links) | http://localhost:3000 |
| MONGO_URI | MongoDB connection string | mongodb://localhost:27017/posDB |
| JWT_SECRET | Secret key used to sign JWT tokens | your_jwt_secret_key |
| RESEND_API_KEY | API key for the Resend email service | your_resend_api_key |
| EMAIL_FROM | Verified sender address used for outgoing emails | onboarding@resend.dev |

### Running the Server

```bash
node server.js
```

The API will be available at `http://localhost:5000`.

## 📜 Available Scripts

| Script | Description |
|---|---|
| `npm start` | Starts the server |
| `npm run test:concurrency` | Runs the sales integrity check (needs `ADMIN_EMAIL` and `ADMIN_PASSWORD`, optional `API_URL`) |

---

Frontend: [frontend-pos](https://github.com/EdannyDev/frontend-pos) · Author: [@EdannyDev](https://github.com/EdannyDev)