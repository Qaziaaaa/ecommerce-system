import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './useAuthStore';

// Mock useCartStore
vi.mock('./useCartStore', () => ({
    useCartStore: {
        getState: () => ({
            clearCart: vi.fn()
        })
    }
}));

describe('useAuthStore', () => {
    beforeEach(() => {
        useAuthStore.setState({ user: null, isAuthenticated: false });
    });

    it('should initialize with null user and false auth', () => {
        const state = useAuthStore.getState();
        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(false);
    });

    it('should setAuth correctly', () => {
        const mockUser = { _id: '1', name: 'Admin', email: 'admin@nova.com', role: 'admin' as const };
        useAuthStore.getState().setAuth(mockUser);

        const state = useAuthStore.getState();
        expect(state.user).toEqual(mockUser);
        expect(state.isAuthenticated).toBe(true);
    });

    it('should logout and clear user', () => {
        const mockUser = { _id: '1', name: 'Admin', email: 'admin@nova.com', role: 'admin' as const };
        useAuthStore.getState().setAuth(mockUser);
        useAuthStore.getState().logout();

        const state = useAuthStore.getState();
        expect(state.user).toBeNull();
        expect(state.isAuthenticated).toBe(false);
    });
});
