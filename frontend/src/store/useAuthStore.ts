import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCartStore } from './useCartStore';

interface User {
    _id: string;
    name: string;
    email: string;
    role: 'user' | 'admin';
    addresses?: any[];
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    setAuth: (user: User) => void;
    setUser: (user: User) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            setAuth: (user) => {
                set({ user, isAuthenticated: true });
            },
            setUser: (user) => {
                set({ user });
            },
            logout: () => {
                set({ user: null, isAuthenticated: false });
                // Clear cart on logout for shared-device security
                useCartStore.getState().clearCart();
            },
        }),
        {
            name: 'auth-storage',
        }
    )
);
