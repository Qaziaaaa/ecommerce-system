import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axios';
import { Mail, Shield, User as UserIcon, Loader2, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/useAuthStore';

export default function AdminUsers() {
    const queryClient = useQueryClient();
    const { user: currentUser } = useAuthStore();

    const { data: users, isLoading } = useQuery({
        queryKey: ['admin-users'],
        queryFn: async () => {
            const { data } = await axiosInstance.get('/admin/users');
            return data.data;
        }
    });

    const updateRoleMutation = useMutation({
        mutationFn: async ({ userId, newRole }: { userId: string, newRole: string }) => {
            const { data } = await axiosInstance.patch(`/admin/users/${userId}/role`, { role: newRole });
            return data;
        },
        onSuccess: () => {
            toast.success('User role updated successfully');
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update user role');
        }
    });

    const handleRoleChange = (userId: string, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        
        if (userId === currentUser?._id) {
            toast.error('You cannot change your own role.');
            return;
        }

        if (window.confirm(`Are you sure you want to change this users role to ${newRole.toUpperCase()}?`)) {
            updateRoleMutation.mutate({ userId, newRole });
        }
    };

    return (
        <div className="space-y-12 pb-20">
            <div>
                <h1 className="font-display text-5xl tracking-wide mb-2">USER MANAGEMENT</h1>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50">Oversee customer accounts and administrative permissions</p>
            </div>

            <div className="bg-white border border-[#2D2926]/10 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-[#2D2926]/10 bg-[#2D2926]/5">
                            <th className="px-8 py-6 text-[10px] font-bold tracking-[0.4em] uppercase">Identity</th>
                            <th className="px-8 py-6 text-[10px] font-bold tracking-[0.4em] uppercase">Contact</th>
                            <th className="px-8 py-6 text-[10px] font-bold tracking-[0.4em] uppercase">Permissions</th>
                            <th className="px-8 py-6 text-[10px] font-bold tracking-[0.4em] uppercase">Verification</th>
                            <th className="px-8 py-6 text-[10px] font-bold tracking-[0.4em] uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2D2926]/10">
                        {isLoading ? (
                             [...Array(6)].map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={5} className="px-8 py-10 bg-[#2D2926]/5"></td>
                                </tr>
                            ))
                        ) : (Array.isArray(users) ? users : []).map((u: any) => (
                            <tr key={u._id} className="hover:bg-[#2D2926]/5 transition-all duration-300 group">
                                <td className="px-8 py-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-[#EBE7E0] border border-[#2D2926]/10 flex items-center justify-center relative">
                                            <UserIcon size={20} className="text-[#2D2926]/40" />
                                            {u.role === 'admin' && (
                                                <div className="absolute -top-1 -right-1 bg-amber-400 p-1 rounded-full shadow-sm">
                                                    <Shield size={10} className="text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-display text-xl tracking-tight leading-none mb-1">{u.name}</p>
                                            <p className="text-[8px] font-bold opacity-30 uppercase tracking-widest">Joined {new Date(u.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-8">
                                    <div className="flex items-center gap-2 group-hover:text-[#2D2926] transition-colors">
                                        <Mail size={14} className="opacity-30" />
                                        <span className="text-xs font-medium">{u.email}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-8">
                                    <span className={`px-4 py-1.5 text-[8px] font-bold tracking-[0.2em] uppercase transition-all ${u.role === 'admin' ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-gray-100 text-gray-500 border border-gray-200 opacity-60'}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-8 py-8">
                                    <div className="flex items-center gap-2">
                                        {u.isVerified ? (
                                            <div className="flex items-center gap-1.5 text-green-700 bg-green-50 px-3 py-1 text-[8px] font-bold tracking-widest uppercase border border-green-100">
                                                <CheckCircle size={10} /> Verified
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-red-700 bg-red-50 px-3 py-1 text-[8px] font-bold tracking-widest uppercase border border-red-100">
                                                <XCircle size={10} /> Pending
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-8 py-8 text-right">
                                    <button
                                        onClick={() => handleRoleChange(u._id, u.role)}
                                        disabled={u._id === currentUser?._id || updateRoleMutation.isPending}
                                        className="text-[10px] font-bold tracking-[0.2em] uppercase underline hover:text-amber-600 transition-colors disabled:opacity-20 disabled:no-underline disabled:cursor-not-allowed"
                                    >
                                        {updateRoleMutation.isPending && updateRoleMutation.variables?.userId === u._id ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : u.role === 'admin' ? 'Revoke Access' : 'Grant Admin'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
