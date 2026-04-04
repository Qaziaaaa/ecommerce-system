import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
    LayoutDashboard, 
    Package, 
    ShoppingBag, 
    Users, 
    LogOut,
    ArrowLeft
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export default function AdminLayout() {
    const { logout, user } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

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

    return (
        <div className="min-h-screen bg-[#EBE7E0] text-[#2D2926] flex">
            {/* Sidebar */}
            <aside className="w-64 border-r border-[#2D2926]/10 flex flex-col bg-[#2D2926] text-[#EBE7E0]">
                <div className="p-8">
                    <Link to="/" className="font-display text-2xl font-bold tracking-[0.15em]">NOVA</Link>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50 mt-2">Admin Panel</p>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`flex items-center gap-4 px-4 py-3 text-[10px] font-bold tracking-[0.2em] uppercase transition-all duration-300 ${
                                    isActive 
                                    ? 'bg-[#EBE7E0] text-[#2D2926]' 
                                    : 'hover:bg-[#EBE7E0]/10'
                                }`}
                            >
                                <item.icon size={18} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-[#EBE7E0]/10">
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 px-4 py-3 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-red-500/20 hover:text-red-400 transition-all duration-300"
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-20 border-b border-[#2D2926]/10 flex items-center justify-between px-12 bg-[#EBE7E0]">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="text-[#2D2926]/50 hover:text-[#2D2926] transition-colors flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase">
                            <ArrowLeft size={14} /> Back to Site
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[10px] font-bold tracking-[0.2em] uppercase">{user?.name || 'Admin User'}</p>
                            <p className="text-[8px] font-bold tracking-[0.2em] uppercase opacity-50">Administrator</p>
                        </div>
                        <div className="w-10 h-10 bg-[#2D2926] text-[#EBE7E0] flex items-center justify-center font-bold">
                            {user?.name?.charAt(0) || 'A'}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-12">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
