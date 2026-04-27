# NOVA Backend

Express + MongoDB REST API for the NOVA e-commerce platform.

## Stack

- **Node.js** + **Express** — HTTP server
- **MongoDB** + **Mongoose** — database and ODM
- **JWT** — stateless auth with HttpOnly cookies
- **Stripe** — payment processing
- **Cloudinary** — image hosting
- **EmailJS** — OTP delivery
- **Winston** — structured logging

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Scripts

```bash
npm run dev    # Development with nodemon
npm start      # Production
npm run test   # Vitest test suite
```

## Key Middleware

| Middleware | Purpose |
|-----------|---------|
| `auth.middleware` | JWT verification |
| `csrf.middleware` | CSRF token validation |
| `cache.middleware` | In-memory API response caching |
| `rateLimiter` | Per-IP and per-user rate limiting |
| `performance.middleware` | Response time tracking |
| `resilience.middleware` | Error rate monitoring + graceful degradation |

## Environment Variables

See `.env.example` for all required variables.
