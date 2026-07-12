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
                try {
                    const state = useCartStore.getState();
                    const cartItems = state?.cart;
                    if (cartItems && cartItems.length > 0) {
                        import('../api/axios').then(mod => {
                            mod.default.put('/cart/sync', {
                                items: cartItems.map((item: any) => ({
                                    productId: item._id || item.id,
                                    quantity: item.quantity
                                }))
                            }).catch(() => {});
                        });
                    }
                } catch {
                    // Cart store not available (e.g. in test environment)
                }
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
