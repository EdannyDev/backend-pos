# 🕹️ POS Gamer – Backend API

## 📌 Overview

POS Gamer Backend is a RESTful API designed for a technology retail store Point of Sale system.

It manages authentication, inventory, sales processing and reporting while enforcing role-based access control and secure session handling.

This project focuses on backend architecture, security practices and scalable API design.

## 🏗 Architecture

The application follows a layered structure:

- **Routes** → Define API endpoints + Handle request/response logic
- **Models** → MongoDB schemas using Mongoose
- **Middlewares** → Authentication & role validation

This separation ensures maintainability and scalability.

## 🔐 Authentication & Security

Security was a primary focus during development.

- Password hashing using `bcryptjs`
- JWT-based authentication
- Tokens stored in **HttpOnly cookies** to prevent XSS attacks
- Role-based authorization middleware
- Environment-based configuration using `dotenv`
- Controlled CORS setup

Session handling is implemented using secure cookie strategies instead of storing tokens in localStorage.

## 👥 Role-Based Access Control (RBAC)

The system includes two roles:

### Admin
- Manage users
- Manage inventory
- View reports and metrics
- Access full system control

### Seller
- Register sales
- View limited inventory
- Access sales module

Access restrictions are enforced through middleware validation.

## 📦 Core Modules

- Users Management
- Products & Inventory
- Sales Processing
- Reports & Metrics
- Email Notifications (Nodemailer + Google OAuth2)

## 🛠 Tech Stack

`Node.js` · `Express` · `MongoDB` · `Mongoose`

`JWT` · `bcryptjs` · `cookie-parser`

`Nodemailer` · `Google APIs`

## ⚙️ Local Setup

```bash
git clone https://github.com/EdannyDev/backend-pos.git
npm install
node server.js
```

## 🧾 Environment Variables
```bash
PORT=5000
MONGO_URI=mongodb://localhost:27017/posDB
JWT_SECRET=tu_secreto_jwt
GMAIL_CLIENT_ID=tu_client_id_google
GMAIL_CLIENT_SECRET=tu_client_secret_google
GMAIL_REFRESH_TOKEN=tu_refresh_token_google
```
