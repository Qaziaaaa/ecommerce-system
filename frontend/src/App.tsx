import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuthStore } from './store/useAuthStore';
import { usePerformanceMonitoring, useNavigationPerformance } from './hooks/usePerformanceMonitoring';
import axiosInstance from './api/axios';

// Lazy load components for code splitting
const Home = React.lazy(() => import('./pages/Home'));
const Shop = React.lazy(() => import('./pages/Shop'));
const ProductDetail = React.lazy(() => import('./pages/ProductDetail'));
const Checkout = React.lazy(() => import('./pages/Checkout'));
const About = React.lazy(() => import('./pages/About'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./pages/TermsOfService'));
const Contact = React.lazy(() => import('./pages/Contact'));
const Login = React.lazy(() => import('./pages/Login'));
const Signup = React.lazy(() => import('./pages/Signup'));
const UserOrders = React.lazy(() => import('./pages/UserOrders'));
const Profile = React.lazy(() => import('./pages/Profile'));

// Admin components - separate chunk
const AdminLayout = React.lazy(() => import('./pages/Admin/AdminLayout'));
const AdminDashboard = React.lazy(() => import('./pages/Admin/Dashboard'));
const AdminProducts = React.lazy(() => import('./pages/Admin/Products'));
const AdminOrders = React.lazy(() => import('./pages/Admin/Orders'));
const AdminUsers = React.lazy(() => import('./pages/Admin/Users'));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1, // Only retry once to avoid long loading states
            refetchOnWindowFocus: false, // Prevent unexpected refetches
            staleTime: 5 * 60 * 1000, // 5 minutes cache by default
            gcTime: 10 * 60 * 1000, // Keep unused data in cache for 10 minutes
            refetchOnReconnect: true, // Refetch when network reconnects
        },
        mutations: {
            retry: 0, // Don't retry mutations automatically
        },
    },
});

// Performance monitoring component
const PerformanceTracker = () => {
  const location = useLocation();
  const { startNavigation, endNavigation } = useNavigationPerformance();
  
  useEffect(() => {
    // Track navigation start
    startNavigation(location.pathname);
    
    // Track navigation end after a short delay to allow for rendering
    const timer = setTimeout(() => {
      endNavigation(location.pathname);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [location.pathname, startNavigation, endNavigation]);
  
  return null;
};

// Protected Route for Admin
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, isAuthenticated } = useAuthStore();
    if (!isAuthenticated || user?.role !== 'admin') {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

export default function App() {
  // Initialize performance monitoring
  usePerformanceMonitoring();
  
  // Initialize bundle monitoring in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      import('./services/bundleMonitoring').then(({ bundleMonitoringService }) => {
        bundleMonitoringService.startMonitoring({
          enabled: true,
          checkInterval: 30000, // 30 seconds in development
          sizeIncreaseThreshold: 5, // 5% threshold in development
          alertCallback: (alert) => {
            console.log('Bundle Alert:', alert);
          },
        });
      });
    }
  }, []);
  
  // Fetch CSRF token once on app startup so all POST requests have the cookie
  useEffect(() => {
    axiosInstance.get('/csrf-token').catch(() => {
      // Silent fail — CSRF token fetch is best-effort on init
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
        <Router>
            <ErrorBoundary scope="App" maxRetries={3}>
            <PerformanceTracker />
            <ScrollToTop />
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Layout />}>
                    <Route index element={
                        <Suspense fallback={<LoadingSpinner message="Loading home page..." />}>
                            <Home />
                        </Suspense>
                    } />
                    <Route path="shop" element={
                        <Suspense fallback={<LoadingSpinner message="Loading shop..." />}>
                            <Shop />
                        </Suspense>
                    } />
                    <Route path="product/:id" element={
                        <Suspense fallback={<LoadingSpinner message="Loading product details..." />}>
                            <ProductDetail />
                        </Suspense>
                    } />
                    <Route path="checkout" element={
                        <Suspense fallback={<LoadingSpinner message="Loading checkout..." />}>
                            <Checkout />
                        </Suspense>
                    } />
                    <Route path="about" element={
                        <Suspense fallback={<LoadingSpinner message="Loading about page..." />}>
                            <About />
                        </Suspense>
                    } />
                    <Route path="contact" element={
                        <Suspense fallback={<LoadingSpinner message="Loading contact page..." />}>
                            <Contact />
                        </Suspense>
                    } />
                    <Route path="privacy" element={
                        <Suspense fallback={<LoadingSpinner message="Loading privacy policy..." />}>
                            <PrivacyPolicy />
                        </Suspense>
                    } />
                    <Route path="terms" element={
                        <Suspense fallback={<LoadingSpinner message="Loading terms of service..." />}>
                            <TermsOfService />
                        </Suspense>
                    } />
                    <Route path="login" element={
                        <Suspense fallback={<LoadingSpinner message="Loading login..." />}>
                            <Login />
                        </Suspense>
                    } />
                    <Route path="signup" element={
                        <Suspense fallback={<LoadingSpinner message="Loading signup..." />}>
                            <Signup />
                        </Suspense>
                    } />
                    <Route path="orders" element={
                        <Suspense fallback={<LoadingSpinner message="Loading orders..." />}>
                            <UserOrders />
                        </Suspense>
                    } />
                    <Route path="profile" element={
                        <Suspense fallback={<LoadingSpinner message="Loading profile..." />}>
                            <Profile />
                        </Suspense>
                    } />
                </Route>

                {/* Admin Routes */}
                <Route path="/admin" element={
                    <AdminRoute>
                        <Suspense fallback={<LoadingSpinner message="Loading admin panel..." />}>
                            <AdminLayout />
                        </Suspense>
                    </AdminRoute>
                }>
                    <Route index element={
                        <Suspense fallback={<LoadingSpinner message="Loading dashboard..." />}>
                            <AdminDashboard />
                        </Suspense>
                    } />
                    <Route path="products" element={
                        <Suspense fallback={<LoadingSpinner message="Loading products..." />}>
                            <AdminProducts />
                        </Suspense>
                    } />
                    <Route path="orders" element={
                        <Suspense fallback={<LoadingSpinner message="Loading orders..." />}>
                            <AdminOrders />
                        </Suspense>
                    } />
                    <Route path="users" element={
                        <Suspense fallback={<LoadingSpinner message="Loading users..." />}>
                            <AdminUsers />
                        </Suspense>
                    } />
                </Route>
            </Routes>
            <Toaster position="bottom-right" />
            </ErrorBoundary>
        </Router>
    </QueryClientProvider>
  );
}
