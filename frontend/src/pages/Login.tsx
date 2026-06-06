import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2, Shield } from 'lucide-react';
import axiosInstance from '../api/axios';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';

export default function Login() {
    const [step, setStep] = useState(1); // 1: Email, 2: OTP
    const [mode, setMode] = useState<'otp' | 'admin'>('otp');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const setAuth = useAuthStore((state) => state.setAuth);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get('redirect') || '/';

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axiosInstance.post('/auth/send-otp', { email, type: 'login' });
            setStep(2);
            toast.success('OTP sent to your email');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setLoading(true);
        try {
            await axiosInstance.post('/auth/resend-otp', { email, type: 'login' });
            toast.success('New OTP sent to your email');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to resend OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await axiosInstance.post('/auth/verify-otp', { email, otp: otp.trim() });
            setAuth(data.user);
            toast.success('Logged in successfully');
            const target = redirectTo && redirectTo.startsWith('/admin') ? redirectTo : (data.user.role === 'admin' ? '/admin' : '/');
            navigate(target);
        } catch (error: any) {
            const message = error.response?.data?.message || (error instanceof Error ? error.message : 'Invalid OTP');
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await axiosInstance.post('/auth/admin-login', { email, password });
            setAuth(data.user);
            toast.success('Admin logged in successfully');
            navigate('/admin');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-85px)] flex items-center justify-center bg-[#EBE7E0] px-4 sm:px-8 py-12">
            <div className="w-full max-w-md bg-white border border-[#2D2926]/10 p-8 sm:p-12">
                <div className="text-center mb-10">
                    <h1 className="font-display text-4xl tracking-wide mb-2">WELCOME BACK</h1>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50">Sign in to your account</p>
                </div>

                {/* Tab Switcher */}
                <div className="flex border-b border-[#2D2926]/10 mb-8">
                    <button
                        type="button"
                        onClick={() => { setMode('otp'); setStep(1); }}
                        className={`flex-1 pb-3 text-[9px] font-bold tracking-[0.2em] uppercase transition-all ${mode === 'otp' ? 'border-b-2 border-[#2D2926] opacity-100' : 'opacity-30 hover:opacity-60'}`}
                    >
                        OTP Login
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('admin')}
                        className={`flex-1 pb-3 text-[9px] font-bold tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2 ${mode === 'admin' ? 'border-b-2 border-[#2D2926] opacity-100' : 'opacity-30 hover:opacity-60'}`}
                    >
                        <Shield size={12} /> Admin Login
                    </button>
                </div>

                {mode === 'otp' ? (
                    <>
                        {step === 1 ? (
                            <form onSubmit={handleSendOtp} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[8px] font-bold tracking-[0.2em] uppercase opacity-50">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2D2926]/30" size={16} />
                                        <input 
                                            type="email" 
                                            required
                                            className="w-full bg-[#EBE7E0]/50 border border-[#2D2926]/10 px-12 py-4 text-sm focus:outline-none focus:border-[#2D2926] transition-colors"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <button 
                                    disabled={loading}
                                    className="w-full bg-[#2D2926] text-[#EBE7E0] py-4 text-[10px] font-bold tracking-[0.2em] uppercase hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={16} /> : <>Continue <ArrowRight size={14} /></>}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOtp} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[8px] font-bold tracking-[0.2em] uppercase opacity-50">Enter OTP</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2D2926]/30" size={16} />
                                        <input 
                                            type="text" 
                                            required
                                            maxLength={6}
                                            className="w-full bg-[#EBE7E0]/50 border border-[#2D2926]/10 px-12 py-4 text-sm tracking-[1em] font-bold focus:outline-none focus:border-[#2D2926] transition-colors"
                                            placeholder="000000"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                        />
                                    </div>
                                    <p className="text-[8px] opacity-40 text-center mt-2 uppercase tracking-widest">A 6-digit code has been sent to {email}</p>
                                </div>
                                <button 
                                    disabled={loading}
                                    className="w-full bg-[#2D2926] text-[#EBE7E0] py-4 text-[10px] font-bold tracking-[0.2em] uppercase hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={16} /> : 'Verify & Login'}
                                </button>
                                <div className="flex flex-col gap-4">
                                    <button type="button" onClick={() => setStep(1)} className="w-full text-[8px] font-bold tracking-[0.2em] uppercase opacity-40 hover:opacity-100 transition-opacity">Change Email</button>
                                    <button 
                                        type="button" 
                                        onClick={handleResendOtp}
                                        disabled={loading}
                                        className="w-full text-[8px] font-bold tracking-[0.2em] uppercase text-amber-700 hover:opacity-70 transition-opacity disabled:opacity-30"
                                    >
                                        Resend OTP
                                    </button>
                                </div>
                            </form>
                        )}
                    </>
                ) : (
                    <form onSubmit={handleAdminLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[8px] font-bold tracking-[0.2em] uppercase opacity-50">Admin Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2D2926]/30" size={16} />
                                <input 
                                    type="email" 
                                    required
                                    className="w-full bg-[#EBE7E0]/50 border border-[#2D2926]/10 px-12 py-4 text-sm focus:outline-none focus:border-[#2D2926] transition-colors"
                                    placeholder="admin@nova.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[8px] font-bold tracking-[0.2em] uppercase opacity-50">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2D2926]/30" size={16} />
                                <input 
                                    type="password" 
                                    required
                                    minLength={6}
                                    className="w-full bg-[#EBE7E0]/50 border border-[#2D2926]/10 px-12 py-4 text-sm focus:outline-none focus:border-[#2D2926] transition-colors"
                                    placeholder="Enter admin password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>
                        <button 
                            disabled={loading}
                            className="w-full bg-[#2D2926] text-[#EBE7E0] py-4 text-[10px] font-bold tracking-[0.2em] uppercase hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={16} /> : <><Shield size={14} /> Admin Login</>}
                        </button>
                    </form>
                )}

                <div className="mt-10 pt-10 border-t border-[#2D2926]/10 text-center">
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50">Don't have an account?</p>
                    <Link to="/signup" className="inline-block mt-4 text-[10px] font-bold tracking-[0.2em] uppercase border-b border-[#2D2926] pb-1 hover:opacity-70 transition-opacity">Create Account</Link>
                </div>
            </div>
        </div>
    );
}
