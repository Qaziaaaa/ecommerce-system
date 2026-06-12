import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Loader2, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../api/axios';
import SEOMeta from '../components/SEOMeta';

function SkeletonCard() {
  return (
    <div className="border border-[#2D2926] flex flex-col bg-[#EBE7E0] h-full animate-pulse">
      <div className="bg-[#2D2926]/60 p-5 h-24 shrink-0">
        <div className="h-3 w-24 bg-[#EBE7E0]/30 rounded" />
      </div>
      <div className="aspect-square w-full bg-white/40 flex items-center justify-center border-b border-[#2D2926] shrink-0">
        <div className="w-16 h-16 bg-[#2D2926]/10 rounded-full" />
      </div>
      <div className="p-6 flex flex-col gap-4 flex-1">
        <div className="space-y-2">
          <div className="h-4 w-3/4 bg-[#2D2926]/10 rounded" />
          <div className="h-3 w-1/4 bg-[#2D2926]/5 rounded" />
        </div>
        <div className="h-3 w-1/3 bg-[#2D2926]/5 rounded" />
        <div className="space-y-1.5 mt-auto">
          <div className="h-2 w-full bg-[#2D2926]/5 rounded" />
          <div className="h-2 w-2/3 bg-[#2D2926]/5 rounded" />
        </div>
        <div className="h-10 w-full bg-[#2D2926]/10 rounded mt-auto" />
      </div>
    </div>
  );
}

const SKELETON_COUNT = 8;

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const category = searchParams.get('category') || 'all';
  const sort = searchParams.get('sort') || 'newest';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const search = searchParams.get('search') || '';

  const [searchInput, setSearchInput] = useState(search);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        updateParams({ search: searchInput, page: '1' });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

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

  const queryParams = useMemo(() => ({
    page: page.toString(),
    limit: '12',
    sort,
    ...(category !== 'all' && { category }),
    ...(minPrice && { minPrice }),
    ...(maxPrice && { maxPrice }),
    ...(search && { search }),
  }), [page, category, sort, minPrice, maxPrice, search]);

  const { data, isLoading, isPlaceholderData, isFetching } = useQuery({
    queryKey: ['products', page, category, sort, minPrice, maxPrice, search],
    queryFn: async () => {
      const params = new URLSearchParams(queryParams);
      const { data } = await axiosInstance.get(`/products?${params.toString()}`);
      return data.data;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await axiosInstance.get('/categories');
      return data.data.categories;
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });

  const products = data?.products || [];
  const pagination = data?.pagination || { totalPages: 1 };
  const showSkeleton = isLoading && products.length === 0;
  const showContent = !isLoading && products.length > 0;
  const showEmpty = !isLoading && products.length === 0;

  return (
    <div className="py-12 sm:py-16 lg:py-20 px-4 sm:px-8 lg:px-12 bg-[#EBE7E0] min-h-screen">
      <SEOMeta title="Shop" />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl tracking-tighter mb-6 uppercase">The Collection</h1>
          <p className="text-[10px] font-bold tracking-[0.4em] uppercase opacity-40 max-w-xl mx-auto px-4">
            Engineered for longevity. Tailored for the modern lifestyle.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-center gap-6 lg:gap-8 mb-12 border-y border-[#2D2926]/10 py-10 lg:py-8 px-2">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full lg:w-auto">
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

        {isFilterOpen && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 p-5 sm:p-8 bg-white shadow-2xl border border-[#2D2926]/5 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="space-y-6">
                    <h3 className="text-[10px] font-bold tracking-[0.4em] uppercase opacity-40 pb-4 border-b border-[#2D2926]/5">CATEGORIES</h3>
                    <div className="flex flex-wrap gap-2">
                        {['all', ...(Array.isArray(categoriesData) ? categoriesData.map((c: any) => c.slug) : [])].map((slug) => (
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

        <div className={`transition-opacity duration-300 ${isPlaceholderData ? 'opacity-50' : 'opacity-100'}`}>
          {showSkeleton ? (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-2 text-[9px] font-bold tracking-[0.3em] uppercase opacity-30 animate-pulse mb-4">
                <Loader2 className="animate-spin" size={12} />
                Loading Collection...
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
                {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </div>
          ) : showEmpty ? (
            <div className="text-center py-20 border-y border-[#2D2926]/5">
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
            <>
              {isFetching && !isPlaceholderData && (
                <div className="flex items-center justify-center gap-2 text-[9px] font-bold tracking-[0.3em] uppercase opacity-30 animate-pulse mb-4">
                  <Loader2 className="animate-spin" size={12} />
                  Updating...
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
                {(Array.isArray(products) ? products : []).map((product: any) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            </>
          )}
        </div>

        {!isLoading && pagination.totalPages > 1 && (
          <div className="mt-16 sm:mt-32 flex flex-col items-center gap-6 border-t border-[#2D2926]/5 pt-12 sm:pt-20">
            <div className="flex items-center gap-4 sm:gap-10">
              <button
                disabled={page === 1}
                onClick={() => updateParams({ page: (page - 1).toString() })}
                className="p-4 border border-[#2D2926] hover:bg-[#2D2926] hover:text-white disabled:opacity-10 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-4">
                {[...Array(Math.min(pagination.totalPages, 10))].map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => updateParams({ page: pageNum.toString() })}
                      className={`w-10 h-10 text-[10px] font-bold tracking-widest transition-all ${page === pageNum ? 'bg-[#2D2926] text-white shadow-lg' : 'hover:bg-[#2D2926]/5 opacity-40 hover:opacity-100'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {pagination.totalPages > 10 && (
                  <span className="text-[10px] font-bold tracking-widest opacity-30">...</span>
                )}
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
