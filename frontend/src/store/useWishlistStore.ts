import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistState {
  items: string[];
  isOpen: boolean;
  toggleItem: (productId: string) => void;
  setItems: (ids: string[]) => void;
  clearWishlist: () => void;
  setIsOpen: (open: boolean) => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      toggleItem: (productId) => {
        const exists = get().items.includes(productId);
        set({
          items: exists
            ? get().items.filter(id => id !== productId)
            : [...get().items, productId]
        });
      },
      setItems: (ids) => set({ items: ids }),
      clearWishlist: () => set({ items: [] }),
      setIsOpen: (open) => set({ isOpen: open }),
    }),
    { name: 'nova-wishlist-storage' }
  )
);
