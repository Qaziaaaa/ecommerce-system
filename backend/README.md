# 🛠️ NOVA | Backend Security & API

---

## 📖 Overview
The **NOVA Backend** provides a robust, stateless API for the e-commerce platform. It leverages a modern JWT + Refresh Token architecture and incorporates industry-standard security practices (CSRF, Rate Limiting, Zod) to ensure safe, high-performance data handling.

---

## 🧩 Architecture

- **Server**: Express.js
- **Database**: MongoDB with Cloud Atlas
- **Auth**: JWT (Stateless) + HttpOnly Cookies
- **Validation**: Zod (Input enforcement)
- **Email**: EmailJS Integrated
- **Payments**: Stripe (Secure Checkout)
- **Media**: Cloudinary (Image hosting)

---

## 🔒 Security Hardening

### 1. CSRF Protection
Implemented a custom **Double-Submit Cookie** pattern on all non-GET routes to prevent unauthorized state manipulation.
- Header Name: `X-XSRF-TOKEN`
- Cookie Name: `XSRF-TOKEN`

### 2. JWT Strategy
- **Access Tokens**: Short-lived (15m), sent via standardized handlers.
- **Refresh Tokens**: Long-lived (7d), stored in `HttpOnly` / `Secure` cookies.
- **Refresh Flow**: Seamless automatic silent refresh handled by the client.

### 3. Rate Limiting
Global rate limits are applied per IP to protect the platform against DDoS and brute-force attacks on sensitive endpoints (`/auth/login`, `/auth/register`).

---

## 🚀 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Environment Setup
Copy the example environment file and fill in your developer credentials:
```bash
cp .env.example .env
```

### 3. Available Scripts
```bash
npm run dev      # Start development server (nodemon)
npm start        # Start production server
npm run seed     # Populate database with dummy data
```

---

## 📦 API Routes

| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth` | - | All | User-facing auth, login, and registration. |
| `/api/v1/products` | GET | All | Product browsing and search. |
| `/api/v1/orders` | POST | User | Secure Stripe checkout and order fulfillment. |
| `/api/v1/admin`| - | Admin | Global store management and product CRUD. |
| `/api/v1/user` | - | User | Profile and order history management. |

---

<div align="center">
  <sub>Built for NOVA Premium E-Commerce</sub>
</div>
