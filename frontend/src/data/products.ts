export interface Product {
  id: number;
  tag: string;
  category: string;
  name: string;
  price: number;
  img: string;
  description: string;
}

export const PRODUCTS: Product[] = [
  { id: 1, tag: 'BEST SELLER', category: 'Bags', name: 'THE EVERYDAY TOTE', price: 185.00, img: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=800&auto=format&fit=crop', description: 'Crafted from premium full-grain leather, this tote is designed to age beautifully. Spacious enough for a 15-inch laptop and your daily essentials.' },
  { id: 2, tag: 'NEW ARRIVAL', category: 'Audio', name: 'ECHO EARBUDS', price: 129.00, img: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?q=80&w=800&auto=format&fit=crop', description: 'Immerse yourself in high-fidelity sound. Featuring active noise cancellation, 24-hour battery life, and a sleek matte finish.' },
  { id: 3, tag: 'LIMITED EDITION', category: 'Accessories', name: 'CHRONO WATCH', price: 245.00, img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop', description: 'A minimalist timepiece featuring a matte black stainless steel case, sapphire crystal glass, and a precision quartz movement.' },
  { id: 4, tag: 'ESSENTIAL', category: 'Home', name: 'LUMINA LAMP', price: 89.00, img: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=800&auto=format&fit=crop', description: 'Elevate your workspace with this dimmable ambient desk lamp. Features a solid brass base and warm LED lighting.' },
  { id: 5, tag: 'POPULAR', category: 'Accessories', name: 'SOLARIS SHADES', price: 115.00, img: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=800&auto=format&fit=crop', description: 'Classic silhouette meets modern materials. Handcrafted acetate frames with polarized UV400 lenses for ultimate protection.' },
  { id: 6, tag: 'NEW ARRIVAL', category: 'Home', name: 'NOMAD TUMBLER', price: 45.00, img: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?q=80&w=800&auto=format&fit=crop', description: 'Keep your beverages perfectly hot or cold for hours. Double-wall vacuum insulated with a smooth ceramic coating.' },
  { id: 7, tag: 'BEST SELLER', category: 'Bags', name: 'ATLAS DUFFEL', price: 165.00, img: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=800&auto=format&fit=crop', description: 'The ultimate weekend companion. Made from heavy-duty water-resistant canvas with premium leather accents and solid brass hardware.' },
  { id: 8, tag: 'PREMIUM', category: 'Audio', name: 'ZENITH SPEAKER', price: 195.00, img: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?q=80&w=800&auto=format&fit=crop', description: 'Room-filling sound in a portable package. Features 360-degree audio, machined aluminum body, and 15 hours of playtime.' },
];
