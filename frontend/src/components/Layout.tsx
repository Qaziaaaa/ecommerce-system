import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { ShoppingCart, ShoppingBag, X, Plus, Minus, Trash2, ArrowRight, Facebook, Twitter, Instagram, Linkedin, ChevronDown, Menu, User } from 'lucide-react';
import { useCart } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../api/axios';

export default function Layout() {
  const { cart, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, cartTotal, cartCount } = useCart();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const navigate = useNavigate();

  // 🛡️ Perfect Security Alignment: CSRF Bootstrap
  React.useEffect(() => {
    // Call the dedicated token route once on app initialization
    axiosInstance.get('/csrf-token').catch(() => {});
  }, []);

  // Fetch categories for the mega-menu
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
        const { data } = await axiosInstance.get('/categories');
        return data.data.categories;
    }
  });

  return (
    <div className="min-h-screen bg-[#EBE7E0] text-[#2D2926] font-sans selection:bg-[#2D2926] selection:text-[#EBE7E0] flex flex-col">
      
      {/* Cart Overlay */}
      {isCartOpen && (
        <div 
          className="fixed inset-0 bg-[#2D2926]/40 backdrop-blur-sm z-40 transition-opacity duration-300 ease-in-out"
          onClick={() => setIsCartOpen(false)}
        />
      )}

      {/* Cart Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[450px] bg-[#EBE7E0] z-50 border-l border-[#2D2926] flex flex-col transform transition-transform duration-300 ease-in-out ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 border-b border-[#2D2926] flex justify-between items-center bg-[#2D2926] text-[#EBE7E0]">
          <div className="flex items-center gap-3">
            <ShoppingCart size={24} />
            <h2 className="font-display text-3xl tracking-wide pt-1">YOUR CART</h2>
          </div>
          <button onClick={() => setIsCartOpen(false)} className="hover:rotate-90 transition-transform duration-300 ease-in-out">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#2D2926]/50 gap-4">
              <ShoppingBag size={48} strokeWidth={1} />
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase">Your cart is empty</p>
              <button onClick={() => setIsCartOpen(false)} className="mt-4 border border-[#2D2926] text-[#2D2926] px-8 py-3 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926] hover:text-[#EBE7E0] transition-colors duration-300 ease-in-out">
                Continue Shopping
              </button>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-4 border border-[#2D2926] p-3 bg-[#EBE7E0] shadow-sm">
                <div className="w-24 h-24 border border-[#2D2926] bg-[#EBE7E0]">
                  <img 
                    src={item.images?.[0] || item.img || '/placeholder.png'} 
                    alt={item.name} 
                    className="w-full h-full object-cover mix-blend-multiply" 
                    referrerPolicy="no-referrer" 
                  />
                </div>
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-display text-xl tracking-wide leading-none">{item.name}</h3>
                    <button onClick={() => removeFromCart(item.id)} className="text-[#2D2926]/40 hover:text-red-500 transition-colors duration-300 ease-in-out">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="text-sm font-bold">${item.price.toFixed(2)}</div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center border border-[#2D2926]">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 hover:bg-[#2D2926] hover:text-[#EBE7E0] transition-colors duration-300 ease-in-out"><Minus size={12} /></button>
                      <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 hover:bg-[#2D2926] hover:text-[#EBE7E0] transition-colors duration-300 ease-in-out"><Plus size={12} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 border-t border-[#2D2926] bg-[#EBE7E0]">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Subtotal</span>
              <span className="font-display text-3xl">${cartTotal.toFixed(2)}</span>
            </div>
            <button 
              onClick={() => {
                setIsCartOpen(false);
                navigate('/checkout');
              }}
              className="w-full bg-[#2D2926] text-[#EBE7E0] py-4 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926]/90 transition-colors flex items-center justify-center gap-2 duration-300 ease-in-out"
            >
              Proceed to Checkout <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
      
      {/* 🍔 Full-Screen Mobile Menu Overlay */}
      <div className={`fixed inset-0 bg-[#EBE7E0] z-[60] flex flex-col transform transition-transform duration-500 ease-in-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-8 border-b border-[#2D2926]/10 flex justify-between items-center bg-[#2D2926] text-[#EBE7E0]">
          <Link to="/" onClick={() => setIsMenuOpen(false)} className="font-display text-2xl font-bold tracking-[0.15em]">NOVA</Link>
          <button onClick={() => setIsMenuOpen(false)} className="hover:rotate-90 transition-transform duration-300">
            <X size={28} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-10 py-12 flex flex-col gap-10">
          <div className="flex flex-col gap-6">
            <p className="text-[10px] font-bold tracking-[0.4em] uppercase opacity-30 mb-2">Navigation</p>
            <Link to="/" onClick={() => setIsMenuOpen(false)} className="font-display text-4xl tracking-tight">HOME</Link>
            <Link to="/shop" onClick={() => setIsMenuOpen(false)} className="font-display text-4xl tracking-tight">SHOP COLLECTION</Link>
            <Link to="/about" onClick={() => setIsMenuOpen(false)} className="font-display text-4xl tracking-tight">OUR STORY</Link>
          </div>

          <div className="flex flex-col gap-6">
            <p className="text-[10px] font-bold tracking-[0.4em] uppercase opacity-30 mb-2">Account</p>
            {isAuthenticated ? (
              <>
                <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="font-display text-3xl tracking-tight">MY PROFILE</Link>
                <Link to="/orders" onClick={() => setIsMenuOpen(false)} className="font-display text-3xl tracking-tight">ORDER HISTORY</Link>
                {user?.role === 'admin' && (
                  <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="font-display text-3xl tracking-tight text-amber-700">ADMIN PORTAL</Link>
                )}
                <button 
                  onClick={() => { logout(); setIsMenuOpen(false); }}
                  className="text-left font-display text-3xl tracking-tight text-red-600"
                >
                  SIGN OUT
                </button>
              </>
            ) : (
              <Link to="/login" onClick={() => setIsMenuOpen(false)} className="font-display text-4xl tracking-tight underline underline-offset-8">SIGN IN</Link>
            )}
          </div>
        </div>

        <div className="p-10 border-t border-[#2D2926]/10 bg-[#2D2926]/5">
           <Link to="/contact" onClick={() => setIsMenuOpen(false)} className="text-[10px] font-bold tracking-[0.2em] uppercase">Need Help? Contact Us</Link>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-6 lg:px-12 py-6 bg-[#EBE7E0] border-b border-[#2D2926]/10 backdrop-blur-sm">
        <div className="flex items-center gap-6 lg:gap-16">
          <Link to="/" className="font-display text-2xl lg:text-3xl font-bold tracking-[0.15em]">NOVA</Link>
          
          <nav className="hidden lg:flex gap-8 text-[10px] font-bold tracking-[0.2em] uppercase relative">
            <div className="group relative">
                <Link to="/shop" className="hover:opacity-70 transition-opacity duration-300 ease-in-out flex items-center gap-1 py-4">
                    Shop <ChevronDown size={12} className="group-hover:rotate-180 transition-transform duration-300" />
                </Link>
                <div className="absolute top-full left-0 w-48 bg-[#2D2926] text-[#EBE7E0] border border-[#EBE7E0]/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 ease-in-out transform translate-y-2 group-hover:translate-y-0 shadow-lg z-50 flex flex-col">
                    <Link to="/shop" className="px-6 py-4 border-b border-[#EBE7E0]/10 hover:bg-[#EBE7E0]/10 transition-colors">All Products</Link>
                    {(Array.isArray(categories) ? categories : []).map((cat: any) => (
                        <Link 
                            key={cat._id}
                            to={`/shop?category=${encodeURIComponent(cat.name)}`} 
                            className="px-6 py-4 hover:bg-[#EBE7E0]/10 transition-colors flex items-center justify-between group/item"
                        >
                            {cat.name}
                            <ArrowRight size={10} className="opacity-0 group-hover/item:opacity-100 -translate-x-2 group-hover/item:translate-x-0 transition-all duration-300" />
                        </Link>
                    ))}
                </div>
            </div>
            <Link to="/about" className="hover:opacity-70 transition-opacity duration-300 ease-in-out py-4">About Us</Link>
            <Link to="/contact" className="hover:opacity-70 transition-opacity duration-300 ease-in-out py-4">Contact</Link>
          </nav>
        </div>

        <div className="flex justify-end items-center gap-4 lg:gap-8">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative text-[#2D2926] hover:opacity-70 transition-opacity flex items-center gap-2 duration-300 ease-in-out"
          >
            <ShoppingCart size={18} className="lg:w-[20px]" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase hidden xl:block">Cart ({cartCount})</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#2D2926] text-[#EBE7E0] text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full lg:static lg:rounded-none lg:bg-transparent lg:text-[#2D2926] lg:w-auto lg:h-auto">
                {cartCount > 0 && <span className="lg:hidden">{cartCount}</span>}
              </span>
            )}
          </button>

          {/* Hamburger / User Icon Area */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
                <Link to="/profile" className="hidden lg:block text-[10px] font-bold tracking-[0.2em] uppercase hover:opacity-70">{user?.name}</Link>
            ) : (
                <Link to="/login" className="hidden lg:block border border-[#2D2926] text-[#2D2926] px-6 py-2.5 text-[9px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926] hover:text-[#EBE7E0] transition-colors duration-300">Sign In</Link>
            )}
            
            {/* Hamburger Trigger */}
            <button 
                onClick={() => setIsMenuOpen(true)}
                className="lg:hidden p-2 -mr-2 text-[#2D2926] hover:opacity-70 transition-opacity"
            >
                <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-[#2D2926] text-[#EBE7E0] pt-16 lg:pt-24 pb-12 px-6 lg:px-12 overflow-hidden mt-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 mb-20 lg:mb-32 max-w-7xl mx-auto">
          <div className="col-span-1 lg:col-span-4">
            <div className="font-display text-3xl font-bold tracking-[0.15em] mb-8 lg:mb-10">NOVA</div>
            <div className="flex flex-col sm:flex-row mb-10 gap-4 sm:gap-0">
              <input type="email" placeholder="email address" className="bg-transparent border border-[#EBE7E0]/30 px-5 py-4 text-[10px] sm:text-xs w-full sm:w-72 focus:outline-none focus:border-[#EBE7E0] transition-colors duration-300" />
              <button className="bg-[#EBE7E0] text-[#2D2926] px-8 py-4 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#EBE7E0]/80 transition-colors">Join</button>
            </div>
            <div className="flex gap-4">
              {[
                { Icon: Facebook, url: 'https://facebook.com' },
                { Icon: Twitter, url: 'https://twitter.com' },
                { Icon: Instagram, url: 'https://instagram.com' },
                { Icon: Linkedin, url: 'https://linkedin.com' }
              ].map(({ Icon, url }, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-[#EBE7E0]/30 flex items-center justify-center hover:bg-[#EBE7E0] hover:text-[#2D2926] transition-colors rounded-sm">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>
          
          <div className="col-span-1 lg:col-span-2 lg:col-start-7">
            <FooterAccordion title="Company Info">
              <ul className="space-y-4 text-[10px] lg:text-xs pt-4 lg:pt-0">
                <li><Link to="/about" className="hover:text-[#EBE7E0] transition-colors">About Us</Link></li>
                <li><a href="#" className="hover:text-[#EBE7E0] transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-[#EBE7E0] transition-colors">Press & Media</a></li>
                <li><a href="#" className="hover:text-[#EBE7E0] transition-colors">Blog</a></li>
              </ul>
            </FooterAccordion>
          </div>
          
          <div className="col-span-1 lg:col-span-2">
            <FooterAccordion title="Quick Links">
              <ul className="space-y-4 text-[10px] lg:text-xs pt-4 lg:pt-0">
                <li><Link to="/shop" className="hover:text-[#EBE7E0] transition-colors">Products/Services</Link></li>
                <li><a href="#" className="hover:text-[#EBE7E0] transition-colors">Testimonials</a></li>
                <li><a href="#" className="hover:text-[#EBE7E0] transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-[#EBE7E0] transition-colors">FAQs</a></li>
              </ul>
            </FooterAccordion>
          </div>
          
          <div className="col-span-1 lg:col-span-2">
            <FooterAccordion title="Legal">
              <ul className="space-y-4 text-[10px] lg:text-xs pt-4 lg:pt-0">
                <li><Link to="/terms" className="hover:text-[#EBE7E0] transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-[#EBE7E0] transition-colors">Privacy Policy</Link></li>
                <li><a href="#" className="hover:text-[#EBE7E0] transition-colors">Refund Policy</a></li>
              </ul>
            </FooterAccordion>
          </div>
        </div>

        <div className="relative flex flex-col items-center max-w-7xl mx-auto">
          <h1 className="font-display text-[22vw] lg:text-[24vw] leading-[0.75] tracking-tighter text-[#EBE7E0] opacity-90 w-full text-center select-none">
            NOVA
          </h1>
          <div className="w-full flex justify-center lg:justify-end mt-8">
            <p className="text-[8px] lg:text-[10px] text-[#EBE7E0]/50 font-medium tracking-wide">© NOVA - 2026. All Rights Reserved.</p>
          </div>
        </div>
      </footer>
</div>
);
}

// 🧱 Footer Accordion Sub-component for Mobile
function FooterAccordion({ title, children }: { title: string, children: React.ReactNode }) {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className="border-b lg:border-none border-[#EBE7E0]/10 pb-4 lg:pb-0">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-[10px] lg:text-[10px] font-bold tracking-[0.2em] uppercase opacity-70 lg:opacity-50 lg:mb-8"
            >
                {title}
                <ChevronDown size={14} className={`lg:hidden transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`${isOpen ? 'block' : 'hidden'} lg:block transition-all duration-300`}>
                {children}
            </div>
        </div>
    );
}
