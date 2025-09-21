
'use client';

import Header from '../../components/Header';
import Footer from '../../components/Footer';
import PricingSection from './PricingSection';

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <PricingSection />
      <Footer />
    </div>
  );
}