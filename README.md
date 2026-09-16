# 🕹️ PixelPOS – Backend API

A RESTful API built with Node.js and Express, designed to handle point-of-sale operations with inventory control, sales processing and role-based access control. Consumed by the [PixelPOS Frontend](https://github.com/EdannyDev/pos-app).

## 📌 Overview

PixelPOS Backend is a RESTful API designed to manage inventory, sales and user roles for a point-of-sale system.

It enforces stock consistency, duplicate-sale prevention and secure role-based access control. One engineering decision worth calling out: before creating a sale, the system checks if the same seller submitted an identical sale (same products and quantities) within a 5-minute window, to catch accidental duplicate submissions without blocking legitimate fast consecutive sales.

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
- Limited system access

Access restrictions are enforced through middleware validation.

## 📧 Email Notifications

Transactional emails (password reset) are sent via Resend. Configure `RESEND_API_KEY` and `EMAIL_FROM` to enable this feature.

## 📦 Core Modules

- Authentication System
- Inventory Management
- Sales Processing (with stock validation & duplicate-sale prevention)
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

---

Frontend: [pos-app](https://github.com/EdannyDev/frontend-pos) · Author: [@EdannyDev](https://github.com/EdannyDev)