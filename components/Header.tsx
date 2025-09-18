import Link from 'next/link';

const NAV_ITEMS = [
  { href: '#features', label: '機能' },
  { href: '#demo', label: 'デモ' },
  { href: '#pricing', label: '料金' },
  { href: '#faq', label: 'FAQ' },
];

export default function Header() {
  return (
    <header className="w-full bg-white/95 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group cursor-pointer" prefetch={false}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
              <i className="ri-bank-line text-white text-lg"></i>
            </div>
            <div>
              <div className="font-pacifico text-xl text-gray-900">Financial Information next</div>
              <div className="text-xs text-gray-500 font-medium">FIN</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className="relative text-gray-700 hover:text-blue-600 transition-colors cursor-pointer font-medium group"
              >
                {item.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 group-hover:w-full transition-all duration-300"></span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <a
              href="mailto:hello@fin-next.com"
              className="text-gray-700 hover:text-blue-600 transition-colors cursor-pointer font-medium"
            >
              お問い合わせ
            </a>
            <Link
              href="#pricing"
              prefetch={false}
              className="group relative bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 cursor-pointer whitespace-nowrap font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <span className="relative z-10">無料で試す</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
