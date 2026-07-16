# NOVA — Premium E-Commerce Platform

A full-stack e-commerce application built with React, Node.js, MongoDB, and Stripe. Features a complete shopping experience with product catalog, cart, checkout, order tracking, admin panel, and OTP-based passwordless authentication.

**Live Demo:** [nova-ecomm.vercel.app](https://nova-ecomm.vercel.app)

---

## Tech Stack

### Frontend
- **React 19** + **Vite 6** + **TypeScript**
- **Tailwind CSS** — utility-first styling
- **Zustand** — global state management
- **TanStack Query** — server state, caching, and real-time polling
- **Axios** — HTTP client with CSRF and retry interceptors
- **Stripe.js** — payment processing
- **Recharts** — admin analytics charts

### Backend
- **Node.js** + **Express**
- **MongoDB** + **Mongoose**
- **JWT** — stateless authentication with HttpOnly cookies
- **Stripe** — payment intents and webhook handling
- **Cloudinary** — image upload and CDN
- **EmailJS** — OTP email delivery
- **Winston** — structured logging

### Infrastructure
- **Vercel** — frontend deployment
- **Render** — backend deployment
- **MongoDB Atlas** — managed database

---

## Features

### Customer
- Passwordless OTP authentication (no passwords stored)
- Product catalog with search, filtering, sorting, and pagination
- Product detail pages with image gallery and reviews
- Shopping cart with quantity management
- Checkout with Stripe credit card or Cash on Delivery
- Real-time stock validation — prevents overselling
- Order history with live status tracking (polls every 30s)
- User profile with saved shipping addresses

### Admin Panel
- Dashboard with revenue, order, and product analytics
- Product management — create, edit, delete with image upload
- Order management — update status in real-time
- User management — view accounts and manage roles
- Fully responsive — works on mobile and desktop

### Performance & Reliability
- In-memory API response caching with TTL and cache invalidation
- Gzip compression on all API responses
- Optimistic UI updates — deletes and edits reflect instantly
- Exponential backoff retry on failed API calls
- Circuit breakers for Stripe, Cloudinary, and email services
- Service worker for static asset caching
- Lazy-loaded routes and images with skeleton placeholders
- Core Web Vitals monitoring

---

## Project Structure

```
├── frontend/          # React + Vite application
│   ├── src/
│   │   ├── pages/     # Route components
│   │   ├── components/# Reusable UI components
│   │   ├── store/     # Zustand state stores
│   │   ├── api/       # Axios instance and interceptors
│   │   └── utils/     # Performance monitoring, image optimization
│   └── public/        # Static assets and service worker
│
└── backend/           # Express API server
    ├── controllers/   # Route handlers
    ├── services/      # Business logic
    ├── models/        # Mongoose schemas
    ├── middlewares/   # Auth, CSRF, caching, rate limiting
    ├── routes/        # API route definitions
    └── utils/         # Logger, JWT, circuit breaker, job queue
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Stripe account
- Cloudinary account
- EmailJS account

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in your credentials in .env
npm run dev
```

**Required environment variables:**
```
PORT=5001
MONGO_URI=mongodb+srv://...
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRES_IN=90d
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
STRIPE_SECRET_KEY=sk_test_...
EMAILJS_SERVICE_ID=
EMAILJS_TEMPLATE_ID=
EMAILJS_PUBLIC_KEY=
EMAILJS_PRIVATE_KEY=
CORS_ORIGIN=http://localhost:5173
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Fill in your credentials in .env
npm run dev
```

**Required environment variables:**
```
VITE_API_URL=http://localhost:5001/api/v1
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

---

## API Overview

| Route | Access | Description |
|-------|--------|-------------|
| `POST /api/v1/auth/send-otp` | Public | Send OTP to email |
| `POST /api/v1/auth/verify-otp` | Public | Verify OTP and issue JWT |
| `GET /api/v1/products` | Public | List products with filters |
| `POST /api/v1/products` | Admin | Create product |
| `PATCH /api/v1/products/:id` | Admin | Update product |
| `DELETE /api/v1/products/:id` | Admin | Delete product |
| `POST /api/v1/orders/create-payment-intent` | Auth | Create Stripe payment intent |
| `POST /api/v1/orders/checkout` | Auth | Place order |
| `GET /api/v1/orders/my-orders` | Auth | Get user's orders |
| `GET /api/v1/orders` | Admin | Get all orders |
| `PATCH /api/v1/orders/:id/status` | Admin | Update order status |
| `GET /api/v1/admin/dashboard` | Admin | Analytics data |
| `GET /api/v1/performance/health` | Public | Health check |

---

## Security

- **CSRF protection** — tokens sent in response body, stored in localStorage, sent via `X-XSRF-TOKEN` header (cross-domain compatible)
- **Rate limiting** — per-IP global limits, per-user limits on orders and payments
- **JWT** — short-lived access tokens in HttpOnly cookies, automatic silent refresh
- **Input validation** — Zod schemas on all mutation endpoints
- **Helmet** — security headers on all responses
- **Atomic stock updates** — MongoDB `bulkWrite` with `$gte` filter prevents race conditions

---

## Scripts

### Backend
```bash
npm run dev      # Development server with nodemon
npm start        # Production server
npm run test     # Run test suite (Vitest)
```

### Frontend
```bash
npm run dev      # Vite development server
npm run build    # Production build
npm run preview  # Preview production build
npm run test     # Run tests (Vitest)
npm run lint     # TypeScript type check
```

---

## License

MIT
