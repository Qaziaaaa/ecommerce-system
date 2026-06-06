import React from 'react';
import { Mail, Phone, MapPin, ArrowRight } from 'lucide-react';
import SEOMeta from '../components/SEOMeta';

export default function Contact() {
  return (
    <div className="bg-[#EBE7E0] min-h-screen text-[#2D2926] selection:bg-[#2D2926] selection:text-[#EBE7E0]">
      <SEOMeta title="Contact" />
      {/* Header Section */}
      <section className="pt-32 pb-20 px-6 md:px-12 border-b border-[#2D2926]/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end gap-12">
          <div className="w-full md:w-1/2">
            <h1 className="font-display text-5xl md:text-7xl tracking-wide mb-6">GET IN TOUCH</h1>
            <p className="text-sm font-medium leading-relaxed max-w-md">
              Whether you have a question about our products, need assistance with an order, or just want to say hello, we're here for you.
            </p>
          </div>
          <div className="w-full md:w-1/2 flex justify-start md:justify-end">
            <div className="w-16 h-[1px] bg-[#2D2926] opacity-40"></div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-24 px-6 md:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24">
          
          {/* Contact Form */}
          <div>
            <h2 className="font-display text-3xl tracking-wide mb-12">SEND A MESSAGE</h2>
            <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex flex-col gap-2">
                  <label htmlFor="firstName" className="text-[10px] font-bold tracking-[0.2em] uppercase">First Name</label>
                  <input 
                    type="text" 
                    id="firstName" 
                    className="bg-transparent border-b border-[#2D2926]/30 py-3 focus:outline-none focus:border-[#2D2926] transition-colors duration-300"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="lastName" className="text-[10px] font-bold tracking-[0.2em] uppercase">Last Name</label>
                  <input 
                    type="text" 
                    id="lastName" 
                    className="bg-transparent border-b border-[#2D2926]/30 py-3 focus:outline-none focus:border-[#2D2926] transition-colors duration-300"
                    required
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-[10px] font-bold tracking-[0.2em] uppercase">Email Address</label>
                <input 
                  type="email" 
                  id="email" 
                  className="bg-transparent border-b border-[#2D2926]/30 py-3 focus:outline-none focus:border-[#2D2926] transition-colors duration-300"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="subject" className="text-[10px] font-bold tracking-[0.2em] uppercase">Subject</label>
                <input 
                  type="text" 
                  id="subject" 
                  className="bg-transparent border-b border-[#2D2926]/30 py-3 focus:outline-none focus:border-[#2D2926] transition-colors duration-300"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="message" className="text-[10px] font-bold tracking-[0.2em] uppercase">Message</label>
                <textarea 
                  id="message" 
                  rows={4}
                  className="bg-transparent border-b border-[#2D2926]/30 py-3 focus:outline-none focus:border-[#2D2926] transition-colors duration-300 resize-none"
                  required
                ></textarea>
              </div>

              <button 
                type="submit" 
                className="mt-8 bg-[#2D2926] text-[#EBE7E0] px-12 py-5 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926]/90 transition-colors duration-300 ease-out flex items-center gap-3 w-full md:w-auto justify-center"
              >
                Send Message <ArrowRight size={14} />
              </button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="flex flex-col gap-16">
            <div>
              <h2 className="font-display text-3xl tracking-wide mb-12">CONTACT INFO</h2>
              <div className="space-y-10">
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 border border-[#2D2926] flex items-center justify-center shrink-0">
                    <Mail size={20} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2 opacity-50">Email Us</h3>
                    <a href="mailto:hello@nova.com" className="text-lg font-medium hover:opacity-70 transition-opacity">hello@nova.com</a>
                    <p className="text-sm mt-1 opacity-70">We aim to reply within 24 hours.</p>
                  </div>
                </div>

                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 border border-[#2D2926] flex items-center justify-center shrink-0">
                    <Phone size={20} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2 opacity-50">Call Us</h3>
                    <a href="tel:+1234567890" className="text-lg font-medium hover:opacity-70 transition-opacity">+1 (234) 567-890</a>
                    <p className="text-sm mt-1 opacity-70">Mon-Fri, 9am-6pm EST</p>
                  </div>
                </div>

                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 border border-[#2D2926] flex items-center justify-center shrink-0">
                    <MapPin size={20} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2 opacity-50">Visit Us</h3>
                    <p className="text-lg font-medium leading-relaxed">
                      123 Minimalist Ave.<br />
                      Design District, NY 10001
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ Teaser */}
            <div className="bg-[#2D2926] text-[#EBE7E0] p-10">
              <h3 className="font-display text-2xl tracking-wide mb-4">HAVE A QUICK QUESTION?</h3>
              <p className="text-sm opacity-80 mb-8 leading-relaxed">
                Check out our frequently asked questions. We might have already answered what you're looking for.
              </p>
              <a href="#" className="inline-block border border-[#EBE7E0] px-8 py-3 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#EBE7E0] hover:text-[#2D2926] transition-colors duration-300">
                View FAQs
              </a>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
