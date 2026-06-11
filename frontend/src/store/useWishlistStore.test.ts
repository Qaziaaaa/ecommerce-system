import { describe, it, expect, beforeEach } from 'vitest';
import { useWishlistStore } from './useWishlistStore';

beforeEach(() => {
    useWishlistStore.setState({ items: [], isOpen: false });
    localStorage.clear();
});

describe('useWishlistStore', () => {
    it('should initialize with empty items and closed state', () => {
        const state = useWishlistStore.getState();
        expect(state.items).toEqual([]);
        expect(state.isOpen).toBe(false);
    });

    it('should add an item via toggleItem', () => {
        useWishlistStore.getState().toggleItem('product-1');
        const state = useWishlistStore.getState();
        expect(state.items).toEqual(['product-1']);
    });

    it('should remove an item via toggleItem if already present', () => {
        const store = useWishlistStore.getState();
        store.toggleItem('product-1');
        store.toggleItem('product-2');
        store.toggleItem('product-1');
        const state = useWishlistStore.getState();
        expect(state.items).toEqual(['product-2']);
    });

    it('should toggle the same item multiple times', () => {
        const store = useWishlistStore.getState();
        store.toggleItem('product-1');
        expect(useWishlistStore.getState().items).toEqual(['product-1']);
        store.toggleItem('product-1');
        expect(useWishlistStore.getState().items).toEqual([]);
        store.toggleItem('product-1');
        expect(useWishlistStore.getState().items).toEqual(['product-1']);
    });

    it('should set items via setItems', () => {
        useWishlistStore.getState().setItems(['a', 'b', 'c']);
        const state = useWishlistStore.getState();
        expect(state.items).toEqual(['a', 'b', 'c']);
    });

    it('should clear all items', () => {
        const store = useWishlistStore.getState();
        store.setItems(['a', 'b']);
        store.clearWishlist();
        expect(useWishlistStore.getState().items).toEqual([]);
    });

    it('should set isOpen state', () => {
        useWishlistStore.getState().setIsOpen(true);
        expect(useWishlistStore.getState().isOpen).toBe(true);
        useWishlistStore.getState().setIsOpen(false);
        expect(useWishlistStore.getState().isOpen).toBe(false);
    });

    it('should handle multiple items', () => {
        const store = useWishlistStore.getState();
        store.toggleItem('p1');
        store.toggleItem('p2');
        store.toggleItem('p3');
        expect(useWishlistStore.getState().items).toHaveLength(3);
        store.toggleItem('p2');
        expect(useWishlistStore.getState().items).toEqual(['p1', 'p3']);
    });
});
