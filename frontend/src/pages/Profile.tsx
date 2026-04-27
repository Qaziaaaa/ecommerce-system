import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import axiosInstance from '../api/axios';
import { User, Lock, Mail, Loader2, Save, MapPin, Plus, Trash2, CheckCircle, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import UserOrders from './UserOrders';

export default function Profile() {
    const { user, setUser } = useAuthStore();
    const [activeTab, setActiveTab] = useState('details');
    
    // Personal Info State
    const [name, setName] = useState(user?.name || '');
    const [isUpdating, setIsUpdating] = useState(false);

    // Sync name when user loads
    React.useEffect(() => {
        if (user?.name) {
            setName(user.name);
        }
    }, [user?.name]);

    // Address Form State
    const [isAddingAddress, setIsAddingAddress] = useState(false);
    const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);
    const [newAddress, setNewAddress] = useState({
        street: '',
        city: '',
        zipCode: '',
        isDefault: false
    });

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        
        setIsUpdating(true);
        try {
            const { data } = await axiosInstance.put('/auth/profile', { name: name.trim() });
            if (data?.user) {
                setUser(data.user);
                toast.success('Profile updated successfully');
            }
        } catch (error: any) {
            console.error('Profile update error:', error);
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAddAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingAddress(true);
        try {
            const { data } = await axiosInstance.post('/auth/profile/addresses', newAddress);
            setUser(data.user);
            toast.success('Address added successfully');
            setIsAddingAddress(false);
            setNewAddress({ street: '', city: '', zipCode: '', isDefault: false });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to add address');
        } finally {
            setIsSubmittingAddress(false);
        }
    };

    const handleDeleteAddress = async (id: string) => {
        try {
            const { data } = await axiosInstance.delete(`/auth/profile/addresses/${id}`);
            setUser(data.user);
            toast.success('Address removed');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to remove address');
        }
    };

    const handleSetDefaultAddress = async (id: string) => {
        try {
            const { data } = await axiosInstance.put(`/auth/profile/addresses/${id}/default`);
            setUser(data.user);
            toast.success('Default address updated');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update default address');
        }
    };

    // User Initials for Avatar
    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    return (
        <div className="min-h-screen bg-[#EBE7E0] py-12 px-4 sm:px-8 lg:px-12">
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8">
                
                {/* Profile Navigation/Sidebar */}
                <div className="w-full md:w-64 shrink-0">
                    <div className="bg-white border border-[#2D2926]/10 p-6 flex flex-col items-center text-center shadow-sm mb-4">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#2D2926] text-[#EBE7E0] flex items-center justify-center text-2xl font-display tracking-widest mb-3">
                            {user?.name ? getInitials(user.name) : 'U'}
                        </div>
                        <h2 className="font-display text-xl tracking-wide">{user?.name}</h2>
                        <p className="text-xs font-bold opacity-50 mt-1 break-all">{user?.email}</p>
                    </div>

                    {/* Tab nav — horizontal on mobile, vertical on desktop */}
                    <nav className="flex md:flex-col gap-2 overflow-x-auto pb-1 md:pb-0">
                        {[
                            { id: 'details', label: 'Profile Details' },
                            { id: 'addresses', label: 'Addresses' },
                            { id: 'orders', label: 'Order History' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`shrink-0 md:w-full text-left px-4 py-3 text-[10px] font-bold tracking-[0.2em] uppercase transition-colors duration-200 whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'bg-[#2D2926] text-[#EBE7E0]'
                                        : 'bg-white hover:bg-[#2D2926]/5 border border-[#2D2926]/10'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 bg-white border border-[#2D2926]/10 p-6 sm:p-8 shadow-sm relative overflow-hidden min-w-0">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#2D2926]"></div>
                    
                    {activeTab === 'details' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="border-b border-[#2D2926]/10 pb-6 mb-8 flex items-center gap-4 text-[#2D2926]">
                                <User size={24} />
                                <div>
                                    <h2 className="font-display text-2xl tracking-wide">Personal Information</h2>
                                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50">Manage your profile details and settings</p>
                                </div>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="space-y-8 max-w-lg">
                                <div className="space-y-8">
                                    {/* Name */}
                                    <div>
                                        <label className="block text-[10px] font-bold tracking-[0.2em] uppercase mb-3 opacity-70">Full Name</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <User size={16} className="text-[#2D2926]/40" />
                                            </div>
                                            <input 
                                                type="text" 
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full pl-12 pr-4 py-4 bg-[#EBE7E0]/30 border border-[#2D2926]/20 focus:outline-none focus:border-[#2D2926] focus:bg-white text-sm font-medium transition-colors"
                                                placeholder="Enter your full name"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="block text-[10px] font-bold tracking-[0.2em] uppercase mb-3 opacity-70">Email Address</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Mail size={16} className="text-[#2D2926]/40" />
                                            </div>
                                            <input 
                                                type="email" 
                                                value={user?.email || ''}
                                                disabled
                                                className="w-full pl-12 pr-4 py-4 bg-[#EBE7E0]/50 border border-[#2D2926]/10 text-[#2D2926]/50 text-sm font-medium cursor-not-allowed"
                                            />
                                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                                <Lock size={14} className="text-[#2D2926]/30" />
                                            </div>
                                        </div>
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-[#2D2926]/40 mt-3 flex items-center gap-1.5"><Lock size={10} /> Email changes require re-verification.</p>
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={isUpdating || name === user?.name || !name.trim()}
                                    className={`w-full py-5 text-[10px] font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-2 transition-all duration-300 shadow-md ${
                                        isUpdating || name === user?.name || !name.trim()
                                            ? 'bg-[#2D2926]/20 text-[#2D2926]/50 cursor-not-allowed shadow-none'
                                            : 'bg-[#2D2926] text-[#EBE7E0] hover:bg-[#2D2926]/90 hover:shadow-xl'
                                    }`}
                                >
                                    {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    {isUpdating ? 'Saving Changes...' : 'Save Profile Details'}
                                </button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'addresses' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="border-b border-[#2D2926]/10 pb-6 mb-8 flex items-center justify-between">
                                <div className="flex items-center gap-4 text-[#2D2926]">
                                    <MapPin size={24} />
                                    <div>
                                        <h2 className="font-display text-2xl tracking-wide">Saved Addresses</h2>
                                        <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50">Manage your shipping destinations</p>
                                    </div>
                                </div>
                                {!isAddingAddress && (
                                    <button 
                                        onClick={() => setIsAddingAddress(true)}
                                        className="bg-[#2D2926] text-[#EBE7E0] px-6 py-3 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926]/90 transition-colors flex items-center gap-2 shadow-sm"
                                    >
                                        <Plus size={14} /> Add New
                                    </button>
                                )}
                            </div>

                            {isAddingAddress ? (
                                <form onSubmit={handleAddAddress} className="bg-[#f8f9fa] border border-[#2D2926]/20 p-8 shadow-inner animate-in fade-in zoom-in-95 duration-300">
                                    <h3 className="font-display text-xl mb-6">Add New Address</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                        <div className="col-span-2">
                                            <label className="block text-[10px] font-bold tracking-[0.2em] uppercase mb-2 opacity-70">Street Address</label>
                                            <input required value={newAddress.street} onChange={e=>setNewAddress({...newAddress, street: e.target.value})} type="text" placeholder="123 Example Street, Apt 4" className="w-full bg-white border border-[#2D2926]/30 p-4 text-sm focus:outline-none focus:border-[#2D2926] transition-colors" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold tracking-[0.2em] uppercase mb-2 opacity-70">City</label>
                                            <input required value={newAddress.city} onChange={e=>setNewAddress({...newAddress, city: e.target.value})} type="text" placeholder="New York" className="w-full bg-white border border-[#2D2926]/30 p-4 text-sm focus:outline-none focus:border-[#2D2926] transition-colors" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold tracking-[0.2em] uppercase mb-2 opacity-70">Postal Code</label>
                                            <input required value={newAddress.zipCode} onChange={e=>setNewAddress({...newAddress, zipCode: e.target.value})} type="text" placeholder="10001" className="w-full bg-white border border-[#2D2926]/30 p-4 text-sm focus:outline-none focus:border-[#2D2926] transition-colors" />
                                        </div>
                                        <div className="col-span-2 flex items-center gap-3 pt-2">
                                            <input type="checkbox" id="isDefault" checked={newAddress.isDefault} onChange={e=>setNewAddress({...newAddress, isDefault: e.target.checked})} className="w-4 h-4 accent-[#2D2926] cursor-pointer" />
                                            <label htmlFor="isDefault" className="text-sm font-bold cursor-pointer">Set as default shipping address</label>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <button 
                                            type="submit" 
                                            disabled={isSubmittingAddress}
                                            className="bg-[#2D2926] text-[#EBE7E0] px-8 py-4 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926]/90 transition-colors flex items-center gap-2 shadow-md disabled:opacity-50"
                                        >
                                            {isSubmittingAddress ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                            {isSubmittingAddress ? 'Saving...' : 'Save Address'}
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setIsAddingAddress(false)}
                                            disabled={isSubmittingAddress}
                                            className="bg-transparent border border-[#2D2926]/30 text-[#2D2926] px-8 py-4 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926]/5 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    {(!user?.addresses || user.addresses.length === 0) ? (
                                        <div className="text-center py-16 border-2 border-dashed border-[#2D2926]/20 bg-[#f8f9fa]">
                                            <MapPin size={48} strokeWidth={1} className="mx-auto mb-4 opacity-20" />
                                            <p className="text-sm font-bold opacity-70">No addresses saved yet</p>
                                            <p className="text-xs opacity-50 mt-1 max-w-sm mx-auto">Add a shipping address to make your next checkout faster and easier.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            {user.addresses.map((addr: any) => (
                                                <div key={addr._id} className={`relative p-6 border transition-all duration-300 bg-white group hover:shadow-md ${addr.isDefault ? 'border-[#2D2926] ring-1 ring-[#2D2926]' : 'border-[#2D2926]/20 hover:border-[#2D2926]/50'}`}>
                                                    {addr.isDefault && (
                                                        <div className="absolute top-0 right-0 bg-[#2D2926] text-[#EBE7E0] px-3 py-1 text-[8px] font-bold tracking-widest uppercase flex items-center gap-1 shadow-sm">
                                                            <CheckCircle size={10} /> Default
                                                        </div>
                                                    )}
                                                    
                                                    <div className="mt-2 text-sm space-y-1 mb-6">
                                                        <p className="font-bold text-base">{addr.street}</p>
                                                        <p className="opacity-80">{addr.city}, {addr.zipCode}</p>
                                                        {addr.state !== 'N/A' && <p className="opacity-80">{addr.state}, {addr.country !== 'N/A' ? addr.country : ''}</p>}
                                                    </div>

                                                    <div className="flex items-center gap-4 pt-4 border-t border-[#2D2926]/10">
                                                        {!addr.isDefault && (
                                                            <button 
                                                                onClick={() => handleSetDefaultAddress(addr._id)}
                                                                className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#2D2926]/60 hover:text-[#2D2926] transition-colors flex-1 text-left"
                                                            >
                                                                Set as Default
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => handleDeleteAddress(addr._id)}
                                                            className="text-red-500 hover:text-red-700 transition-colors bg-red-50 p-2 rounded-sm ml-auto opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                            aria-label="Delete address"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'orders' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="border-b border-[#2D2926]/10 pb-6 mb-8 flex items-center gap-4 text-[#2D2926]">
                                <Package size={24} />
                                <div>
                                    <h2 className="font-display text-2xl tracking-wide">Order History</h2>
                                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50">Track your past and current items</p>
                                </div>
                            </div>
                            <UserOrders isEmbedded={true} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
