import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../api/axios';
import toast from 'react-hot-toast';
import { Package, Clock, Truck, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEOMeta from '../components/SEOMeta';

export default function UserOrders({ isEmbedded = false }: { isEmbedded?: boolean }) {
    const [cancelTarget, setCancelTarget] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const { data: orders = [], isLoading } = useQuery({
        queryKey: ['my-orders'],
        queryFn: async () => {
            const { data } = await axiosInstance.get('/orders/my-orders');
            return data.data.orders;
        },
        refetchInterval: 30_000,
        staleTime: 15_000,
        refetchOnWindowFocus: true,
    });

    const cancelOrderMutation = useMutation({
        mutationFn: async (orderId: string) => {
            await axiosInstance.delete(`/orders/${orderId}`);
        },
        onSuccess: () => {
            toast.success('Order cancelled. Stock has been restored.');
            queryClient.invalidateQueries({ queryKey: ['my-orders'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to cancel order');
        },
    });

    const statusSteps = ['pending', 'processing', 'shipped', 'delivered'];

    const getStatusBadge = (status: string) => {
        const map: Record<string, string> = {
            pending:    'bg-gray-100 text-gray-700 border-gray-200',
            processing: 'bg-amber-100 text-amber-700 border-amber-200',
            shipped:    'bg-blue-100 text-blue-700 border-blue-200',
            delivered:  'bg-green-100 text-green-700 border-green-200',
            cancelled:  'bg-red-100 text-red-700 border-red-200',
        };
        return map[status] || map.pending;
    };

    const getStepLabel = (step: string) => {
        const labels: Record<string, string> = {
            pending: 'Order Placed',
            processing: 'Processing',
            shipped: 'Shipped',
            delivered: 'Delivered',
        };
        return labels[step] || step;
    };

    const isStepDone = (step: string, currentStatus: string) => {
        const idx = statusSteps.indexOf(step);
        const currentIdx = statusSteps.indexOf(currentStatus);
        return idx <= currentIdx;
    };

    if (isLoading) {
        return (
            <div className={`flex flex-col items-center justify-center py-20 ${isEmbedded ? '' : 'min-h-[60vh]'}`}>
                <Loader2 size={32} className="animate-spin text-[#2D2926] mb-3" />
                <p className="text-xs font-bold tracking-widest uppercase opacity-40">Loading orders...</p>
            </div>
        );
    }

    const content = (
        <div className="space-y-4">
            {!isEmbedded && (
                <div className="mb-8">
                    <h1 className="text-2xl font-bold tracking-wide">My Orders</h1>
                    <p className="text-sm text-[#2D2926]/50 mt-1">
                        {orders.length} order{orders.length !== 1 ? 's' : ''}
                    </p>
                </div>
            )}

            {orders.length === 0 ? (
                <div className="text-center py-16 bg-white border border-[#2D2926]/10">
                    <Package size={48} strokeWidth={1} className="mx-auto mb-4 opacity-30" />
                    <h2 className="text-lg font-bold mb-2">No orders yet</h2>
                    <p className="text-sm opacity-60 mb-6 max-w-xs mx-auto">
                        You haven't placed any orders. Start shopping to see them here.
                    </p>
                    <Link
                        to="/shop"
                        className="inline-block bg-[#2D2926] text-[#EBE7E0] px-8 py-3 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926]/90 transition-colors"
                    >
                        Browse Collection
                    </Link>
                </div>
            ) : (
                orders.map((order: any) => (
                    <div key={order._id} className="bg-white border border-[#2D2926]/10 overflow-hidden">
                        {/* Order header */}
                        <div className="bg-[#2D2926]/5 border-b border-[#2D2926]/10 px-4 sm:px-6 py-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="space-y-1 min-w-0">
                                    <p className="text-[10px] font-bold tracking-widest uppercase opacity-50">Order</p>
                                    <p className="text-xs font-mono font-bold opacity-60">#{order._id.slice(-10).toUpperCase()}</p>
                                    <p className="text-xs opacity-50">{new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-lg font-bold">${order.totalAmount?.toFixed(2)}</p>
                                    <span className={`inline-block text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 border ${getStatusBadge(order.orderStatus)}`}>
                                        {order.orderStatus}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Order body */}
                        <div className="px-4 sm:px-6 py-4 space-y-6">
                            {/* Items */}
                            <div className="space-y-3">
                                {order.orderItems.map((item: any) => (
                                    <div key={item._id} className="flex gap-3 items-center">
                                        <div className="w-14 h-14 sm:w-16 sm:h-16 border border-[#2D2926]/10 bg-[#EBE7E0] shrink-0">
                                            <img
                                                src={item.product?.images?.[0] || '/placeholder.png'}
                                                alt={item.product?.name}
                                                className="w-full h-full object-cover mix-blend-multiply"
                                                referrerPolicy="no-referrer"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <Link
                                                to={`/product/${item.product?._id}`}
                                                className="text-sm font-bold hover:opacity-70 transition-opacity line-clamp-2 leading-snug"
                                            >
                                                {item.product?.name || 'Unavailable Product'}
                                            </Link>
                                            <p className="text-xs opacity-50 mt-0.5">
                                                Qty {item.quantity} · ${item.price?.toFixed(2)} each
                                            </p>
                                        </div>
                                        <p className="text-sm font-bold shrink-0">
                                            ${(item.price * item.quantity).toFixed(2)}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Status tracker — only for non-cancelled */}
                            {order.orderStatus !== 'cancelled' ? (
                                <div className="pt-4 border-t border-[#2D2926]/10">
                                    <p className="text-[10px] font-bold tracking-widest uppercase opacity-50 mb-3">Delivery Progress</p>
                                    <div className="flex items-center gap-0">
                                        {statusSteps.map((step, i) => {
                                            const done = isStepDone(step, order.orderStatus);
                                            const isLast = i === statusSteps.length - 1;
                                            return (
                                                <React.Fragment key={step}>
                                                    <div className="flex flex-col items-center gap-1 shrink-0">
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${done ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}>
                                                            {done && <CheckCircle size={12} className="text-white" strokeWidth={3} />}
                                                        </div>
                                                        <p className={`text-[9px] font-bold tracking-wide text-center leading-tight max-w-[52px] ${done ? 'text-[#2D2926]' : 'text-gray-400'}`}>
                                                            {getStepLabel(step)}
                                                        </p>
                                                    </div>
                                                    {!isLast && (
                                                        <div className={`flex-1 h-0.5 mb-4 mx-1 ${isStepDone(statusSteps[i + 1], order.orderStatus) ? 'bg-green-500' : 'bg-gray-200'}`} />
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </div>
                                    {/* Shipping address */}
                                    {order.shippingAddress?.street && (
                                        <div className="mt-3 flex items-start gap-2 text-xs opacity-60">
                                            <Truck size={12} className="mt-0.5 shrink-0" />
                                            <span>{order.shippingAddress.street}, {order.shippingAddress.city} {order.shippingAddress.zipCode}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="pt-4 border-t border-[#2D2926]/10">
                                    <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 px-3 py-2 text-sm">
                                        <XCircle size={14} />
                                        <span className="font-bold">Order Cancelled</span>
                                    </div>
                                </div>
                            )}

                            {/* Cancel button */}
                            {['pending', 'processing'].includes(order.orderStatus) && (
                                <button
                                    onClick={() => setCancelTarget(order._id)}
                                    disabled={cancelOrderMutation.isPending}
                                    className="w-full text-[10px] font-bold tracking-[0.2em] uppercase border border-red-400 text-red-500 py-2.5 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                                >
                                    {cancelOrderMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
                                </button>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    const modal = cancelTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setCancelTarget(null)}>
            <div className="bg-[#EBE7E0] p-8 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                <p className="text-sm mb-6">Cancel this order? Stock will be restored.</p>
                <div className="flex gap-4 justify-end">
                    <button onClick={() => setCancelTarget(null)} className="text-[10px] font-bold tracking-[0.2em] uppercase px-6 py-2.5 border border-[#2D2926]/20 hover:bg-[#2D2926]/5 transition-colors">Keep</button>
                    <button onClick={() => { cancelOrderMutation.mutate(cancelTarget); setCancelTarget(null); }} className="text-[10px] font-bold tracking-[0.2em] uppercase px-6 py-2.5 bg-red-500 text-white hover:bg-red-600 transition-colors">Cancel Order</button>
                </div>
            </div>
        </div>
    ) : null;

    if (isEmbedded) return <>{content}{modal}</>;

    return (
        <div className="min-h-screen bg-[#EBE7E0] py-12 px-4 sm:px-8 lg:px-12">
            <SEOMeta title="My Orders" />
            <div className="max-w-3xl mx-auto">{content}</div>
            {modal}
        </div>
    );
}
