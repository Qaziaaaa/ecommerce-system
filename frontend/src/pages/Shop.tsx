import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Loader2, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../api/axios';

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // URL Params State
  const page = parseInt(searchParams.get('page') || '1', 10);
  const category = searchParams.get('category') || 'all';
  const sort = searchParams.get('sort') || 'newest';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const search = searchParams.get('search') || '';

  // Local UI State
  const [searchInput, setSearchInput] = useState(search);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        updateParams({ search: searchInput, page: '1' });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Sync search input with URL when navigating back/forward
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  /**
   * Helper to update URL parameters
   */
  const updateParams = (updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams);
  };

  /**
   * Fetch Products with advanced filtering
   */
  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['products', page, category, sort, minPrice, maxPrice, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        sort,
        ...(category !== 'all' && { category }),
        ...(minPrice && { minPrice }),
        ...(maxPrice && { maxPrice }),
        ...(search && { search })
      });
      const { data } = await axiosInstance.get(`/products?${params.toString()}`);
      return data.data;
    },
    placeholderData: (previousData) => previousData,
    // Refresh stock data every 60 seconds and when user returns to tab
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/categories');
      return data.data;
    }
  });

  const products = data?.products || [];
  const pagination = data?.pagination || { totalPages: 1 };

  return (
    <div className="py-20 px-12 bg-[#EBE7E0] min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="font-display text-5xl lg:text-7xl tracking-tighter mb-6 uppercase">The Collection</h1>
          <p className="text-[10px] font-bold tracking-[0.4em] uppercase opacity-40 max-w-xl mx-auto px-4">
            Engineered for longevity. Tailored for the modern lifestyle.
          </p>
        </div>

        {/* --- Toolbar --- */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6 lg:gap-8 mb-12 border-y border-[#2D2926]/10 py-10 lg:py-8 px-2">
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full lg:w-auto">
            {/* Search */}
            <div className="relative group w-full sm:min-w-[280px] lg:flex-none">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2D2926]/40" />
              <input 
                type="text" 
                placeholder="SEARCH COLLECTION..." 
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-white/50 border border-[#2D2926]/10 px-10 py-5 lg:py-4 text-[10px] font-bold tracking-widest focus:outline-none focus:bg-white focus:border-[#2D2926] transition-all duration-500"
              />
            </div>

            <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-5 lg:py-4 border text-[10px] font-bold tracking-[0.2em] transition-all duration-300 ${isFilterOpen ? 'bg-[#2D2926] text-white' : 'bg-transparent border-[#2D2926] hover:bg-[#2D2926] hover:text-white'}`}
            >
                <SlidersHorizontal size={14} />
                {isFilterOpen ? 'CLOSE FILTERS' : 'ADVANCED FILTERS'}
            </button>
          </div>

          <div className="flex items-center justify-center lg:justify-end gap-4 w-full lg:w-auto mt-4 lg:mt-0 pt-6 lg:pt-0 border-t lg:border-none border-[#2D2926]/5">
            <span className="text-[10px] font-bold tracking-[0.2em] opacity-40 uppercase">Sort By:</span>
            <select 
              value={sort}
              onChange={(e) => updateParams({ sort: e.target.value, page: '1' })}
              className="bg-transparent border-b border-[#2D2926]/10 text-[10px] font-bold tracking-[0.2em] uppercase py-2 focus:outline-none cursor-pointer hover:border-[#2D2926] transition-colors"
            >
              <option value="newest">Newest Arrivals</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Alphabetical: A-Z</option>
            </select>
          </div>
        </div>

        {/* --- Advanced Filter Sidebar/Panel --- */}
        {isFilterOpen && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12 p-10 bg-white shadow-2xl border border-[#2D2926]/5 animate-in fade-in slide-in-from-top-4 duration-500">
                
                {/* Categories */}
                <div className="space-y-6">
                    <h3 className="text-[10px] font-bold tracking-[0.4em] uppercase opacity-40 pb-4 border-b border-[#2D2926]/5">CATEGORIES</h3>
                    <div className="flex flex-wrap gap-2">
                        {['all', ...(Array.isArray(categoriesData) ? categoriesData.map((c: any) => c.slug) : (categoriesData?.categories ? categoriesData.categories.map((c: any) => c.slug) : []))].map((slug) => (
                            <button
                                key={slug}
                                onClick={() => updateParams({ category: slug, page: '1' })}
                                className={`px-4 py-2 text-[9px] font-bold tracking-widest uppercase transition-all duration-300 ${category === slug ? 'bg-[#2D2926] text-white' : 'bg-[#EBE7E0] hover:bg-[#2D2926]/10 text-[#2D2926]'}`}
                            >
                                {slug.replace(/-/g, ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Price Range */}
                <div className="space-y-6">
                    <h3 className="text-[10px] font-bold tracking-[0.4em] uppercase opacity-40 pb-4 border-b border-[#2D2926]/5">PRICE RANGE</h3>
                    <div className="flex items-center gap-4">
                        <input 
                            placeholder="MIN" 
                            type="number"
                            value={minPrice}
                            onChange={(e) => updateParams({ minPrice: e.target.value, page: '1' })}
                            className="w-full bg-[#EBE7E0]/50 border-b border-[#2D2926]/10 px-4 py-3 text-[10px] font-bold focus:outline-none focus:border-[#2D2926]"
                        />
                        <span className="opacity-20">—</span>
                        <input 
                            placeholder="MAX" 
                            type="number"
                            value={maxPrice}
                            onChange={(e) => updateParams({ maxPrice: e.target.value, page: '1' })}
                            className="w-full bg-[#EBE7E0]/50 border-b border-[#2D2926]/10 px-4 py-3 text-[10px] font-bold focus:outline-none focus:border-[#2D2926]"
                        />
                    </div>
                    <div className="flex gap-2">
                        {[50, 100, 500].map(val => (
                            <button 
                                key={val}
                                onClick={() => updateParams({ maxPrice: val.toString(), page: '1' })}
                                className="text-[9px] font-bold tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                            >
                                UNDER ${val}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Status/Clear */}
                <div className="flex flex-col justify-end gap-4">
                    <button 
                        onClick={() => updateParams({ category: 'all', minPrice: '', maxPrice: '', search: '', sort: 'newest', page: '1' })}
                        className="w-full border border-[#2D2926]/20 py-4 text-[10px] font-bold tracking-[0.2em] hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all uppercase"
                    >
                        RESTORE DEFAULTS
                    </button>
                </div>
            </div>
        )}

        {/* --- Product Grid --- */}
        <div className={`transition-opacity duration-300 ${isPlaceholderData ? 'opacity-50' : 'opacity-100'}`}>
            {isLoading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-6">
                <Loader2 className="animate-spin text-[#2D2926]" size={40} strokeWidth={1} />
                <p className="text-[9px] font-bold tracking-[0.4em] uppercase opacity-30 animate-pulse">Syncing Inventory...</p>
            </div>
            ) : products.length === 0 ? (
            <div className="text-center py-40 border-y border-[#2D2926]/5">
                <p className="text-xl font-display opacity-40 uppercase tracking-widest mb-8">
                No products found matching your current filters.
                </p>
                <button 
                onClick={() => updateParams({ category: 'all', minPrice: '', maxPrice: '', search: '', page: '1' })}
                className="bg-[#2D2926] text-white px-12 py-5 text-[10px] font-bold tracking-[0.3em] uppercase hover:opacity-90 transition-all shadow-xl"
                >
                CLEAR ALL FILTERS
                </button>
            </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
                {(Array.isArray(products) ? products : []).map((product: any) => (
                    <ProductCard key={product._id} product={product} />
                ))}
            </div>
            )}
        </div>

        {/* --- Pagination --- */}
        {!isLoading && pagination.totalPages > 1 && (
            <div className="mt-32 flex flex-col items-center gap-8 border-t border-[#2D2926]/5 pt-20">
                <div className="flex items-center gap-10">
                    <button 
                        disabled={page === 1}
                        onClick={() => updateParams({ page: (page - 1).toString() })}
                        className="p-4 border border-[#2D2926] hover:bg-[#2D2926] hover:text-white disabled:opacity-10 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    <div className="flex items-center gap-4">
                        {[...Array(pagination.totalPages)].map((_, i) => (
                            <button
                                key={i + 1}
                                onClick={() => updateParams({ page: (i + 1).toString() })}
                                className={`w-10 h-10 text-[10px] font-bold tracking-widest transition-all ${page === i + 1 ? 'bg-[#2D2926] text-white shadow-lg' : 'hover:bg-[#2D2926]/5 opacity-40 hover:opacity-100'}`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>

                    <button 
                        disabled={page === pagination.totalPages}
                        onClick={() => updateParams({ page: (page + 1).toString() })}
                        className="p-4 border border-[#2D2926] hover:bg-[#2D2926] hover:text-white disabled:opacity-10 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
                <p className="text-[8px] font-bold tracking-[0.5em] uppercase opacity-30">
                    Showing Page {page} of {pagination.totalPages}
                </p>
            </div>
        )}
      </div>
    </div>
  );
}
