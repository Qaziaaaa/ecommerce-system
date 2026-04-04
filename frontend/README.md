# 🎨 NOVA | Premium Frontend Design System

---

## 📖 Overview
The **NOVA Frontend** is a luxury, mobile-first e-commerce interface built with React 18, Vite, and Tailwind CSS. It is characterized by its high-end minimalist aesthetics, advanced state management, and a robust site-wide responsive design system.

---

## 🛠️ Tech Stack

- **Framework**: React 18 (Vite-powered for speed)
- **Styling**: Tailwind CSS (Utility-first and professional)
- **State**: Zustand (Global state with persistence)
- **Icons**: Lucide React (Clean, minimalist stroke icons)
- **Networking**: Axios (Hardened client with silent refresh tokens)
- **Routing**: React Router 6 (Declarative navigation)

---

## ✨ Design Features

### 1. 🍔 Premium Navigation
Designed around a **Full-Screen Mobile Overlay** triggered by a minimalist hamburger menu on devices below 1024px.
- Backdrop-blur effects
- Smooth slide-in animations
- Integrated account and cart management

### 2. 🧾 Responsive Accordions
The footer transforms from a multi-column desktop layout to an intuitive **Accordion System** on mobile, reducing vertical scroll fatigue and focusing on thumb-reach.

### 3. 💬 Tactile Testimonial Slider
Product reviews and testimonials utilize a **Native CSS Snap-Scroll Slider** on mobile devices, providing a modern, tactile swiping experience.

---

## 🚀 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Environment Setup
Create your local environment file and configure your API endpoints:
```bash
cp .env.example .env
```

### 3. Available Scripts
```bash
npm run dev      # Start Vite development server
npm run build    # Create optimized production build
npm run preview  # Preview the production build locally
```

---

## 🛡️ Security Implementation
- **CSRF**: Automatic header injection using `XSRF-TOKEN` for state-changing requests.
- **Silent Refresh**: Seamlessly handles token expiration via Axios interceptors without interrupting the user experience.
- **Persistent State**: Encrypted local storage for non-sensitive cart and preferences.

---

<div align="center">
  <sub>Built for NOVA Premium E-Commerce</sub>
</div>
