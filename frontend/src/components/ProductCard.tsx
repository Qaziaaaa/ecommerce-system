import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, AlertCircle } from 'lucide-react';
import { Product } from '../data/products';
import { useCart } from '../store/useCartStore';

interface ProductCardProps {
  product: Product;
  searchQuery?: string;
}

const highlightText = (text: string, highlight?: string) => {
  if (!highlight || !highlight.trim()) {
    return text;
  }
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} className="bg-[#2D2926] text-[#EBE7E0] px-1 rounded-sm">{part}</span>
        ) : (
          part
        )
      )}
    </span>
  );
};

export const ProductCard: React.FC<{ product: any; searchQuery?: string }> = ({ product, searchQuery }) => {
  const { addToCart } = useCart();

  return (
    <div className="border border-[#2D2926] flex flex-col group bg-[#EBE7E0] relative h-full hover:-translate-y-2 hover:shadow-2xl transition-all duration-500 ease-out transform-gpu">
      <div className="bg-[#2D2926] text-[#EBE7E0] p-5 flex justify-between items-start h-24 shrink-0">
        <span className="text-[10px] font-bold tracking-[0.2em] uppercase max-w-[60%] leading-relaxed">{product.isFeatured ? 'BEST SELLER' : 'ESSENTIAL'}</span>
        <Link to={`/product/${product._id}`} className="w-7 h-7 rounded-full border border-[#EBE7E0] flex items-center justify-center group-hover:bg-[#EBE7E0] group-hover:text-[#2D2926] transition-colors cursor-pointer duration-300 ease-out">
          <ArrowRight size={14} />
        </Link>
      </div>
      <div className="aspect-square w-full bg-white/40 flex items-center justify-center border-b border-[#2D2926] relative overflow-hidden cursor-pointer shrink-0">
        <img 
          src={product.images?.[0] || '/placeholder.png'} 
          alt={product.name || 'Product Image'} 
          loading="lazy" 
          decoding="async"
          className="w-full h-full object-cover mix-blend-multiply group-hover:scale-110 transition-transform duration-700 ease-out transform-gpu" 
          referrerPolicy="no-referrer" 
        />
        
        {/* View Details Overlay */}
        <div className="absolute inset-0 bg-[#2D2926]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center duration-300 ease-out">
          <Link 
            to={`/product/${product._id}`}
            className="bg-[#EBE7E0] text-[#2D2926] px-8 py-3 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926] hover:text-[#EBE7E0] transition-all flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 duration-300 shadow-xl ease-out transform-gpu"
          >
            View Details
          </Link>
        </div>
      </div>
      <div className="p-6 flex flex-col gap-4 flex-1">
        <div className="flex justify-between items-start gap-4">
          <Link to={`/product/${product._id}`} className="font-display text-2xl tracking-wide leading-none hover:opacity-70 transition-opacity line-clamp-2 duration-300 ease-out">
            {highlightText(product.name, searchQuery)}
          </Link>
          <span className="text-sm font-bold shrink-0 mt-1">${product.price?.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1 -mt-2">
          <Star size={12} className="fill-amber-400 text-amber-400" />
          <span className="text-xs font-bold">{product.ratingsAverage || '5.0'}</span>
          <span className="text-[10px] opacity-50">({product.ratingsCount || 0})</span>
        </div>
        
        {product.stock <= 10 && product.stock > 0 && (
          <div className="flex items-center gap-1 text-[#2D2926] font-bold text-[10px] tracking-wider uppercase mt-1">
            <AlertCircle size={12} />
            <span className="text-red-600">Only {product.stock} left</span>
          </div>
        )}
        {product.stock === 0 && (
          <div className="flex items-center gap-1 text-red-600 font-bold text-[10px] tracking-wider uppercase mt-1">
            <AlertCircle size={12} />
            <span>Out of Stock</span>
          </div>
        )}
        
        <p className="text-xs opacity-70 line-clamp-2 leading-relaxed">
          {highlightText(product.description, searchQuery)}
        </p>
        <button 
          onClick={(e) => {
            e.preventDefault(); // prevent triggering the link overlay if overlapping
            addToCart(product);
          }}
          disabled={product.stock === 0}
          className="mt-auto w-full bg-[#2D2926] text-[#EBE7E0] py-3 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926]/90 transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#2D2926] focus:ring-offset-2 focus:ring-offset-[#EBE7E0] duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={`Add ${product.name} to cart`}
        >
          {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
};
