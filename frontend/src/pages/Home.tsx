import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, Shield, RefreshCw, Clock, Star, Loader2 } from 'lucide-react';
import { useCart } from '../store/useCartStore';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../api/axios';
import { ProductCard } from '../components/ProductCard';
import LazyImage from '../components/LazyImage';

export default function Home() {
  const { addToCart } = useCart();
  
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products-home'],
    queryFn: async () => {
        const { data } = await axiosInstance.get('/products?limit=8');
        return data.data.products;
    }
  });

  const trendingProducts = products.slice(0, 4);
  const newArrivals = products.slice(4, 8);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#EBE7E0] gap-4">
        <Loader2 className="animate-spin text-[#2D2926]" size={32} />
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50">Curating Experience...</p>
      </div>
    );
  }

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen lg:min-h-[calc(100vh-85px)] flex flex-col overflow-hidden">
        {/* Background Split - Responsive Adaptation */}
        <div className="absolute inset-0 flex pointer-events-none">
          <div className="w-full lg:w-[70%] bg-[#EBE7E0]"></div>
          <div className="w-0 lg:w-[30%] bg-[#2D2926]"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col lg:flex-row pt-12 lg:pt-0">
          <div className="w-full lg:w-[70%] flex flex-col justify-center px-6 lg:px-12 py-20 lg:py-0 text-center lg:text-left">
            <div className="flex flex-col">
              <div className="flex flex-col lg:flex-row items-center lg:items-end gap-4 lg:gap-8 mb-2">
                <h1 className="font-display text-[15vw] lg:text-[7vw] leading-none tracking-tight text-[#2D2926]">
                  MODERN
                </h1>
                <p className="text-[10px] lg:text-sm font-medium max-w-[280px] lg:max-w-[200px] leading-relaxed lg:pb-4 opacity-60">
                  Elevate your everyday with our curated collection of premium lifestyle goods.
                </p>
              </div>
              <h1 className="font-display text-[15vw] lg:text-[7vw] leading-none tracking-tight text-[#2D2926]">
                ESSENTIALS
              </h1>
            </div>
            
            <div className="mt-12 lg:mt-16 flex flex-col sm:flex-row justify-center lg:justify-start gap-4 lg:gap-6">
              <Link to="/shop" className="bg-[#2D2926] text-[#EBE7E0] px-12 py-5 lg:py-4 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926]/90 transition-all flex items-center justify-center gap-2">
                Shop Collection <ArrowRight size={14} />
              </Link>
              <Link to="/about" className="border border-[#2D2926] text-[#2D2926] px-12 py-5 lg:py-4 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926] hover:text-[#EBE7E0] transition-colors">
                Our Story
              </Link>
            </div>
          </div>
          
          {/* Image Background Section - Using Theme Dark Color (#2D2926) */}
          <div className="w-full lg:w-[30%] h-[500px] lg:h-full relative overflow-hidden bg-[#2D2926] lg:bg-transparent">
          </div>
        </div>

        {/* Hero Image - Maximum scale and full-height integration */}
        <div className="absolute bottom-0 left-1/2 lg:left-[70%] -translate-x-1/2 h-[500px] lg:h-[100%] z-20 pointer-events-none flex items-end">
          <img 
            src="/hero.png" 
            alt="Hero Model" 
            className="h-full object-contain object-bottom drop-shadow-2xl scale-[1.8] lg:scale-[1.6] origin-bottom transform-gpu"
            referrerPolicy="no-referrer"
            fetchPriority="high"
            decoding="async"
          />
        </div>
      </section>

      {/* Features Banner */}
      <section className="border-y border-[#2D2926]/20 bg-[#EBE7E0] py-12 lg:py-8 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-12 sm:gap-8 lg:divide-x lg:divide-[#2D2926]/10">
          <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left gap-4 px-4">
            <Truck className="text-[#2D2926] w-6 h-6" strokeWidth={1.5} />
            <div>
              <h4 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1">Free Shipping</h4>
              <p className="text-[10px] lg:text-xs opacity-60">On orders over $150</p>
            </div>
          </div>
          <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left gap-4 px-4">
            <RefreshCw className="text-[#2D2926] w-6 h-6" strokeWidth={1.5} />
            <div>
              <h4 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1">Easy Returns</h4>
              <p className="text-[10px] lg:text-xs opacity-60">30-day return policy</p>
            </div>
          </div>
          <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left gap-4 px-4">
            <Shield className="text-[#2D2926] w-6 h-6" strokeWidth={1.5} />
            <div>
              <h4 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1">Secure Checkout</h4>
              <p className="text-[10px] lg:text-xs opacity-60">100% protected payments</p>
            </div>
          </div>
          <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left gap-4 px-4">
            <Clock className="text-[#2D2926] w-6 h-6" strokeWidth={1.5} />
            <div>
              <h4 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1">24/7 Support</h4>
              <p className="text-[10px] lg:text-xs opacity-60">Dedicated customer care</p>
            </div>
          </div>
        </div>
      </section>

      {/* Shop by Category */}
      <section className="py-20 lg:py-24 px-6 lg:px-12 bg-[#EBE7E0]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-12">
            <h2 className="font-display text-3xl lg:text-4xl tracking-wide uppercase">SHOP BY CATEGORY</h2>
            <Link to="/shop" className="text-[10px] font-bold tracking-[0.2em] uppercase hover:opacity-70 flex items-center gap-2 transition-opacity">
              All Categories <ArrowRight size={14}/>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link to="/shop" className="group relative h-[350px] lg:h-[400px] overflow-hidden bg-[#2D2926]">
              <LazyImage src="https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=800&auto=format&fit=crop" alt="Tech" placeholder="skeleton" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700 ease-out" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-[#EBE7E0]/95 backdrop-blur-sm px-8 py-4 text-center transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                  <h3 className="font-display text-2xl tracking-wide">TECH</h3>
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-60">Explore</span>
                </div>
              </div>
            </Link>
            <Link to="/shop" className="group relative h-[350px] lg:h-[400px] overflow-hidden bg-[#2D2926]">
              <LazyImage src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=800&auto=format&fit=crop" alt="Home" placeholder="skeleton" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700 ease-out" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-[#EBE7E0]/95 backdrop-blur-sm px-8 py-4 text-center transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                  <h3 className="font-display text-2xl tracking-wide">HOME</h3>
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-60">Explore</span>
                </div>
              </div>
            </Link>
            <Link to="/shop" className="group relative h-[350px] lg:h-[400px] overflow-hidden bg-[#2D2926] sm:col-span-2 lg:col-span-1">
              <LazyImage src="https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=800&auto=format&fit=crop" alt="Lifestyle" placeholder="skeleton" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700 ease-out" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-[#EBE7E0]/95 backdrop-blur-sm px-8 py-4 text-center transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                  <h3 className="font-display text-2xl tracking-wide">LIFESTYLE</h3>
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-60">Explore</span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Trending Now */}
      <section className="py-24 px-12 bg-[#EBE7E0] border-t border-[#2D2926]/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-5xl tracking-wide mb-4">TRENDING NOW</h2>
            <p className="text-sm font-medium opacity-60 max-w-md mx-auto">Our most sought-after pieces, curated for the modern aesthetic.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {trendingProducts.map((product: any) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>

          <div className="flex justify-center">
            <Link to="/shop" className="border border-[#2D2926] text-[#2D2926] px-12 py-4 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926] hover:text-[#EBE7E0] transition-colors inline-block duration-300 ease-out">
              View All Products
            </Link>
          </div>
        </div>
      </section>

      {/* Brand Story Split */}
      <section className="flex flex-col lg:flex-row border-y border-[#2D2926]/20 bg-[#2D2926]">
        <div className="w-full lg:w-1/2 h-[500px] lg:h-auto relative overflow-hidden">
          <LazyImage 
            src="https://images.unsplash.com/photo-1449247709967-d4461a6a6103?q=80&w=1200&auto=format&fit=crop" 
            alt="Craftsmanship" 
            placeholder="skeleton"
            className="absolute inset-0 w-full h-full object-cover grayscale opacity-80 hover:scale-105 transition-transform duration-1000 ease-out transform-gpu"
            referrerPolicy="no-referrer"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          />
        </div>
        <div className="w-full lg:w-1/2 text-[#EBE7E0] p-12 lg:p-24 flex flex-col justify-center">
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase mb-6 opacity-60">Our Philosophy</span>
          <h2 className="font-display text-5xl tracking-wide mb-8 leading-tight">DESIGNED FOR<br/>THE EVERYDAY</h2>
          <p className="opacity-80 leading-relaxed mb-10 max-w-lg text-sm font-medium">
            We believe that the objects you interact with daily should bring a sense of joy and purpose. Every piece in our collection is meticulously crafted, balancing minimalist aesthetics with uncompromising functionality.
          </p>
          <div>
            <Link to="/about" className="inline-flex items-center gap-3 text-[10px] font-bold tracking-[0.2em] uppercase hover:opacity-70 transition-opacity duration-300 ease-out pb-2 border-b border-[#EBE7E0]/30 hover:border-[#EBE7E0]">
              Discover Our Story <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="py-24 px-12 bg-[#EBE7E0]">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="font-display text-4xl tracking-wide mb-2">NEW ARRIVALS</h2>
              <p className="text-sm font-medium opacity-60">The latest additions to our collection.</p>
            </div>
            <Link to="/shop" className="text-[10px] font-bold tracking-[0.2em] uppercase hover:opacity-70 flex items-center gap-2 transition-opacity duration-300">
              Shop New <ArrowRight size={14}/>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {newArrivals.map((product: any) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-12 bg-[#EBE7E0] border-t border-[#2D2926]/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl tracking-wide mb-4">WHAT THEY SAY</h2>
          </div>
          
          <div className="flex lg:grid lg:grid-cols-3 gap-8 overflow-x-auto lg:overflow-visible pb-12 lg:pb-0 snap-x snap-mandatory hide-scrollbar group/slider">
            {[
              { name: "Sarah Jenkins", role: "Interior Designer", quote: "The attention to detail is unmatched. Every piece I've purchased has become a staple in my daily routine." },
              { name: "Marcus Chen", role: "Creative Director", quote: "Finally, a brand that understands the balance between minimalist design and actual, everyday utility." },
              { name: "Elena Rodriguez", role: "Architect", quote: "The quality of materials speaks for itself. These aren't just products; they are investments in better living." }
            ].map((testimonial, i) => (
              <div key={i} className="min-w-[300px] lg:min-w-0 snap-center group bg-[#EBE7E0] hover:bg-[#2D2926] hover:text-[#EBE7E0] p-10 border border-[#2D2926]/10 flex flex-col justify-between hover:-translate-y-2 transition-all duration-500 ease-out">
                <div>
                  <div className="flex gap-1 mb-6">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} size={14} className="fill-[#2D2926] text-[#2D2926] group-hover:fill-[#EBE7E0] group-hover:text-[#EBE7E0] transition-colors duration-500 ease-out" />
                    ))}
                  </div>
                  <p className="text-sm font-medium leading-relaxed mb-8 italic">"{testimonial.quote}"</p>
                </div>
                <div>
                  <h4 className="font-display text-lg tracking-wide">{testimonial.name}</h4>
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50">{testimonial.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-32 px-12 bg-[#2D2926] text-[#EBE7E0] text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-5xl tracking-wide mb-6">JOIN THE CLUB</h2>
          <p className="opacity-80 text-sm font-medium leading-relaxed mb-10">
            Subscribe to receive updates, access to exclusive deals, and more.
          </p>
          <form className="flex flex-col sm:flex-row gap-4 justify-center" onSubmit={(e) => e.preventDefault()}>
            <input 
              type="email" 
              placeholder="Enter your email address" 
              className="bg-transparent border border-[#EBE7E0]/30 px-6 py-4 text-sm w-full sm:w-96 focus:outline-none focus:border-[#EBE7E0] transition-colors duration-300 ease-out text-[#EBE7E0] placeholder:text-[#EBE7E0]/50"
              required
            />
            <button 
              type="submit" 
              className="bg-[#EBE7E0] text-[#2D2926] px-10 py-4 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#EBE7E0]/80 transition-colors duration-300 ease-out whitespace-nowrap"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
