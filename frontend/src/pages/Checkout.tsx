import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { CheckCircle, Loader2, Tag, X, Lock, ShieldCheck, CreditCard, Banknote } from 'lucide-react';
import axiosInstance from '../api/axios';
import toast from 'react-hot-toast';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useQueryClient } from '@tanstack/react-query';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

function StripePaymentSection({
  addressData,
  cart,
  finalTotal,
  appliedCoupon,
  onSuccess
}: any) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { clearCart } = useCart();

  const handleStripeSubmit = async () => {
    if (!stripe || !elements) return;

    // Basic validation
    if (!addressData.email || !addressData.firstName || !addressData.lastName || !addressData.address || !addressData.city || !addressData.postalCode) {
      setErrorMsg('Please fill in all contact and shipping information before paying.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          payment_method_data: {
            billing_details: {
              name: `${addressData.firstName} ${addressData.lastName}`,
              email: addressData.email,
              address: {
                line1: addressData.address,
                city: addressData.city,
                postal_code: addressData.postalCode,
              }
            }
          }
        },
        redirect: 'if_required',
      });

      if (error) {
        throw new Error(error.message || 'Payment failed');
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        const orderData = {
          shippingAddress: {
            street: addressData.address,
            city: addressData.city,
            state: 'N/A',
            zipCode: addressData.postalCode,
            country: 'N/A'
          },
          paymentMethod: 'Credit Card',
          paymentIntentId: paymentIntent.id,
          orderItems: cart.map((item: any) => ({
            product: item._id || item.id,
            quantity: item.quantity,
            price: item.price
          })),
          couponCode: appliedCoupon ? appliedCoupon.code : undefined,
          totalAmount: finalTotal
        };

        await axiosInstance.post('/orders/checkout', orderData);
        clearCart();
        onSuccess();
      } else {
        throw new Error('Payment was not successful (status: ' + paymentIntent?.status + ')');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMsg(err.message || err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-6">
      <div className="bg-blue-50 border border-blue-200 p-4 flex items-start gap-3 text-blue-800">
        <ShieldCheck className="shrink-0 mt-0.5 text-blue-600" size={16} />
        <div className="text-sm">
          <p className="font-bold">Secure Card Payment</p>
          <p className="opacity-80 mt-1">Your card details are fully encrypted and securely processed by Stripe. We do not store your credit card data.</p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-100 text-red-700 p-4 text-sm font-medium">
          {errorMsg}
        </div>
      )}
      
      <div className="p-4 border border-[#2D2926]/10 bg-white shadow-sm overflow-hidden">
        <PaymentElement options={{
            layout: 'tabs',
        }} />
      </div>
      
      <button
        type="button"
        onClick={handleStripeSubmit}
        disabled={isLoading || !stripe}
        className="w-full bg-[#2D2926] text-[#EBE7E0] py-5 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926]/90 transition-colors duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock size={14} />}
        {isLoading ? 'Processing securely...' : `Pay $${finalTotal.toFixed(2)} Securely`}
      </button>
    </div>
  );
}

