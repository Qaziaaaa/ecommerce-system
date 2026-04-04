import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axios';
import { Package, User, Clock, CheckCircle, Truck, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminOrders() {
    const queryClient = useQueryClient();

    const { data: orders = [], isLoading } = useQuery({
        queryKey: ['admin-orders'],
        queryFn: async () => {
            const { data } = await axiosInstance.get('/orders');
            return data.data.orders;
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ orderId, newStatus }: { orderId: string, newStatus: string }) => {
            const { data } = await axiosInstance.patch(`/orders/${orderId}/status`, { orderStatus: newStatus });
            return data;
        },
        onSuccess: () => {
            toast.success('Order status updated successfully');
            queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update order status');
        }
    });

    const getStatusStyle = (status: string) => {
        switch (status.toLowerCase()) {
            case 'delivered': return 'bg-green-100 text-green-700 border-green-200';
            case 'shipped': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'processing': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getPaymentStyle = (status: string) => {
        switch (status.toLowerCase()) {
            case 'paid': return 'text-green-600 bg-green-50 px-2 py-0.5 border border-green-100';
            case 'pending': return 'text-amber-600 bg-amber-50 px-2 py-0.5 border border-amber-100';
            case 'failed': return 'text-red-600 bg-red-50 px-2 py-0.5 border border-red-100';
            default: return 'text-gray-500 bg-gray-50 px-2 py-0.5 border border-gray-100';
        }
    };

    const handleStatusChange = (orderId: string, e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        updateStatusMutation.mutate({ orderId, newStatus });
    };

    return (
        <div className="space-y-12">
            <div>
                <h1 className="font-display text-4xl tracking-wide mb-2">ORDERS</h1>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50">Monitor and fulfill customer orders</p>
            </div>

            <div className="bg-white border border-[#2D2926]/10 overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-[#2D2926]/10 bg-[#2D2926]/5">
                            <th className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] uppercase">Order ID / Details</th>
                            <th className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] uppercase">Customer</th>
                            <th className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] uppercase">Payment</th>
                            <th className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] uppercase">Total</th>
                            <th className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] uppercase">Order Status</th>
                            <th className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] uppercase">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2D2926]/10">
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={5} className="px-8 py-8 h-12 bg-[#2D2926]/5"></td>
                                </tr>
                            ))
                        ) : (Array.isArray(orders) ? orders : []).map((order: any) => (
                             <tr key={order._id} className="hover:bg-[#2D2926]/5 transition-colors">
                                <td className="px-8 py-6">
                                    <p className="text-[10px] font-bold opacity-30 font-mono tracking-widest leading-relaxed">{order._id.toUpperCase()}</p>
                                    {order.stripePaymentIntentId && (
                                        <p className="text-[8px] font-bold opacity-20 uppercase tracking-[0.1em] mt-1">Stripe: {order.stripePaymentIntentId}</p>
                                    )}
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-[#EBE7E0] border border-[#2D2926]/10 flex items-center justify-center">
                                            <User size={14} className="text-[#2D2926]/50" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">{order.user?.name || 'Guest'}</p>
                                            <p className="text-[8px] font-bold opacity-30 uppercase tracking-widest">{order.user?.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <span className={`text-[9px] font-bold tracking-widest uppercase ${getPaymentStyle(order.paymentStatus || 'pending')}`}>
                                        {order.paymentStatus || 'pending'}
                                    </span>
                                </td>
                                <td className="px-8 py-6 text-sm font-bold">
                                    ${order.totalAmount?.toFixed(2)}
                                </td>
                                <td className="px-8 py-6">
                                    <div className="relative inline-block w-full">
                                        <select
                                            value={order.orderStatus}
                                            onChange={(e) => handleStatusChange(order._id, e)}
                                            disabled={updateStatusMutation.isPending}
                                            className={`w-full px-3 py-1.5 text-[10px] font-bold tracking-[0.1em] uppercase border rounded-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#2D2926] appearance-none ${getStatusStyle(order.orderStatus)}`}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="processing">Processing</option>
                                            <option value="shipped">Shipped</option>
                                            <option value="delivered">Delivered</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] uppercase opacity-40">
                                    {new Date(order.createdAt).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
