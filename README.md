🕹️ POS Gamer – Backend API

## 📌 Overview
Backend API for a Point of Sale (POS) system focused on inventory management, sales processing, and user roles.

The project simulates a real-world scenario where multiple users register sales, inventory needs to stay consistent, and basic business metrics are required.

---

## 🏗 Architecture
The project is organized in a modular way:

- **Routes** → API endpoints
- **Controllers** → Request handling and business logic
- **Models** → MongoDB schemas (Mongoose)
- **Middlewares** → Authentication, role validation and input validation

This structure keeps responsibilities separated and makes the project easier to maintain.

---

## 🔐 Authentication & Security

- JWT-based authentication
- Tokens stored in **HttpOnly cookies** (not localStorage)
- Password hashing using bcrypt
- Role-based access control (RBAC)
- Input validation using express-validator
- Environment configuration with dotenv

---

## 👥 Roles

Two roles are implemented:

- **Admin**
  - Manage users
  - Manage inventory
  - Access reports

- **Seller**
  - Register sales
  - Limited system access

Access is enforced through middleware.

---

## ⚔️ Challenges & Solutions

### Preventing sales without stock
Before creating a sale, the system validates that each product has enough available stock.

---

### Keeping inventory consistent
After a sale is created:
- Stock is reduced automatically  
- If a sale is updated or deleted, stock is restored  

This helps keep inventory accurate over time.

---

### Avoiding duplicate sales
To prevent accidental duplicates, the system checks if the same user tries to create an identical sale within a short time window (~5 minutes).

---

### Low stock alerts
After each operation, products with low stock (≤ 5 units) are detected and flagged.

---

### Reports & metrics
MongoDB aggregation pipelines are used to generate:

- Sales over time
- Sales by user
- Top-selling products
- Total revenue

---

## 🧠 Technical Decisions

- **MongoDB**
  Flexible structure for handling sales with multiple products.

- **JWT in HttpOnly cookies**
  Helps reduce XSS risks compared to storing tokens in localStorage.

- **Modular structure**
  Makes the code easier to extend and maintain.

---

## 📦 Core Features

- Authentication & authorization
- User management
- Inventory management
- Sales processing
- Reports & metrics
- Low stock alerts
- Password recovery via email

---

## 🛠 Tech Stack

Node.js · Express · MongoDB · Mongoose  
JWT · bcryptjs · cookie-parser  
Nodemailer · Google OAuth2  

---

## ⚙️ Local Setup

```bash
git clone https://github.com/EdannyDev/backend-pos.git
npm install
npm run dev