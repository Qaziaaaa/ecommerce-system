import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import About from './pages/About';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Signup from './pages/Signup';
import UserOrders from './pages/UserOrders';
import Profile from './pages/Profile';
import AdminLayout from './pages/Admin/AdminLayout';
import AdminDashboard from './pages/Admin/Dashboard';
import AdminProducts from './pages/Admin/Products';
import AdminOrders from './pages/Admin/Orders';
import AdminUsers from './pages/Admin/Users';
import { useAuthStore } from './store/useAuthStore';

const queryClient = new QueryClient();

// Protected Route for Admin
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, isAuthenticated } = useAuthStore();
    if (!isAuthenticated || user?.role !== 'admin') {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
        <Router>
            <ScrollToTop />
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="shop" element={<Shop />} />
                    <Route path="product/:id" element={<ProductDetail />} />
                    <Route path="checkout" element={<Checkout />} />
                    <Route path="about" element={<About />} />
                    <Route path="contact" element={<Contact />} />
                    <Route path="privacy" element={<PrivacyPolicy />} />
                    <Route path="terms" element={<TermsOfService />} />
                    <Route path="login" element={<Login />} />
                    <Route path="signup" element={<Signup />} />
                    <Route path="orders" element={<UserOrders />} />
                    <Route path="profile" element={<Profile />} />
                </Route>

                {/* Admin Routes */}
                <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="products" element={<AdminProducts />} />
                    <Route path="orders" element={<AdminOrders />} />
                    <Route path="users" element={<AdminUsers />} />
                </Route>
            </Routes>
            <Toaster position="bottom-right" />
        </Router>
    </QueryClientProvider>
  );
}
