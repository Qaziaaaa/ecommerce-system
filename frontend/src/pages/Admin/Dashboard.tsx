import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../api/axios';
import SEOMeta from '../../components/SEOMeta';
import { 
    TrendingUp, 
    ShoppingBag, 
    Users as UsersIcon, 
    Package as PackageIcon,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    Box,
    Truck
} from 'lucide-react';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar
} from 'recharts';

const COLORS = ['#2D2926', '#4A4643', '#706C69', '#96928F', '#BCB8B5', '#E1DDD9'];

export default function Dashboard() {
    // 1. Core Stats
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: async () => {
            const { data } = await axiosInstance.get('/admin/dashboard');
            return data.data;
        }
    });

    // 2. Monthly Sales
    const { data: sales, isLoading: salesLoading } = useQuery({
        queryKey: ['admin-sales'],
        queryFn: async () => {
            const { data } = await axiosInstance.get('/admin/sales/monthly');
            return data.data;
        }
    });

    // 3. Category Distribution
    const { data: categories, isLoading: categoriesLoading } = useQuery({
        queryKey: ['admin-categories-analytics'],
        queryFn: async () => {
            const { data } = await axiosInstance.get('/admin/analytics/category');
            return data.data;
        }
    });

    // 4. Logistics Breakdown
    const { data: logistics, isLoading: logisticsLoading } = useQuery({
        queryKey: ['admin-logistics'],
        queryFn: async () => {
            const { data } = await axiosInstance.get('/admin/analytics/logistics');
            return data.data;
        }
    });

    // 5. High Stock/Top Performance Previews
    const { data: topProducts } = useQuery({
        queryKey: ['admin-top-products'],
        queryFn: async () => {
            const { data } = await axiosInstance.get('/admin/products/top');
            return data.data;
        }
    });

    const statCards = [
        { label: 'Total Revenue', value: `$${stats?.totalRevenue?.toLocaleString() || 0}`, icon: TrendingUp, change: '+12.5%', isUp: true },
        { label: 'Total Orders', value: stats?.totalOrders || 0, icon: ShoppingBag, change: '+5.2%', isUp: true },
        { label: 'Total Customers', value: stats?.totalUsers || 0, icon: UsersIcon, change: '+8.1%', isUp: true },
        { label: 'Product Inventory', value: stats?.totalProducts || 0, icon: PackageIcon, change: '-2 items', isUp: false },
    ];

    if (statsLoading || salesLoading || categoriesLoading || logisticsLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-6">
                <Loader2 className="animate-spin text-[#2D2926]" size={40} strokeWidth={1} />
                <p className="text-[10px] font-bold tracking-[0.4em] uppercase opacity-30">Generating Insights...</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-20">
            <SEOMeta title="Admin Dashboard" />
            <div>
                <h1 className="font-display text-5xl tracking-wide mb-2">BI DASHBOARD</h1>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50">Advanced Business Intelligence & Metrics</p>
            </div>

            {/* --- Stats Grid --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((card, i) => (
                    <div key={i} className="bg-white border border-[#2D2926]/10 p-8 hover:border-[#2D2926] transition-all duration-500 group relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-0 bg-[#2D2926] group-hover:h-full transition-all duration-500"></div>
                        <div className="flex justify-between items-start mb-6">
                            <card.icon size={20} className="text-[#2D2926] opacity-40 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
                            <div className={`flex items-center gap-1 text-[8px] font-bold tracking-widest ${card.isUp ? 'text-green-600' : 'text-red-600'}`}>
                                {card.isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                {card.change}
                            </div>
                        </div>
                        <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-40 mb-1">{card.label}</h3>
                        <p className="font-display text-5xl leading-none">{card.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* --- Main Revenue Area Chart --- */}
                <div className="lg:col-span-2 bg-white border border-[#2D2926]/10 p-10">
                    <div className="flex justify-between items-end mb-12 pb-6 border-b border-[#2D2926]/5">
                        <div>
                            <h2 className="font-display text-3xl tracking-wide mb-1 uppercase">Revenue Growth</h2>
                            <p className="text-[8px] font-bold tracking-[0.3em] uppercase opacity-40">Monthly Performance Analytics</p>
                        </div>
                    </div>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sales}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2D2926" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#2D2926" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#2D292608" />
                                <XAxis 
                                    dataKey="month" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#2D2926', fontSize: 10, fontWeight: 700 }}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#2D2926', fontSize: 10, fontWeight: 700 }}
                                    tickFormatter={(val) => `$${val > 1000 ? (val/1000).toFixed(1) + 'k' : val}`}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#2D2926', 
                                        border: 'none', 
                                        color: '#EBE7E0',
                                        padding: '16px'
                                    }}
                                    itemStyle={{ color: '#EBE7E0', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.15em' }}
                                    labelStyle={{ display: 'none' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="revenue" 
                                    stroke="#2D2926" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorRev)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* --- Category Distribution (Pie) --- */}
                <div className="bg-[#2D2926] text-[#EBE7E0] p-10 flex flex-col">
                    <div className="mb-10">
                        <h2 className="font-display text-2xl tracking-wide mb-1">MARKET SHARE</h2>
                        <p className="text-[8px] font-bold tracking-[0.3em] uppercase opacity-30">Sales by Category</p>
                    </div>
                    <div className="h-[300px] w-full relative mb-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categories}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={8}
                                    dataKey="value"
                                >
                                    {(Array.isArray(categories) ? categories : []).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#2D2926" strokeWidth={2} opacity={1 - (index * 0.15)} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#EBE7E0', border: 'none', color: '#2D2926', fontSize: '10px' }}
                                    itemStyle={{ color: '#2D2926', fontWeight: 800 }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <p className="text-[10px] font-bold tracking-widest opacity-20 uppercase">Nova AI</p>
                        </div>
                    </div>
                    <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                        {(Array.isArray(categories) ? categories : []).map((item: any, index: number) => (
                            <div key={index} className="flex justify-between items-center group">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    <span className="text-[10px] font-bold tracking-widest uppercase opacity-60 group-hover:opacity-100 transition-opacity">{item.name}</span>
                                </div>
                                <span className="text-[10px] font-bold tracking-wider">${item.value.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- Logistics & Performance --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                
                {/* Order Status Distribution */}
                <div className="bg-white border border-[#2D2926]/10 p-8">
                    <div className="flex items-center gap-3 mb-8">
                         <div className="p-2 bg-[#F3F4ED] text-[#2D2926]">
                            <Truck size={18} strokeWidth={1.5} />
                         </div>
                         <div>
                            <h3 className="text-[10px] font-bold tracking-[0.3em] uppercase leading-tight">Order Status</h3>
                            <p className="text-[8px] opacity-40 uppercase font-bold tracking-widest">Global Logistics</p>
                         </div>
                    </div>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={logistics}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2D292605" />
                                <XAxis dataKey="name" hide />
                                <Tooltip contentStyle={{ fontSize: '10px', textTransform: 'uppercase', border: 'none', backgroundColor: '#2D2926', color: '#fff' }} />
                                <Bar dataKey="value" fill="#2D2926" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-4 mt-8">
                        {(Array.isArray(logistics) ? logistics : []).map((item: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                <span className="opacity-40">{item.name}</span>
                                <span className="bg-[#2D2926]/5 px-3 py-1">{item.value} Orders</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Performing Items */}
                <div className="bg-white border border-[#2D2926]/10 p-8 lg:col-span-2">
                    <div className="flex items-center gap-3 mb-8 pb-4 border-b border-[#2D2926]/5">
                         <div className="p-2 bg-[#F3F4ED] text-[#2D2926]">
                            <Box size={18} strokeWidth={1.5} />
                         </div>
                         <div>
                            <h3 className="text-[10px] font-bold tracking-[0.3em] uppercase leading-tight">Trending Items</h3>
                            <p className="text-[8px] opacity-40 uppercase font-bold tracking-widest">High Volume Products</p>
                         </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
                        {(Array.isArray(topProducts) ? topProducts : []).map((p: any, i: number) => (
                            <div key={i} className="flex justify-between items-center border-b border-[#2D2926]/10 pb-4 group hover:border-[#2D2926] transition-colors">
                                <span className="text-sm font-display tracking-tight truncate pr-4 opacity-70 group-hover:opacity-100">{p.name}</span>
                                <span className="text-[10px] font-bold tracking-widest uppercase bg-[#2D2926] text-[#EBE7E0] px-3 py-1 flex-shrink-0">{p.sold} SOLD</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
