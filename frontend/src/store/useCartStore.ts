import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface Product {
    _id: string; // Updated to match MongoDB ObjectId
    id: number;  // Legacy ID Support
    name: string;
    description: string;
    price: number;
    category: string;
    images: string[];
    img?: string; // Legacy field support
    stock: number;
}

export type CartItem = Product & { quantity: number };

interface CartState {
    cart: CartItem[];
    isCartOpen: boolean;
    setIsCartOpen: (isOpen: boolean) => void;
    addToCart: (product: Product) => void;
    updateQuantity: (id: string | number, delta: number) => void;
    removeFromCart: (id: string | number) => void;
    clearCart: () => void;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            cart: [],
            isCartOpen: false,
            setIsCartOpen: (isOpen) => set({ isCartOpen: isOpen }),
            
            addToCart: (product) => {
                const { cart } = get();
                const id = product._id || product.id;
                const existing = cart.find(item => (item._id === id || item.id === id));
                
                let newCart;
                if (existing) {
                    newCart = cart.map(item => 
                        (item._id === id || item.id === id) 
                            ? { ...item, quantity: item.quantity + 1 } 
                            : item
                    );
                } else {
                    // Normalize ID to ensure item.id always exists for the UI
                    newCart = [...cart, { ...product, id: id, quantity: 1 }];
                }
                
                set({ cart: newCart, isCartOpen: true });
            },

            updateQuantity: (id, delta) => {
                const { cart } = get();
                const newCart = cart.map(item => {
                    const itemId = item._id || item.id;
                    if (itemId === id) {
                        const newQ = item.quantity + delta;
                        return newQ > 0 ? { ...item, quantity: newQ } : item;
                    }
                    return item;
                });
                set({ cart: newCart });
            },

            removeFromCart: (id) => {
                const { cart } = get();
                set({ cart: cart.filter(item => {
                    const itemId = item._id || item.id;
                    return itemId !== id;
                }) });
            },

            clearCart: () => set({ cart: [] })
        }),
        {
            name: 'nova-cart-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

// Combined helper/compatibility hook
export const useCart = () => {
    const store = useCartStore();
    const cartTotal = store.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const cartCount = store.cart.reduce((sum, item) => sum + item.quantity, 0);
    
    return {
        ...store,
        cartTotal,
        cartCount
    };
};
