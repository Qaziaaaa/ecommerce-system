import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axios';
import { User, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import SEOMeta from '../../components/SEOMeta';

export default function AdminOrders() {
    const queryClient = useQueryClient();

    const { data: orders = [], isLoading } = useQuery({
        queryKey: ['admin-orders'],
        queryFn: async () => {
            const { data } = await axiosInstance.get('/orders');
            return data.data.orders;
        },
        staleTime: 0,
        refetchOnWindowFocus: true,
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ orderId, newStatus }: { orderId: string; newStatus: string }) => {
            const { data } = await axiosInstance.patch(`/orders/${orderId}/status`, { orderStatus: newStatus });
            return data;
        },
        onSuccess: () => {
            toast.success('Order status updated');
            queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update order status');
        },
    });

    const statusConfig: Record<string, { label: string; classes: string }> = {
        pending:    { label: 'Pending',    classes: 'bg-gray-100 text-gray-700 border-gray-200' },
        processing: { label: 'Processing', classes: 'bg-amber-100 text-amber-700 border-amber-200' },
        shipped:    { label: 'Shipped',    classes: 'bg-blue-100 text-blue-700 border-blue-200' },
        delivered:  { label: 'Delivered',  classes: 'bg-green-100 text-green-700 border-green-200' },
        cancelled:  { label: 'Cancelled',  classes: 'bg-red-100 text-red-700 border-red-200' },
    };

    const paymentConfig: Record<string, string> = {
        paid:    'bg-green-50 text-green-700 border-green-200',
        pending: 'bg-amber-50 text-amber-700 border-amber-200',
        failed:  'bg-red-50 text-red-700 border-red-200',
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="animate-spin text-[#2D2926]" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <SEOMeta title="Manage Orders" />
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-wide">Orders</h1>
                <p className="text-sm text-[#2D2926]/50 mt-1">
                    {orders.length} total order{orders.length !== 1 ? 's' : ''}
                </p>
            </div>

            {orders.length === 0 ? (
                <div className="bg-white border border-[#2D2926]/10 p-12 text-center">
                    <p className="text-sm opacity-50">No orders yet.</p>
                </div>
            ) : (
                <>
                    {/* Desktop table */}
                    <div className="hidden lg:block bg-white border border-[#2D2926]/10 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[800px]">
                                <thead>
                                    <tr className="border-b border-[#2D2926]/10 bg-[#2D2926]/5">
                                        <th className="px-6 py-4 text-[10px] font-bold tracking-[0.2em] uppercase">Order</th>
                                        <th className="px-6 py-4 text-[10px] font-bold tracking-[0.2em] uppercase">Customer</th>
                                        <th className="px-6 py-4 text-[10px] font-bold tracking-[0.2em] uppercase">Payment</th>
                                        <th className="px-6 py-4 text-[10px] font-bold tracking-[0.2em] uppercase">Total</th>
                                        <th className="px-6 py-4 text-[10px] font-bold tracking-[0.2em] uppercase">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-bold tracking-[0.2em] uppercase">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#2D2926]/10">
                                    {(Array.isArray(orders) ? orders : []).map((order: any) => (
                                        <tr key={order._id} className="hover:bg-[#2D2926]/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-mono font-bold opacity-40">
                                                    #{order._id.slice(-8).toUpperCase()}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-[#2D2926]/10 flex items-center justify-center shrink-0">
                                                        <User size={14} className="opacity-50" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold truncate max-w-[140px]">{order.user?.name || 'Guest'}</p>
                                                        <p className="text-[10px] opacity-40 truncate max-w-[140px]">{order.user?.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-bold tracking-wide uppercase px-2 py-1 border ${paymentConfig[order.paymentStatus] || paymentConfig.pending}`}>
                                                    {order.paymentStatus || 'pending'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold">
                                                ${order.totalAmount?.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={order.orderStatus}
                                                    onChange={(e) => updateStatusMutation.mutate({ orderId: order._id, newStatus: e.target.value })}
                                                    disabled={updateStatusMutation.isPending}
                                                    className={`px-3 py-1.5 text-[10px] font-bold tracking-wide uppercase border cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#2D2926] appearance-none min-w-[120px] ${statusConfig[order.orderStatus]?.classes || statusConfig.pending.classes}`}
                                                >
                                                    {Object.entries(statusConfig).map(([val, cfg]) => (
                                                        <option key={val} value={val}>{cfg.label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 text-xs opacity-50">
                                                {new Date(order.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile cards */}
                    <div className="lg:hidden space-y-3">
                        {(Array.isArray(orders) ? orders : []).map((order: any) => (
                            <div key={order._id} className="bg-white border border-[#2D2926]/10 p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-xs font-mono font-bold opacity-40">#{order._id.slice(-8).toUpperCase()}</p>
                                        <p className="text-sm font-bold mt-0.5">{order.user?.name || 'Guest'}</p>
                                        <p className="text-xs opacity-50 truncate max-w-[200px]">{order.user?.email}</p>
                                    </div>
                                    <p className="text-base font-bold shrink-0">${order.totalAmount?.toFixed(2)}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-[10px] font-bold tracking-wide uppercase px-2 py-1 border ${paymentConfig[order.paymentStatus] || paymentConfig.pending}`}>
                                        {order.paymentStatus || 'pending'}
                                    </span>
                                    <span className="text-xs opacity-40">{new Date(order.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold tracking-widest uppercase opacity-50 block mb-1">Status</label>
                                    <select
                                        value={order.orderStatus}
                                        onChange={(e) => updateStatusMutation.mutate({ orderId: order._id, newStatus: e.target.value })}
                                        disabled={updateStatusMutation.isPending}
                                        className={`w-full px-3 py-2 text-[11px] font-bold tracking-wide uppercase border cursor-pointer focus:outline-none appearance-none ${statusConfig[order.orderStatus]?.classes || statusConfig.pending.classes}`}
                                    >
                                        {Object.entries(statusConfig).map(([val, cfg]) => (
                                            <option key={val} value={val}>{cfg.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
