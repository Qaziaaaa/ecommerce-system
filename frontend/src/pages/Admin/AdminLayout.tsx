import React, { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    ShoppingBag,
    Users,
    LogOut,
    ArrowLeft,
    Menu,
    X,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export default function AdminLayout() {
    const { logout, user } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
        { name: 'Products', icon: Package, path: '/admin/products' },
        { name: 'Orders', icon: ShoppingBag, path: '/admin/orders' },
        { name: 'Users', icon: Users, path: '/admin/users' },
    ];

    const SidebarContent = () => (
        <>
            <div className="p-6 border-b border-white/10">
                <Link to="/" className="font-display text-xl font-bold tracking-[0.15em]">NOVA</Link>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50 mt-1">Admin Panel</p>
                {user && (
                    <p className="text-xs opacity-60 mt-2 truncate">{user.email}</p>
                )}
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.name}
                            to={item.path}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 px-4 py-3 text-[11px] font-bold tracking-[0.15em] uppercase transition-all duration-200 rounded-sm ${
                                isActive
                                    ? 'bg-[#EBE7E0] text-[#2D2926]'
                                    : 'hover:bg-white/10 text-[#EBE7E0]'
                            }`}
                        >
                            <item.icon size={16} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-white/10 space-y-2">
                <Link
                    to="/"
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-[11px] font-bold tracking-[0.15em] uppercase hover:bg-white/10 transition-all w-full text-[#EBE7E0]"
                >
                    <ArrowLeft size={16} />
                    Back to Store
                </Link>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 text-[11px] font-bold tracking-[0.15em] uppercase hover:bg-red-500/20 hover:text-red-300 transition-all w-full text-[#EBE7E0]/70"
                >
                    <LogOut size={16} />
                    Sign Out
                </button>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-[#F5F3F0] text-[#2D2926] flex">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar — fixed on desktop, drawer on mobile */}
            <aside
                className={`fixed top-0 left-0 h-full w-64 bg-[#2D2926] text-[#EBE7E0] flex flex-col z-50 transition-transform duration-300 ease-in-out
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}
            >
                {/* Mobile close button */}
                <button
                    onClick={() => setSidebarOpen(false)}
                    className="absolute top-4 right-4 p-1 lg:hidden text-[#EBE7E0]/60 hover:text-[#EBE7E0]"
                >
                    <X size={20} />
                </button>
                <SidebarContent />
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
                {/* Top bar */}
                <header className="bg-white border-b border-[#2D2926]/10 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        {/* Mobile hamburger */}
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 hover:bg-[#2D2926]/5 transition-colors"
                        >
                            <Menu size={20} />
                        </button>
                        <div>
                            <h2 className="text-sm font-bold tracking-wide capitalize">
                                {navItems.find(n => n.path === location.pathname)?.name || 'Admin'}
                            </h2>
                            <p className="text-[10px] opacity-40 uppercase tracking-widest hidden sm:block">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold opacity-60 hidden sm:block">{user?.name}</span>
                        <div className="w-8 h-8 bg-[#2D2926] text-[#EBE7E0] flex items-center justify-center text-xs font-bold">
                            {user?.name?.[0]?.toUpperCase() || 'A'}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
