import dynamic from 'next/dynamic';
import Header from '../components/Header';
import HeroSection from '../components/HeroSection';
import FeaturesSection from '../components/FeaturesSection';
import FAQSection from '../components/FAQSection';
import Footer from '../components/Footer';

// インタラクティブなコンポーネントを遅延読み込み
const SearchDemo = dynamic(() => import('../components/SearchDemo'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )
});

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