export default function Checkout() {
  const { cart, cartTotal, clearCart } = useCart();
  const queryClient = useQueryClient();
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  
  const [clientSecret, setClientSecret] = useState('');
  const [stripeError, setStripeError] = useState('');
  const paymentIntentIdRef = React.useRef<string | null>(null);

  // Controlled form state
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [codLoading, setCodLoading] = useState(false);
  const [codError, setCodError] = useState('');

  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      if (!email) setEmail(user.email);
      if (!firstName && user.name) {
        const parts = user.name.split(' ');
        setFirstName(parts[0]);
        if (parts.length > 1) setLastName(parts.slice(1).join(' '));
      }
      
      // Auto-fill default address if available and form is empty
      if (user.addresses && user.addresses.length > 0 && !address) {
        const defaultAddr = user.addresses.find((a: any) => a.isDefault) || user.addresses[0];
        setAddress(defaultAddr.street);
        setCity(defaultAddr.city);
        setPostalCode(defaultAddr.zipCode);
      }
    }
  }, [user]);

  const handleSelectAddress = (addr: any) => {
      setAddress(addr.street);
      setCity(addr.city);
      setPostalCode(addr.zipCode);
  };

  const finalTotal = appliedCoupon ? Math.max(0, cartTotal - appliedCoupon.calculatedDiscount) : cartTotal;

  // Fetch PaymentIntent client secret
  useEffect(() => {
    if (cart.length > 0) {
      const fetchClientSecret = async () => {
        try {
          if (paymentIntentIdRef.current) {
            try {
              await axiosInstance.post('/orders/cancel-payment-intent', {
                  paymentIntentId: paymentIntentIdRef.current
              });
            } catch { /* best-effort */ }
          }
          setStripeError('');
          const { data } = await axiosInstance.post('/orders/create-payment-intent', {
            orderItems: cart.map((item: any) => ({
              product: item._id || item.id,
              quantity: item.quantity,
              price: item.price
            })),
            couponCode: appliedCoupon?.code
          });
          paymentIntentIdRef.current = data.paymentIntentId;
          setClientSecret(data.clientSecret);
        } catch (error: any) {
          console.error('Failed to init payment intent:', error);
          setStripeError(error.response?.data?.message || 'Failed to securely connect to payment provider.');
        }
      };
      
      const timeoutId = setTimeout(() => {
        fetchClientSecret();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [cart, appliedCoupon]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    try {
      const { data } = await axiosInstance.post('/coupons/apply', { code: couponCode, cartTotal });
      setAppliedCoupon(data.data.coupon);
      toast.success('Coupon applied successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid coupon code');
      setAppliedCoupon(null);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const handleCODSubmit = async () => {
    if (!email || !firstName || !lastName || !address || !city || !postalCode) {
      setCodError('Please fill in all contact and shipping information.');
      return;
    }

    setCodError('');
    setCodLoading(true);

    try {
      const orderData = {
        shippingAddress: {
          street: address,
          city: city,
          state: 'N/A',
          zipCode: postalCode,
          country: 'N/A'
        },
        paymentMethod: 'COD',
        orderItems: cart.map((item: any) => ({
          product: item._id || item.id,
          quantity: item.quantity,
          price: item.price
        })),
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        totalAmount: finalTotal
      };

      await axiosInstance.post('/orders/checkout', orderData);
      clearCart();
      // Invalidate all order caches so both user and admin see the new order immediately
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      setIsSuccess(true);
    } catch (error: any) {
      console.error('Checkout error:', error);
      setCodError(error.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setCodLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-[#EBE7E0] px-12">
        <CheckCircle size={64} className="text-green-600 mb-6" />
        <h1 className="font-display text-5xl tracking-wide mb-4">ORDER CONFIRMED</h1>
        <p className="text-sm font-medium opacity-70 mb-12 text-center max-w-md">
          Thank you for your purchase. We've received your order and will process it shortly.
        </p>
        <Link to="/orders" className="bg-[#2D2926] text-[#EBE7E0] px-12 py-4 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926]/90 transition-colors duration-300 ease-in-out shadow-lg">
          Track My Order
        </Link>
      </div>
    );
  }

  // If cart is completely empty and we aren't successful, just show empty state
  if (cart.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-[#EBE7E0] px-12">
        <h1 className="font-display text-5xl tracking-wide mb-4">CART IS EMPTY</h1>
        <p className="text-sm font-medium opacity-70 mb-12 text-center max-w-md">
          Add some products to your cart before proceeding to checkout.
        </p>
        <Link to="/shop" className="bg-[#2D2926] text-[#EBE7E0] px-12 py-4 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926]/90 transition-colors duration-300 ease-in-out shadow-lg">
          Return to Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="py-20 px-12 bg-[#EBE7E0] min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-display text-5xl tracking-wide mb-16 text-center">SECURE CHECKOUT</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Checkout Form */}
          <div className="lg:col-span-7">
            
            <div className="space-y-8">
                {/* Contact Info */}
                <section className="bg-white p-8 border border-[#2D2926]/10 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#2D2926]"></div>
                  <h2 className="text-xs font-bold tracking-[0.2em] uppercase mb-6 flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#EBE7E0] text-[#2D2926] flex items-center justify-center font-bold">1</span>
                    Contact Information
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold mb-2 opacity-80">Email Address</label>
                      <input required value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="you@example.com" className="w-full bg-[#EBE7E0]/30 border border-[#2D2926]/20 p-4 text-sm focus:outline-none focus:border-[#2D2926] transition-colors duration-300 ease-in-out focus:bg-white" />
                    </div>
                  </div>
                </section>

                {/* Shipping Address */}
                <section className="bg-white p-8 border border-[#2D2926]/10 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#2D2926]"></div>
                  <h2 className="text-xs font-bold tracking-[0.2em] uppercase mb-6 flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#EBE7E0] text-[#2D2926] flex items-center justify-center font-bold">2</span>
                    Shipping Address
                  </h2>

                  {user?.addresses && user.addresses.length > 0 && (
                      <div className="mb-6 pb-6 border-b border-[#2D2926]/10">
                          <label className="block text-[10px] font-bold tracking-[0.2em] uppercase mb-3 opacity-70">Quick Select Saved Address</label>
                          <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                              {user.addresses.map((addr: any) => (
                                  <button
                                      key={addr._id}
                                      type="button"
                                      onClick={() => handleSelectAddress(addr)}
                                      className="shrink-0 text-left p-4 border border-[#2D2926]/20 hover:border-[#2D2926] bg-[#f8f9fa] hover:bg-white transition-colors min-w-[200px]"
                                  >
                                      <p className="font-bold text-sm mb-1">{addr.street}</p>
                                      <p className="text-xs opacity-70">{addr.city}, {addr.zipCode}</p>
                                      {addr.isDefault && <span className="inline-block mt-2 text-[8px] tracking-widest uppercase font-bold text-green-700 bg-green-100 px-2 py-0.5">Default</span>}
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold mb-2 opacity-80">First Name</label>
                      <input required value={firstName} onChange={e=>setFirstName(e.target.value)} type="text" className="w-full bg-[#EBE7E0]/30 border border-[#2D2926]/20 p-4 text-sm focus:outline-none focus:border-[#2D2926] transition-colors duration-300 ease-in-out focus:bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-2 opacity-80">Last Name</label>
                      <input required value={lastName} onChange={e=>setLastName(e.target.value)} type="text" className="w-full bg-[#EBE7E0]/30 border border-[#2D2926]/20 p-4 text-sm focus:outline-none focus:border-[#2D2926] transition-colors duration-300 ease-in-out focus:bg-white" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold mb-2 opacity-80">Address</label>
                      <input required value={address} onChange={e=>setAddress(e.target.value)} type="text" placeholder="123 Shopping Lane, Apt 4" className="w-full bg-[#EBE7E0]/30 border border-[#2D2926]/20 p-4 text-sm focus:outline-none focus:border-[#2D2926] transition-colors duration-300 ease-in-out focus:bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-2 opacity-80">City</label>
                      <input required value={city} onChange={e=>setCity(e.target.value)} type="text" className="w-full bg-[#EBE7E0]/30 border border-[#2D2926]/20 p-4 text-sm focus:outline-none focus:border-[#2D2926] transition-colors duration-300 ease-in-out focus:bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-2 opacity-80">Postal Code</label>
                      <input required value={postalCode} onChange={e=>setPostalCode(e.target.value)} type="text" className="w-full bg-[#EBE7E0]/30 border border-[#2D2926]/20 p-4 text-sm focus:outline-none focus:border-[#2D2926] transition-colors duration-300 ease-in-out focus:bg-white" />
                    </div>
                  </div>
                </section>

                {/* Payment Details */}
                <section className="bg-white p-8 border border-[#2D2926]/10 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#2D2926]"></div>
                  
                  <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
                      <h2 className="text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#EBE7E0] text-[#2D2926] flex items-center justify-center font-bold">3</span>
                        Payment Details
                      </h2>
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-80 font-bold text-[#2D2926] bg-[#EBE7E0] px-3 py-1.5 rounded-full">
                          <Lock size={12} /> Secure 256-bit Encryption
                      </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <label className={`relative flex flex-col items-center gap-3 p-6 border-2 cursor-pointer transition-all duration-300 ${paymentMethod === 'Credit Card' ? 'border-[#2D2926] bg-[#2D2926]/5 shadow-inner' : 'border-[#2D2926]/10 hover:border-[#2D2926]/30 bg-white'}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="Credit Card"
                        checked={paymentMethod === 'Credit Card'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="absolute top-4 right-4 w-4 h-4 accent-[#2D2926] cursor-pointer"
                      />
                      <CreditCard size={32} strokeWidth={1.5} className={paymentMethod === 'Credit Card' ? 'text-[#2D2926]' : 'text-gray-400'} />
                      <span className="text-sm font-bold mt-2">Credit Card</span>
                      <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest text-center">Powered by Stripe</span>
                    </label>

                    <label className={`relative flex flex-col items-center gap-3 p-6 border-2 cursor-pointer transition-all duration-300 ${paymentMethod === 'COD' ? 'border-[#2D2926] bg-[#2D2926]/5 shadow-inner' : 'border-[#2D2926]/10 hover:border-[#2D2926]/30 bg-white'}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="COD"
                        checked={paymentMethod === 'COD'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="absolute top-4 right-4 w-4 h-4 accent-[#2D2926] cursor-pointer"
                      />
                      <Banknote size={32} strokeWidth={1.5} className={paymentMethod === 'COD' ? 'text-[#2D2926]' : 'text-gray-400'} />
                      <span className="text-sm font-bold mt-2">Cash on Delivery</span>
                      <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest text-center">Pay at doorstep</span>
                    </label>
                  </div>

                  {/* Dynamic submission zones based on payment method */}
                  {paymentMethod === 'Credit Card' ? (
                    <div className="pt-4 border-t border-[#2D2926]/10">
                        {stripeError ? (
                        <div className="bg-red-100 text-red-700 p-4 text-sm font-medium border border-red-200">
                            {stripeError}
                        </div>
                        ) : !user ? (
                            <div className="flex flex-col items-center justify-center py-12 px-8 bg-white border border-[#2D2926]/10 text-center">
                                <Lock size={32} className="opacity-20 mb-4" />
                                <h3 className="text-xs font-bold tracking-[0.2em] uppercase mb-2">Authentication Required</h3>
                                <p className="text-[10px] opacity-40 uppercase tracking-widest max-w-xs leading-relaxed mb-8">
                                    To securely process your credit card, please sign in to your NOVA account.
                                </p>
                                <Link to="/login" className="bg-[#2D2926] text-[#EBE7E0] px-10 py-3 text-[10px] font-bold tracking-[0.2em] uppercase hover:opacity-90 transition-all shadow-md">
                                    Sign In to Pay
                                </Link>
                            </div>
                        ) : clientSecret ? (
                        <Elements stripe={stripePromise} options={{ 
                            clientSecret,
                            appearance: {
                                theme: 'flat',
                                variables: {
                                    colorPrimary: '#2D2926',
                                    colorBackground: '#ffffff',
                                    colorText: '#2D2926',
                                    colorDanger: '#df1b41',
                                    fontFamily: 'Outfit, sans-serif',
                                    spacingUnit: '4px',
                                    borderRadius: '0px',
                                },
                                rules: {
                                    '.Input': {
                                        border: '1px solid rgba(45, 41, 38, 0.1)',
                                        boxShadow: 'none',
                                    },
                                    '.Input:focus': {
                                        border: '1px solid #2D2926',
                                    },
                                    '.Label': {
                                        fontSize: '10px',
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.15em',
                                        opacity: '0.6',
                                    }
                                }
                            }
                        }}>
                            <StripePaymentSection
                            addressData={{ email, firstName, lastName, address, city, postalCode }}
                            cart={cart}
                            finalTotal={finalTotal}
                            appliedCoupon={appliedCoupon}
                            onSuccess={() => {
                              queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
                              queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
                              queryClient.invalidateQueries({ queryKey: ['my-orders'] });
                              setIsSuccess(true);
                            }}
                            />
                        </Elements>
                        ) : (
                        <div className="flex flex-col items-center justify-center py-20 bg-white border border-[#2D2926]/5">
                            <div className="w-10 h-10 border-2 border-[#2D2926]/10 border-t-[#2D2926] rounded-full animate-spin mb-4" />
                            <p className="text-[8px] uppercase tracking-[0.3em] opacity-30 font-bold animate-pulse">Initializing Secure Gateway...</p>
                        </div>
                        )}
                    </div>
                  ) : (
                    <div className="pt-8 border-t border-[#2D2926]/10">
                      {codError && (
                        <div className="bg-red-100 text-red-700 p-4 text-sm font-medium mb-6">
                          {codError}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleCODSubmit}
                        disabled={codLoading}
                        className="w-full bg-[#2D2926] text-[#EBE7E0] py-5 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926]/90 transition-colors duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
                      >
                        {codLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote size={16} />}
                        {codLoading ? 'Processing...' : `Place COD Order - $${finalTotal.toFixed(2)}`}
                      </button>
                    </div>
                  )}
                </section>
            </div>
          </div>

          {/* Order Summary & Sidebar */}
          <div className="lg:col-span-5 flex flex-col gap-8">

            {/* Promo Code Section */}
            <div className="border border-[#2D2926]/10 p-8 bg-white shadow-sm">
              <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
                <Tag size={16} /> Promo Code
              </h2>
              {!appliedCoupon ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter code here"
                    className="flex-1 bg-[#EBE7E0]/30 border border-[#2D2926]/20 p-4 text-sm focus:outline-none focus:border-[#2D2926] transition-colors focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={isApplyingCoupon || !couponCode}
                    className="bg-[#2D2926] text-[#EBE7E0] px-8 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926]/90 transition-colors disabled:opacity-50"
                  >
                    {isApplyingCoupon ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center bg-green-50 text-green-800 p-4 border border-green-200 shadow-inner">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <CheckCircle size={16} /> {appliedCoupon.code} Applied
                  </div>
                  <button onClick={removeCoupon} type="button" className="text-green-800 hover:opacity-70 transition-opacity">
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="border border-[#2D2926] p-8 bg-[#EBE7E0] sticky top-8 shadow-xl">
              <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-8 pb-2 border-b border-[#2D2926]/20">Order Summary</h2>

              <div className="space-y-6 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {cart.map((item: any) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-20 h-20 border border-[#2D2926]/20 bg-white flex-shrink-0 p-1">
                      <img src={item.img || item.images?.[0] || '/placeholder.png'} alt={item.name} className="w-full h-full object-cover mix-blend-multiply" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <h3 className="font-display text-lg tracking-wide leading-none mb-2">{item.name}</h3>
                      <div className="flex justify-between items-center text-sm">
                        <span className="opacity-60">Qty: {item.quantity}</span>
                        <span className="font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#2D2926]/20 pt-6 space-y-4 text-sm">
                <div className="flex justify-between items-center">
                  <span className="opacity-70">Subtotal</span>
                  <span className="font-bold">${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="opacity-70">Shipping</span>
                  <span className="font-bold">Free</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between items-center text-green-700 font-bold">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span>-${appliedCoupon.calculatedDiscount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-6 mt-2 border-t border-[#2D2926]/20">
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Total</span>
                  <span className="font-display text-4xl">${finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
