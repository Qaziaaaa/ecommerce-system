# NOVA Frontend

React + Vite + TypeScript storefront for the NOVA e-commerce platform.

## Stack

- **React 19** + **Vite 6** + **TypeScript**
- **Tailwind CSS** — styling
- **Zustand** — global state
- **TanStack Query** — server state and caching
- **Axios** — HTTP client with CSRF and retry interceptors
- **Stripe.js** — payment UI
- **Recharts** — admin charts

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Scripts

```bash
npm run dev      # Vite dev server
npm run build    # Production build
npm run preview  # Preview production build
npm run test     # Vitest
npm run lint     # TypeScript check
```

## Environment Variables

```
VITE_API_URL=http://localhost:5001/api/v1
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```
