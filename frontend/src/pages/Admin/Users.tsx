import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axios';
import { Shield, User as UserIcon, Loader2, CheckCircle, XCircle } from 'lucide-react';
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
        },
        staleTime: 0,
        refetchOnWindowFocus: true,
    });

    const updateRoleMutation = useMutation({
        mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
            const { data } = await axiosInstance.patch(`/admin/users/${userId}/role`, { role: newRole });
            return data;
        },
        onSuccess: () => {
            toast.success('User role updated');
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update user role');
        },
    });

    const handleRoleChange = (userId: string, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        if (userId === currentUser?._id) {
            toast.error('You cannot change your own role.');
            return;
        }
        if (window.confirm(`Change this user's role to ${newRole.toUpperCase()}?`)) {
            updateRoleMutation.mutate({ userId, newRole });
        }
    };

    const userList = Array.isArray(users) ? users : [];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="animate-spin text-[#2D2926]" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-wide">Users</h1>
                <p className="text-sm text-[#2D2926]/50 mt-1">{userList.length} registered user{userList.length !== 1 ? 's' : ''}</p>
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block bg-white border border-[#2D2926]/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[700px]">
                        <thead>
                            <tr className="border-b border-[#2D2926]/10 bg-[#2D2926]/5">
                                <th className="px-6 py-4 text-[10px] font-bold tracking-[0.2em] uppercase">User</th>
                                <th className="px-6 py-4 text-[10px] font-bold tracking-[0.2em] uppercase">Email</th>
                                <th className="px-6 py-4 text-[10px] font-bold tracking-[0.2em] uppercase">Role</th>
                                <th className="px-6 py-4 text-[10px] font-bold tracking-[0.2em] uppercase">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold tracking-[0.2em] uppercase text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2D2926]/10">
                            {userList.map((u: any) => (
                                <tr key={u._id} className="hover:bg-[#2D2926]/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-[#2D2926]/10 flex items-center justify-center shrink-0 relative">
                                                <UserIcon size={16} className="opacity-40" />
                                                {u.role === 'admin' && (
                                                    <div className="absolute -top-1 -right-1 bg-amber-400 p-0.5 rounded-full">
                                                        <Shield size={8} className="text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">{u.name}</p>
                                                <p className="text-[10px] opacity-40">Joined {new Date(u.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm opacity-70">{u.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-bold tracking-wide uppercase px-2 py-1 border ${u.role === 'admin' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {u.isVerified ? (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-1 w-fit">
                                                <CheckCircle size={10} /> Verified
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-1 w-fit">
                                                <XCircle size={10} /> Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleRoleChange(u._id, u.role)}
                                            disabled={u._id === currentUser?._id || updateRoleMutation.isPending}
                                            className="text-[10px] font-bold tracking-wide uppercase underline hover:text-amber-600 transition-colors disabled:opacity-20 disabled:no-underline disabled:cursor-not-allowed"
                                        >
                                            {updateRoleMutation.isPending && updateRoleMutation.variables?.userId === u._id
                                                ? <Loader2 size={12} className="animate-spin inline" />
                                                : u.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden space-y-3">
                {userList.map((u: any) => (
                    <div key={u._id} className="bg-white border border-[#2D2926]/10 p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 bg-[#2D2926]/10 flex items-center justify-center shrink-0 relative">
                                    <UserIcon size={18} className="opacity-40" />
                                    {u.role === 'admin' && (
                                        <div className="absolute -top-1 -right-1 bg-amber-400 p-0.5 rounded-full">
                                            <Shield size={8} className="text-white" />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold truncate">{u.name}</p>
                                    <p className="text-xs opacity-50 truncate">{u.email}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className={`text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 border ${u.role === 'admin' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                    {u.role}
                                </span>
                                {u.isVerified ? (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-green-700">
                                        <CheckCircle size={10} /> Verified
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-600">
                                        <XCircle size={10} /> Pending
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-[#2D2926]/10">
                            <p className="text-[10px] opacity-40">Joined {new Date(u.createdAt).toLocaleDateString()}</p>
                            <button
                                onClick={() => handleRoleChange(u._id, u.role)}
                                disabled={u._id === currentUser?._id || updateRoleMutation.isPending}
                                className="text-[10px] font-bold tracking-wide uppercase underline hover:text-amber-600 transition-colors disabled:opacity-20 disabled:no-underline disabled:cursor-not-allowed"
                            >
                                {u.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
