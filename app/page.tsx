'use client';

import Header from '../components/Header';
import HeroSection from '../components/HeroSection';
import SearchDemo from '../components/SearchDemo';
import FeaturesSection from '../components/FeaturesSection';
import FAQSection from '../components/FAQSection';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection />
      <SearchDemo />
      <FeaturesSection />
      <FAQSection />
      <Footer />
    </div>
  );
}