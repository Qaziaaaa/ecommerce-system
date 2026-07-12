import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { useWishlistStore } from '../store/useWishlistStore';
import { useCart } from '../store/useCartStore';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../api/axios';
import SEOMeta from '../components/SEOMeta';
import LazyImage from '../components/LazyImage';

export default function Wishlist() {
  const { items, toggleItem } = useWishlistStore();
  const { addToCart } = useCart();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['wishlist-products', items],
    queryFn: async () => {
      if (items.length === 0) return [];
      const ids = items.join(',');
      const { data } = await axiosInstance.get(`/products?ids=${ids}&limit=50`);
      return data.data.products || data.data || [];
    },
    enabled: items.length > 0,
  });

  return (
    <div className="py-10 sm:py-16 lg:py-20 px-4 sm:px-8 lg:px-12 bg-[#EBE7E0] min-h-screen">
      <SEOMeta title="Wishlist" />
      <div className="max-w-6xl mx-auto">
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-wide mb-10 sm:mb-16 text-center">MY WISHLIST</h1>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Heart size={48} className="opacity-20 mb-6" />
            <p className="text-sm font-medium opacity-50 mb-8">Your wishlist is empty.</p>
            <Link to="/shop" className="bg-[#2D2926] text-[#EBE7E0] px-12 py-4 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926]/90 transition-colors shadow-lg">
              Browse Products
            </Link>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 size={24} className="animate-spin text-[#2D2926]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
            {(Array.isArray(products) ? products : []).map((product: any) => (
              <div key={product._id} className="border border-[#2D2926] bg-white group relative flex flex-col">
                <button
                  onClick={() => toggleItem(product._id)}
                  className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 border border-[#2D2926]/20 flex items-center justify-center hover:bg-red-50 transition-colors"
                  aria-label={`Remove ${product.name} from wishlist`}
                >
                  <Trash2 size={14} className="text-red-500" />
                </button>
                <Link to={`/product/${product._id}`} className="aspect-square bg-white/40 flex items-center justify-center overflow-hidden">
                  <LazyImage
                    src={product.images?.[0] || '/placeholder.png'}
                    alt={product.name}
                    className="w-full h-full object-cover mix-blend-multiply group-hover:scale-110 transition-transform duration-700"
                  />
                </Link>
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <Link to={`/product/${product._id}`} className="font-display text-xl tracking-wide leading-none hover:opacity-70 transition-opacity">
                    {product.name}
                  </Link>
                  <span className="text-sm font-bold">${product.price?.toFixed(2)}</span>
                  <button
                    onClick={() => addToCart(product)}
                    disabled={product.stock === 0}
                    className="mt-auto w-full bg-[#2D2926] text-[#EBE7E0] py-3 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926]/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <ShoppingBag size={14} />
                    {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
