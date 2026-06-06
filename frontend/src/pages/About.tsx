import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEOMeta from '../components/SEOMeta';

export default function About() {
  return (
    <div className="bg-[#EBE7E0] min-h-screen text-[#2D2926] selection:bg-[#2D2926] selection:text-[#EBE7E0]">
      <SEOMeta title="About Us" />
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          width: 200%;
          animation: marquee 20s linear infinite;
          will-change: transform;
        }
        .vertical-text {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
        }
      `}</style>

      {/* Hero Section */}
      <section className="relative min-h-[calc(100vh-85px)] flex flex-col overflow-hidden border-b border-[#2D2926]/20">
        <div className="relative z-10 flex-1 flex pt-12">
          <div className="w-full md:w-[70%] flex flex-col justify-center px-6 md:px-12 pb-24">
            <div className="flex flex-col">
              <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-8 mb-2">
                <h1 className="font-display text-[12vw] md:text-[7vw] leading-none tracking-tight text-[#2D2926]">
                  THE ART
                </h1>
                <p className="text-sm font-medium max-w-[200px] leading-relaxed pb-4 opacity-80">
                  We believe that the objects you interact with daily should inspire you.
                </p>
              </div>
              <h1 className="font-display text-[12vw] md:text-[7vw] leading-none tracking-tight text-[#2D2926]">
                OF LIVING
              </h1>
            </div>
          </div>
          
          <div className="hidden md:flex w-[30%] relative items-center justify-center pr-12">
            <div className="w-full aspect-[3/4] z-0">
              <img 
                src="https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=1200&auto=format&fit=crop" 
                alt="Abstract minimal" 
                className="w-full h-full object-cover grayscale opacity-90"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-6 md:left-12 flex items-center gap-4 z-10">
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Scroll to explore</span>
          <div className="w-16 h-[1px] bg-[#2D2926] opacity-40"></div>
        </div>
      </section>

      {/* Marquee Section */}
      <section className="border-b border-[#2D2926]/20 py-5 overflow-hidden bg-[#2D2926] text-[#EBE7E0]">
        <div className="animate-marquee whitespace-nowrap flex items-center">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center text-xl md:text-2xl font-display tracking-widest px-8">
              <span>FORM</span>
              <span className="mx-8 opacity-50 text-sm">✦</span>
              <span>FUNCTION</span>
              <span className="mx-8 opacity-50 text-sm">✦</span>
              <span>AESTHETICS</span>
              <span className="mx-8 opacity-50 text-sm">✦</span>
              <span>CRAFT</span>
              <span className="mx-8 opacity-50 text-sm">✦</span>
            </div>
          ))}
        </div>
      </section>

      {/* Sticky Asymmetrical Grid */}
      <section className="px-6 md:px-12 py-24 max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row gap-20 relative">
          
          {/* Sticky Left Column */}
          <div className="w-full md:w-1/3 relative">
            <div className="md:sticky md:top-32">
              <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-8 flex items-center gap-4">
                <span className="w-8 h-[1px] bg-[#2D2926]"></span>
                Our Philosophy
              </h2>
              <p className="text-4xl font-display leading-tight tracking-tight mb-8">
                WE REJECT THE MUNDANE. EVERY OBJECT IS AN OPPORTUNITY.
              </p>
              <p className="text-sm font-medium opacity-80 leading-relaxed max-w-sm">
                Nova was founded on the principle that everyday essentials shouldn't be an afterthought. We meticulously design and curate pieces that elevate your daily rituals, blending uncompromising quality with timeless aesthetics.
              </p>
            </div>
          </div>

          {/* Scrolling Right Column */}
          <div className="w-full md:w-2/3 flex flex-col gap-24 mt-16 md:mt-0">
            
            {/* Block 1 */}
            <div className="flex flex-col md:flex-row gap-8 items-start group">
              <span className="font-display text-6xl leading-none opacity-20 group-hover:opacity-40 transition-opacity duration-500 ease-in-out">01</span>
              <div className="flex-1 pt-2">
                <div className="overflow-hidden mb-8 border border-[#2D2926]/10">
                  <img 
                    src="https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1200&auto=format&fit=crop" 
                    alt="Minimalist room" 
                    className="w-full aspect-[4/3] object-cover grayscale hover:grayscale-0 transition-all duration-700 scale-100 group-hover:scale-105 ease-in-out"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h3 className="text-2xl font-display mb-4 tracking-tight">UNCOMPROMISING QUALITY</h3>
                <p className="opacity-80 text-sm font-medium leading-relaxed max-w-md">
                  We source only the finest materials—from full-grain Italian leathers to aerospace-grade aluminum. Our products are engineered to withstand the test of time, aging beautifully with every use.
                </p>
              </div>
            </div>

            {/* Block 2 (Offset) */}
            <div className="flex flex-col md:flex-row gap-8 items-start md:pl-24 group">
              <span className="font-display text-6xl leading-none opacity-20 group-hover:opacity-40 transition-opacity duration-500 ease-in-out">02</span>
              <div className="flex-1 pt-2">
                <div className="overflow-hidden mb-8 border border-[#2D2926]/10">
                  <img 
                    src="https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=1200&auto=format&fit=crop" 
                    alt="Texture details" 
                    className="w-full aspect-[3/4] object-cover grayscale hover:grayscale-0 transition-all duration-700 scale-100 group-hover:scale-105 ease-in-out"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h3 className="text-2xl font-display mb-4 tracking-tight">TIMELESS DESIGN</h3>
                <p className="opacity-80 text-sm font-medium leading-relaxed max-w-md">
                  Trends fade, but good design is eternal. We focus on clean lines, balanced proportions, and minimalist silhouettes that look as striking today as they will in a decade.
                </p>
              </div>
            </div>

            {/* Block 3 */}
            <div className="flex flex-col md:flex-row gap-8 items-start group">
              <span className="font-display text-6xl leading-none opacity-20 group-hover:opacity-40 transition-opacity duration-500 ease-in-out">03</span>
              <div className="flex-1 pt-2">
                <div className="overflow-hidden mb-8 border border-[#2D2926]/10">
                  <img 
                    src="https://images.unsplash.com/photo-1618220179428-22790b461013?q=80&w=1200&auto=format&fit=crop" 
                    alt="Craftsmanship details" 
                    className="w-full aspect-[4/3] object-cover grayscale hover:grayscale-0 transition-all duration-700 scale-100 group-hover:scale-105 ease-in-out"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h3 className="text-2xl font-display mb-4 tracking-tight">FUNCTIONAL ART</h3>
                <p className="opacity-80 text-sm font-medium leading-relaxed max-w-md">
                  We reject the idea that utility must compromise beauty. Our collection proves that everyday essentials can be works of art, elevating the mundane into the extraordinary.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Dark Mode Manifesto */}
      <section className="bg-[#2D2926] text-[#EBE7E0] py-24 px-6 md:px-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img 
            src="https://images.unsplash.com/photo-1490122417551-6ee9691429d0?q=80&w=2000&auto=format&fit=crop" 
            alt="Background texture" 
            className="w-full h-full object-cover grayscale"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <div className="max-w-4xl mx-auto relative z-10 text-center flex flex-col items-center">
          <h2 className="font-display text-5xl md:text-6xl leading-none tracking-tight mb-8">
            ELEVATE THE EVERYDAY.
          </h2>
          <p className="text-sm font-medium opacity-80 max-w-xl mx-auto leading-relaxed mb-12">
            Join us in our pursuit of aesthetic perfection. Discover objects that don't just fill space, but define it.
          </p>
          
          <Link to="/shop" className="inline-flex items-center gap-4 text-[10px] font-bold tracking-[0.2em] uppercase group">
            <span className="border-b border-[#EBE7E0] pb-1 group-hover:border-transparent transition-colors duration-300 ease-in-out">Enter The Shop</span>
            <div className="w-10 h-10 rounded-full border border-[#EBE7E0] flex items-center justify-center group-hover:bg-[#EBE7E0] group-hover:text-[#2D2926] transition-all duration-500 ease-in-out">
              <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform duration-500 ease-in-out" />
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
