import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Bottom section */}
        <div className="pt-8">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
            <div className="text-sm text-gray-400">
              © 2025 Financial Information next (FIN). All rights reserved.
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="https://github.com/ruisu2000p/xbrl-api-minimal"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white hover:scale-110 transition-all duration-200 cursor-pointer flex items-center space-x-2"
              >
                <i className="ri-github-line text-xl"></i>
                <span className="text-sm">GitHub</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}