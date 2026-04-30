import React, { useState } from 'react';
import { ArrowLeft, Minus, Plus, ShoppingBag, Loader2, Star, User, AlertCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useCart } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../api/axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

export default function ProductDetail() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  
  const [quantity, setQuantity] = useState(1);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
        const { data } = await axiosInstance.get(`/products/${id}`);
        return data.data.product;
    },
    // Always get fresh stock data on product detail page
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: reviews = [], isLoading: isLoadingReviews } = useQuery({
    queryKey: ['reviews', id],
    queryFn: async () => {
        const { data } = await axiosInstance.get(`/products/${id}/reviews`);
        return data.data.reviews;
    }
  });

  const submitReviewMutation = useMutation({
    mutationFn: async (reviewData: { rating: number, comment: string }) => {
        const { data } = await axiosInstance.post(`/products/${id}/reviews`, reviewData);
        return data;
    },
    onSuccess: () => {
        toast.success('Review submitted successfully!');
        setComment('');
        queryClient.invalidateQueries({ queryKey: ['reviews', id] });
        queryClient.invalidateQueries({ queryKey: ['product', id] });
    },
    onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to submit review');
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-[#EBE7E0] gap-4">
        <Loader2 className="animate-spin text-[#2D2926]" size={32} />
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50">Loading Product...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-[#EBE7E0]">
        <h1 className="font-display text-4xl mb-4">Product Not Found</h1>
        <Link to="/shop" className="border border-[#2D2926] px-8 py-3 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926] hover:text-[#EBE7E0] transition-colors duration-300 ease-in-out">
          Return to Shop
        </Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    const cartItem = {
        ...product,
        id: product._id,
        img: product.images?.[0] || '/placeholder.png'
    };
    addToCart(cartItem, quantity);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    submitReviewMutation.mutate({ rating, comment });
  };

  return (
    <div className="py-10 sm:py-16 lg:py-20 px-4 sm:px-8 lg:px-12 bg-[#EBE7E0] min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] uppercase mb-8 sm:mb-12 opacity-70 overflow-x-auto whitespace-nowrap pb-1">
          <Link to="/" className="hover:opacity-100 transition-opacity shrink-0">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:opacity-100 transition-opacity shrink-0">Shop</Link>
          <span>/</span>
          <Link to={`/shop?category=${encodeURIComponent(product.category?.name || 'All')}`} className="hover:opacity-100 transition-opacity shrink-0">
            {product.category?.name || 'Category'}
          </Link>
          <span>/</span>
          <span className="opacity-50 truncate">{product.name}</span>
        </nav>

        {/* Product Details Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 mb-12 lg:mb-24">
          {/* Product Gallery */}
          <div className="flex flex-col gap-6">
            {/* Main Image Container */}
            <div className="relative group overflow-hidden border border-[#2D2926]/10 bg-white aspect-square shadow-2xl flex items-center justify-center p-8 lg:p-16">
              {/* Glassmorphic Background Accent */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none z-10" />
              
              <AnimatePresence mode="wait">
                <motion.img
                  key={selectedImage}
                  initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                  transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
                  src={product.images?.[selectedImage] || '/placeholder.png'}
                  alt={product.name}
                  className="w-full h-full object-contain mix-blend-multiply relative z-0"
                  referrerPolicy="no-referrer"
                />
              </AnimatePresence>

              {/* Decorative Elements */}
              <div className="absolute top-4 right-4 text-[8px] font-bold tracking-widest uppercase opacity-20 z-20">
                Premium Series // {product.brand || 'NOVA'}
              </div>
            </div>

            {/* Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {product.images.map((img: string, index: number) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedImage(index)}
                    className={`relative aspect-square border overflow-hidden transition-all duration-300 ${
                      selectedImage === index 
                        ? 'border-[#2D2926] ring-2 ring-[#2D2926]/10 py-2' 
                        : 'border-[#2D2926]/10 opacity-60 hover:opacity-100 bg-white'
                    }`}
                  >
                    <img 
                      src={img} 
                      alt={`${product.name} view ${index + 1}`} 
                      className="w-full h-full object-cover mix-blend-multiply" 
                    />
                    {selectedImage === index && (
                      <motion.div 
                        layoutId="activeThumb"
                        className="absolute inset-0 border-2 border-[#2D2926] z-10"
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col justify-center">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase px-3 py-1 bg-[#2D2926] text-[#EBE7E0]">
                {product.category?.name || 'Lifestyle'}
              </span>
              <div className="flex items-center gap-1">
                <Star size={16} className="fill-amber-400 text-amber-400" />
                <span className="text-sm font-bold ml-1">{product.ratingsAverage || '5.0'}</span>
                <span className="text-xs opacity-50 ml-1">({product.ratingsCount || 0} reviews)</span>
              </div>
            </div>
            
            <h1 className="font-display text-3xl sm:text-4xl lg:text-6xl tracking-wide mb-4">{product.name}</h1>
            
            <div className="flex flex-col items-start gap-4 mb-8">
                {product.discountPrice ? (
                    <>
                        <p className="text-2xl font-bold">${product.discountPrice.toFixed(2)}</p>
                        <p className="text-base line-through opacity-50">${product.price.toFixed(2)}</p>
                    </>
                ) : (
                    <p className="text-2xl font-bold">${product.price.toFixed(2)}</p>
                )}
                {product.stock <= 10 && product.stock > 0 && (
                  <div className="bg-[#2D2926] text-[#EBE7E0] px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 animate-pulse">
                    <AlertCircle size={14} />
                    Only {product.stock} left in stock - order soon!
                  </div>
                )}
                {product.stock === 0 && (
                  <div className="bg-red-900 text-[#EBE7E0] px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle size={14} />
                    Out of Stock
                  </div>
                )}
            </div>
            
            <p className="text-sm leading-relaxed opacity-80 mb-12 border-t border-b border-[#2D2926]/10 py-8">
              {product.description}
            </p>

            <div className="flex items-center gap-6 mb-8">
              <div className="flex items-center border border-[#2D2926] bg-white h-12">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                  className="px-4 h-full hover:bg-[#2D2926] hover:text-[#EBE7E0] transition-colors duration-300 ease-in-out"
                >
                  <Minus size={14} />
                </button>
                <span className="w-12 text-center text-sm font-bold">{quantity}</span>
                <button 
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  disabled={quantity >= product.stock}
                  className="px-4 h-full hover:bg-[#2D2926] hover:text-[#EBE7E0] transition-colors duration-300 ease-in-out disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Plus size={14} />
                </button>
              </div>
              
              <button 
                onClick={handleAddToCart}
                disabled={product.stock === 0 || quantity > product.stock}
                className="flex-1 bg-[#2D2926] text-[#EBE7E0] h-12 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926]/90 transition-colors flex items-center justify-center gap-2 duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingBag size={16} /> {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>
            
            <div className="text-xs opacity-60 space-y-2">
              <p><strong>SKU:</strong> NOVA-{product._id.toString().slice(-4).toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="border-t border-[#2D2926]/20 pt-16">
            <h2 className="font-display text-2xl sm:text-4xl mb-8 sm:mb-12">Customer Reviews</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-16">
                
                {/* Review Form */}
                <div className="md:col-span-5 border border-[#2D2926] bg-white p-8 self-start">
                    <h3 className="font-display text-xl mb-6 truncate border-b border-[#2D2926]/10 pb-4">Review this Product</h3>
                    {isAuthenticated ? (
                        <form onSubmit={handleReviewSubmit} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-bold tracking-[0.2em] uppercase mb-4 opacity-70">Rating</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button 
                                            key={star} 
                                            type="button" 
                                            onClick={() => setRating(star)}
                                            className="focus:outline-none transition-transform hover:scale-110"
                                        >
                                            <Star size={24} className={rating >= star ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold tracking-[0.2em] uppercase mb-2 opacity-70">Your Review</label>
                                <textarea 
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    rows={4}
                                    className="w-full p-4 bg-[#EBE7E0]/30 border border-[#2D2926]/20 focus:outline-none focus:border-[#2D2926] text-sm resize-none"
                                    placeholder="What did you think about this product?"
                                    required
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={submitReviewMutation.isPending || !comment.trim()}
                                className="w-full bg-[#2D2926] text-[#EBE7E0] py-4 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926]/90 transition-colors flex items-center justify-center gap-2 duration-300 ease-in-out disabled:opacity-50"
                            >
                                {submitReviewMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Submit Review'}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center py-8 bg-[#EBE7E0]/50 border border-[#2D2926] p-6">
                            <p className="text-sm font-bold mb-4 opacity-70">Log in to review this product</p>
                            <Link to="/login" className="inline-block border border-[#2D2926] px-8 py-3 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926] hover:text-[#EBE7E0] transition-colors duration-300 ease-in-out">
                                Sign In
                            </Link>
                        </div>
                    )}
                </div>

                {/* Reviews List */}
                <div className="md:col-span-7 space-y-8">
                    {isLoadingReviews ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="animate-spin text-[#2D2926]" size={24} />
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="text-center py-16 border border-[#2D2926]/10 bg-white shadow-sm">
                            <Star size={32} className="text-gray-300 mx-auto mb-4" />
                            <p className="text-sm font-bold opacity-50">No reviews yet. Be the first to share your thoughts!</p>
                        </div>
                    ) : (
                        reviews.map((review: any) => (
                            <div key={review._id} className="border-b border-[#2D2926]/10 pb-8 hover:bg-white/40 p-6 -mx-6 transition-colors">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-10 h-10 bg-[#2D2926] text-[#EBE7E0] flex items-center justify-center text-sm font-bold shrink-0">
                                        <User size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold tracking-wide">{review.user?.name || 'Anonymous'}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="flex">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star key={star} size={10} className={review.rating >= star ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
                                                ))}
                                            </div>
                                            <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest">
                                                {new Date(review.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm leading-relaxed opacity-80 italic">"{review.comment}"</p>
                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>

      </div>
    </div>
  );
}
