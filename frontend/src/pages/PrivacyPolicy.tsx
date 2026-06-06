import React from 'react';
import SEOMeta from '../components/SEOMeta';

export default function PrivacyPolicy() {
  return (
    <div className="py-20 px-12 bg-[#EBE7E0] min-h-screen">
      <SEOMeta title="Privacy Policy" />
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-5xl tracking-wide mb-10">PRIVACY POLICY</h1>
        <div className="space-y-6 text-sm opacity-80 leading-relaxed">
          <p>
            At NOVA, we take your privacy seriously. This Privacy Policy outlines how we collect, use, and protect your personal information when you use our website and services.
          </p>
          <h2 className="font-display text-2xl tracking-wide mt-10 mb-4">1. Information We Collect</h2>
          <p>
            We collect information you provide directly to us, such as when you create an account, make a purchase, or contact customer support. This may include your name, email address, shipping address, and payment details.
          </p>
          <h2 className="font-display text-2xl tracking-wide mt-10 mb-4">2. How We Use Your Information</h2>
          <p>
            We use the information we collect to process transactions, communicate with you about your orders, improve our products and services, and send you marketing communications if you have opted in.
          </p>
          <h2 className="font-display text-2xl tracking-wide mt-10 mb-4">3. Information Sharing</h2>
          <p>
            We do not sell your personal information to third parties. We may share your information with trusted service providers who assist us in operating our website and conducting our business, as long as those parties agree to keep this information confidential.
          </p>
          <h2 className="font-display text-2xl tracking-wide mt-10 mb-4">4. Data Security</h2>
          <p>
            We implement a variety of security measures to maintain the safety of your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure.
          </p>
          <h2 className="font-display text-2xl tracking-wide mt-10 mb-4">5. Your Rights</h2>
          <p>
            You have the right to access, correct, or delete your personal information. If you wish to exercise these rights, please contact us at privacy@nova.com.
          </p>
          <p className="mt-12 text-xs opacity-60">
            Last updated: March 15, 2026
          </p>
        </div>
      </div>
    </div>
  );
}
