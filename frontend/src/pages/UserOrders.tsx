import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../api/axios';
import toast from 'react-hot-toast';
import { Package, Clock, Truck, CheckCircle, XCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function UserOrders({ isEmbedded = false }: { isEmbedded?: boolean }) {
    const queryClient = useQueryClient();

    const { data: orders = [], isLoading } = useQuery({
        queryKey: ['my-orders'],
        queryFn: async () => {
            const { data } = await axiosInstance.get('/orders/my-orders');
            return data.data.orders;
        }
    });

    const cancelOrderMutation = useMutation({
        mutationFn: async (orderId: string) => {
            await axiosInstance.delete(`/orders/${orderId}`);
        },
        onSuccess: () => {
            toast.success('Order cancelled safely. Stock has been returned.');
            queryClient.invalidateQueries({ queryKey: ['my-orders'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to cancel order');
        }
    });

    const getStatusInfo = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending':
                return { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100', border: 'border-gray-200', text: 'Order Placed' };
            case 'processing':
                return { icon: Package, color: 'text-amber-500', bg: 'bg-amber-100', border: 'border-amber-200', text: 'Processing' };
            case 'shipped':
                return { icon: Truck, color: 'text-blue-500', bg: 'bg-blue-100', border: 'border-blue-200', text: 'On the Way' };
            case 'delivered':
                return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100', border: 'border-green-200', text: 'Delivered' };
            case 'cancelled':
                return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100', border: 'border-red-200', text: 'Cancelled' };
            default:
                return { icon: AlertCircle, color: 'text-gray-500', bg: 'bg-gray-100', border: 'border-gray-200', text: 'Unknown' };
        }
    };

    if (isLoading) {
        return (
            <div className={`min-h-[70vh] flex flex-col items-center justify-center ${isEmbedded ? 'bg-white' : 'bg-[#EBE7E0]'}`}>
                <Loader2 size={48} className="animate-spin text-[#2D2926] mb-4" />
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50">Loading your orders...</p>
            </div>
        );
    }

    const content = (
        <>
            {!isEmbedded && (
                <div className="flex justify-between items-end mb-16 border-b border-[#2D2926]/20 pb-6">
                    <div>
                        <h1 className="font-display text-5xl tracking-wide mb-2">MY ORDERS</h1>
                        <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50">Track and view your order history</p>
                    </div>
                </div>
            )}

            {orders.length === 0 ? (
                <div className="text-center py-20 border border-[#2D2926] bg-[#f8f9fa] p-12 shadow-inner">
                    <Package size={64} strokeWidth={1} className="mx-auto mb-6 opacity-30" />
                    <h2 className="font-display text-3xl mb-4">No Orders Yet</h2>
                    <p className="text-sm opacity-70 mb-8 max-w-md mx-auto">You haven't placed any orders yet. Discover our premium collection and make your first purchase.</p>
                    <Link to="/shop" className="inline-block bg-[#2D2926] text-[#EBE7E0] px-12 py-4 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926]/90 transition-colors duration-300 ease-in-out shadow-lg">
                        Start Shopping
                    </Link>
                </div>
            ) : (
                    <div className="space-y-8">
                        {orders.map((order: any) => {
                            const { icon: StatusIcon, color, bg, border, text } = getStatusInfo(order.orderStatus);

                            return (
                                <div key={order._id} className="border border-[#2D2926] bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                                    {/* Order Header */}
                                    <div className="bg-[#2D2926]/5 border-b border-[#2D2926]/10 p-6 flex flex-wrap justify-between items-center gap-6">
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 flex-1">
                                            <div>
                                                <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50 mb-1">Order Placed</p>
                                                <p className="text-sm font-bold">{new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50 mb-1">Total Amount</p>
                                                <p className="text-sm font-bold">${order.totalAmount?.toFixed(2)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50 mb-1">Payment</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold">{order.paymentMethod === 'COD' ? 'Cash on Delivery' : order.paymentMethod}</span>
                                                    {order.paymentStatus === 'paid' ? (
                                                        <span className="bg-green-100 text-green-800 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded-sm shrink-0">Paid</span>
                                                    ) : (
                                                        <span className="bg-orange-100 text-orange-800 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded-sm shrink-0">COD</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50 mb-1">Order #</p>
                                                <p className="text-xs font-mono font-bold tracking-widest">{order._id.toUpperCase()}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Order Content */}
                                    <div className="p-8">
                                        <div className="flex flex-col lg:flex-row gap-12">
                                            {/* Items List */}
                                            <div className="flex-1 space-y-6">
                                                <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-4 opacity-70 border-b border-[#2D2926]/10 pb-2">Items</h3>
                                                {order.orderItems.map((item: any) => (
                                                    <div key={item._id} className="flex gap-6 items-center">
                                                        <div className="w-20 h-20 border border-[#2D2926]/20 bg-[#EBE7E0] shrink-0">
                                                            <img
                                                                src={item.product?.images?.[0] || '/placeholder.png'}
                                                                alt={item.product?.name}
                                                                className="w-full h-full object-cover mix-blend-multiply"
                                                                referrerPolicy="no-referrer"
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <Link to={`/product/${item.product?._id}`} className="font-display text-xl tracking-wide leading-none hover:opacity-70 transition-opacity">
                                                                {item.product?.name || 'Unavailable Product'}
                                                            </Link>
                                                            <div className="flex items-center gap-4 mt-2 text-sm opacity-70">
                                                                <span>Qty: {item.quantity}</span>
                                                                <span>${item.price?.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Status Tracker */}
                                            <div className="w-full lg:w-80 shrink-0 border-l border-[#2D2926]/10 pl-0 lg:pl-12 pt-8 lg:pt-0 border-t lg:border-t-0">
                                                <div className="flex justify-between items-center mb-8">
                                                    <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">Delivery Status</h3>
                                                    {order.orderStatus !== 'cancelled' && (
                                                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 flex items-center gap-1">
                                                            <Clock size={12} /> Expected: {new Date(new Date(order.createdAt).getTime() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    )}
                                                </div>

                                                {order.orderStatus === 'cancelled' ? (
                                                    <div className="p-4 bg-red-50 border border-red-200 flex items-start gap-3 text-red-800">
                                                        <XCircle className="shrink-0 mt-0.5" size={16} />
                                                        <div className="text-sm">
                                                            <p className="font-bold">Order Cancelled</p>
                                                            <p className="opacity-80 mt-1">This order has been cancelled and will not be shipped.</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="relative py-2 pl-4">
                                                        {/* Timeline lines connecting dots */}
                                                        <div className="absolute left-[1.375rem] top-4 bottom-4 w-px bg-gray-200"></div>
                                                        
                                                        {/* Step 1: Placed */}
                                                        <div className="relative flex items-center gap-4 mb-8">
                                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 z-10 ${order.orderStatus ? 'bg-green-500 ring-4 ring-green-100' : 'bg-gray-300'}`}>
                                                                <CheckCircle size={10} className="text-white" strokeWidth={3} />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold">Order Confirmed</p>
                                                                <p className="text-[10px] opacity-60 uppercase tracking-wider">{new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Step 2: Processing */}
                                                        <div className="relative flex items-center gap-4 mb-8">
                                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 z-10 ${['processing', 'shipped', 'delivered'].includes(order.orderStatus) ? 'bg-green-500 ring-4 ring-green-100' : 'bg-white border-2 border-gray-300'}`}>
                                                                {['processing', 'shipped', 'delivered'].includes(order.orderStatus) && <CheckCircle size={10} className="text-white" strokeWidth={3} />}
                                                            </div>
                                                            <div>
                                                                <p className={`text-sm font-bold ${['processing', 'shipped', 'delivered'].includes(order.orderStatus) ? 'text-[#2D2926]' : 'text-gray-400'}`}>Processing</p>
                                                            </div>
                                                        </div>

                                                        {/* Step 3: Shipped */}
                                                        <div className="relative flex items-center gap-4 mb-8">
                                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 z-10 ${['shipped', 'delivered'].includes(order.orderStatus) ? 'bg-green-500 ring-4 ring-green-100' : 'bg-white border-2 border-gray-300'}`}>
                                                                {['shipped', 'delivered'].includes(order.orderStatus) && <CheckCircle size={10} className="text-white" strokeWidth={3} />}
                                                            </div>
                                                            <div>
                                                                <p className={`text-sm font-bold ${['shipped', 'delivered'].includes(order.orderStatus) ? 'text-[#2D2926]' : 'text-gray-400'}`}>Shipped</p>
                                                            </div>
                                                        </div>

                                                        {/* Step 4: Delivered */}
                                                        <div className="relative flex items-center gap-4">
                                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 z-10 ${order.orderStatus === 'delivered' ? 'bg-green-500 ring-4 ring-green-100' : 'bg-white border-2 border-gray-300'}`}>
                                                                {order.orderStatus === 'delivered' && <CheckCircle size={10} className="text-white" strokeWidth={3} />}
                                                            </div>
                                                            <div>
                                                                <p className={`text-sm font-bold ${order.orderStatus === 'delivered' ? 'text-[#2D2926]' : 'text-gray-400'}`}>Out for Delivery / Delivered</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="text-xs space-y-2 mt-8 pt-6 border-t border-[#2D2926]/10">
                                                    <p className="font-bold flex items-center gap-2"><Truck size={14} /> Shipping Destination</p>
                                                    <p className="opacity-80 pt-1">{order.shippingAddress?.street}</p>
                                                    <p className="opacity-80">{order.shippingAddress?.city}, {order.shippingAddress?.zipCode}</p>
                                                </div>

                                                {/* Action Bar (Cancel Order) */}
                                                {['pending', 'processing'].includes(order.orderStatus) && (
                                                    <div className="mt-8 pt-6 border-t border-[#2D2926]/10">
                                                        <button 
                                                            onClick={() => {
                                                                if (window.confirm('Are you certain you want to cancel this order? It will be immediately removed and stock will be restored.')) {
                                                                    cancelOrderMutation.mutate(order._id);
                                                                }
                                                            }}
                                                            disabled={cancelOrderMutation.isPending}
                                                            className="w-full flex items-center justify-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase border border-red-500 text-red-500 py-3 hover:bg-red-500 hover:text-white transition-colors duration-300 ease-in-out shadow-sm disabled:opacity-50"
                                                        >
                                                            {cancelOrderMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
        </>
    );

    if (isEmbedded) {
        return <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">{content}</div>;
    }

    return (
        <div className="py-20 px-12 bg-[#EBE7E0] min-h-screen">
            <div className="max-w-6xl mx-auto">
                {content}
            </div>
        </div>
    );
}
