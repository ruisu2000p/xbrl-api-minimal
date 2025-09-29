'use client';

import { useEffect, useRef, useState, type KeyboardEvent, useCallback, useMemo } from 'react';
import VideoPlayer from './VideoPlayer';
import { useLanguage } from '@/contexts/LanguageContext';

// Types
interface CompanyData {
  company: {
    name: string;
    code: string;
    sector: string;
    market_cap: number;
    listing_date: string;
  };
  financials: {
    fiscal_year: number;
    revenue: number;
    operating_income: number;
    net_income: number;
    total_assets: number;
    equity: number;
  };
  ratios: {
    roe: number;
    roa: number;
    debt_ratio: number;
    current_ratio: number;
    per: number;
    pbr: number;
  };
  esg_score: {
    environmental: number;
    social: number;
    governance: number;
    total: number;
  };
}

interface SearchDemoProps {
  defaultSearchTerm?: string;
  apiEndpoint?: string;
  demoMode?: boolean;
}

// Constants
const ANIMATION_DELAY = 1500;
const RESPONSE_TIME_MS = 87;

export default function SearchDemo({
  defaultSearchTerm = 'トヨタ自動車',
  apiEndpoint = '/api/v1/companies/',
  demoMode = true
}: SearchDemoProps) {
  // Language hook
  const { t } = useLanguage();

  // State
  const [searchTerm, setSearchTerm] = useState(defaultSearchTerm);
  const [isLoading, setIsLoading] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  // Refs
  const pendingRequestRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sample response data (memoized)
  const sampleResponse = useMemo<CompanyData>(() => ({
    company: {
      name: "トヨタ自動車株式会社",
      code: "7203",
      sector: "輸送用機器",
      market_cap: 28456000000000,
      listing_date: "1949-05-16"
    },
    financials: {
      fiscal_year: 2023,
      revenue: 37154310000000,
      operating_income: 2725656000000,
      net_income: 2450093000000,
      total_assets: 69929133000000,
      equity: 26745356000000
    },
    ratios: {
      roe: 9.2,
      roa: 4.1,
      debt_ratio: 0.18,
      current_ratio: 1.13,
      per: 9.8,
      pbr: 0.9
    },
    esg_score: {
      environmental: 8.5,
      social: 7.8,
      governance: 8.9,
      total: 8.4
    }
  }), []);

  // Handlers
  const handleSearch = useCallback(async () => {
    if (isLoading || !searchTerm.trim()) return;

    // Clear previous request
    if (pendingRequestRef.current) {
      clearTimeout(pendingRequestRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsLoading(true);
    setShowResponse(false);
    setError(null);

    try {
      if (demoMode) {
        // Demo mode: simulate API call
        pendingRequestRef.current = setTimeout(() => {
          setIsLoading(false);
          setShowResponse(true);
          pendingRequestRef.current = null;
        }, ANIMATION_DELAY);
      } else {
        // Real API call
        abortControllerRef.current = new AbortController();
        const response = await fetch(`${apiEndpoint}${encodeURIComponent(searchTerm)}`, {
          signal: abortControllerRef.current.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        setIsLoading(false);
        setShowResponse(true);
        // Handle real data here
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
        setIsLoading(false);
      }
    }
  }, [searchTerm, isLoading, demoMode, apiEndpoint]);

  const handleInputKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearch();
    }
  }, [handleSearch]);

  const handleCopyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(sampleResponse, null, 2));
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }, [sampleResponse]);

  const toggleVideoMode = useCallback(() => {
    setShowVideo(prev => !prev);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (pendingRequestRef.current) {
        clearTimeout(pendingRequestRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Format number for display
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('ja-JP').format(num);
  };

  // Format currency
  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <section className="py-24 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl" aria-hidden="true"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl" aria-hidden="true"></div>

      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-full mb-6">
            <i className="ri-code-s-slash-line text-blue-600 mr-2" aria-hidden="true"></i>
            <span className="text-blue-700 text-sm font-medium">{t('home.searchDemo.badge')}</span>
          </div>
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {t('home.searchDemo.title')}
            </span>
            {t('home.searchDemo.titleSuffix')}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('home.searchDemo.subtitle')}
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Toggle between Video and Claude Desktop Interface */}
          {showVideo ? (
            // Full Video Display
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
              {/* Video Header */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                        <i className="ri-play-circle-line text-white text-lg" aria-hidden="true"></i>
                      </div>
                      <span className="text-white font-semibold text-lg">{t('home.searchDemo.videoHeader')}</span>
                    </div>
                  </div>
                  <button
                    onClick={toggleVideoMode}
                    className="bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm hover:bg-white/30 transition-colors flex items-center space-x-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-500"
                    type="button"
                    aria-label="Switch to interactive mode"
                  >
                    <i className="ri-code-s-slash-line text-white" aria-hidden="true"></i>
                    <span className="text-white text-sm font-medium">{t('home.searchDemo.interactiveMode')}</span>
                  </button>
                </div>
              </div>

              {/* Video Player */}
              <div className="bg-gray-900 p-4">
                <VideoPlayer
                  videoUrl="/videos/demo.mp4"
                  autoPlay={false}
                  controls={true}
                  muted={true}
                  width="100%"
                  height="600"
                />
              </div>

              {/* Video Description */}
              <div className="p-6 bg-gradient-to-b from-gray-50 to-white">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                    <i className="ri-information-line text-white text-xl" aria-hidden="true"></i>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{t('home.searchDemo.demoVideoTitle')}</h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  {t('home.searchDemo.demoVideoDescription')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="flex items-start space-x-3">
                    <i className="ri-check-double-line text-green-500 text-xl mt-1" aria-hidden="true"></i>
                    <div>
                      <p className="font-semibold text-gray-800">{t('home.searchDemo.realtimeData')}</p>
                      <p className="text-sm text-gray-600">{t('home.searchDemo.realtimeDataDesc')}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <i className="ri-check-double-line text-green-500 text-xl mt-1" aria-hidden="true"></i>
                    <div>
                      <p className="font-semibold text-gray-800">{t('home.searchDemo.aiAnalysis')}</p>
                      <p className="text-sm text-gray-600">{t('home.searchDemo.aiAnalysisDesc')}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <i className="ri-check-double-line text-green-500 text-xl mt-1" aria-hidden="true"></i>
                    <div>
                      <p className="font-semibold text-gray-800">{t('home.searchDemo.easyApi')}</p>
                      <p className="text-sm text-gray-600">{t('home.searchDemo.easyApiDesc')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Original Claude Desktop Style Interface
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Claude Desktop Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex space-x-2" aria-hidden="true">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                      <i className="ri-robot-2-line text-white text-lg" aria-hidden="true"></i>
                    </div>
                    <span className="text-white font-semibold text-lg">Claude Desktop</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={toggleVideoMode}
                    className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm hover:bg-white/30 transition-colors flex items-center space-x-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-500"
                    type="button"
                    aria-label="Switch to video mode"
                  >
                    <i className="ri-play-circle-line text-white" aria-hidden="true"></i>
                    <span className="text-white text-sm font-medium">{t('home.searchDemo.videoMode')}</span>
                  </button>
                  <div className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                    <span className="text-white text-sm font-medium">XBRL Financial API</span>
                  </div>
                  <button
                    className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors backdrop-blur-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-500"
                    type="button"
                    aria-label="Settings"
                  >
                    <i className="ri-settings-3-line text-white" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Interface Style */}
            <div className="p-8 bg-gradient-to-b from-gray-50 to-white min-h-[600px]">
              {/* User Message */}
              <div className="flex justify-end mb-6">
                <div className="bg-orange-500 text-white px-6 py-3 rounded-2xl rounded-br-md max-w-md shadow-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <label htmlFor="searchCompany" className="text-sm font-medium whitespace-nowrap">
                      GET {apiEndpoint}
                    </label>
                    <input
                      id="searchCompany"
                      name="searchCompany"
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-white/20 text-white placeholder-white/70 px-3 py-1 rounded-lg border-0 outline-none text-sm flex-1 focus:ring-2 focus:ring-white/50"
                      placeholder={t('home.searchDemo.inputPlaceholder')}
                      autoComplete="organization"
                      onKeyDown={handleInputKeyDown}
                      aria-label="Search company name or code"
                      disabled={isLoading}
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={isLoading || !searchTerm.trim()}
                    type="button"
                    aria-disabled={isLoading}
                    aria-busy={isLoading}
                    className="w-full bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-all duration-300 cursor-pointer whitespace-nowrap font-medium text-sm backdrop-blur-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/80 focus-visible:ring-offset-orange-500"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" aria-hidden="true"></div>
                        <span>{t('home.searchDemo.analyzing')}</span>
                      </div>
                    ) : (
                      <>
                        <i className="ri-search-line mr-2" aria-hidden="true"></i>
                        {t('home.searchDemo.execute')}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex justify-start mb-6" role="alert" aria-live="assertive">
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg max-w-2xl">
                    <div className="flex items-center space-x-2">
                      <i className="ri-error-warning-line text-red-600" aria-hidden="true"></i>
                      <span className="font-medium">{t('home.searchDemo.error')}</span>
                      <span>{error}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Claude Response */}
              {showResponse && !error && (
                <div className="flex justify-start" aria-live="polite">
                  <div className="bg-white border border-gray-200 shadow-lg rounded-2xl rounded-bl-md max-w-4xl w-full">
                    {/* Claude Avatar and Header */}
                    <div className="flex items-center space-x-3 p-4 border-b border-gray-100">
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center shadow-md">
                        <i className="ri-robot-2-line text-white text-sm" aria-hidden="true"></i>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900">Claude</span>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                            <i className="ri-check-line mr-1" aria-hidden="true"></i>
                            200 OK
                          </span>
                          <span>{t('home.searchDemo.responseTime').replace('{time}', RESPONSE_TIME_MS.toString())}</span>
                        </div>
                      </div>
                    </div>

                    {/* Response Content */}
                    <div className="p-6">
                      <div className="bg-gray-900 rounded-xl p-6 font-mono text-sm overflow-x-auto">
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-gray-400 text-xs">{t('home.searchDemo.jsonResponse')}</div>
                          <button
                            onClick={handleCopyToClipboard}
                            className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-600"
                            type="button"
                            aria-label="Copy JSON to clipboard"
                            title={copiedToClipboard ? "Copied!" : "Copy to clipboard"}
                          >
                            <i className={copiedToClipboard ? "ri-check-line text-green-400" : "ri-file-copy-line"} aria-hidden="true"></i>
                          </button>
                        </div>
                        <pre className="text-green-400 leading-relaxed text-xs">
                          <code>{JSON.stringify(sampleResponse, null, 2)}</code>
                        </pre>
                      </div>

                      {/* Analysis */}
                      <div className="mt-6">
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <i className="ri-lightbulb-line text-orange-600" aria-hidden="true"></i>
                              <span className="font-semibold text-orange-800">{t('home.searchDemo.analysisResult')}</span>
                            </div>
                          </div>
                          <p className="text-gray-700 text-sm leading-relaxed">
                            {t('home.searchDemo.analysisText')
                              .replace('{company}', sampleResponse.company.name)
                              .replace('{roe}', sampleResponse.ratios.roe.toString())
                              .replace('{marketCap}', formatCurrency(sampleResponse.company.market_cap))
                              .replace('{esg}', sampleResponse.esg_score.total.toString())}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!showResponse && !error && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 shadow-lg rounded-2xl rounded-bl-md max-w-2xl">
                    <div className="flex items-center space-x-3 p-4 border-b border-gray-100">
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center shadow-md">
                        <i className="ri-robot-2-line text-white text-sm" aria-hidden="true"></i>
                      </div>
                      <span className="font-semibold text-gray-900">Claude</span>
                    </div>
                    <div className="p-6 text-center text-gray-500">
                      <i className="ri-message-3-line text-4xl mb-4 opacity-50" aria-hidden="true"></i>
                      <p>{t('home.searchDemo.startMessage')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          )}
          {/* End of toggle */}

          {/* Features highlight */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="text-center p-6 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <i className="ri-robot-2-line text-white text-xl" aria-hidden="true"></i>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{t('home.searchDemo.feature1.title')}</h3>
              <p className="text-gray-600 text-sm">{t('home.searchDemo.feature1.desc')}</p>
            </div>

            <div className="text-center p-6 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <i className="ri-database-2-line text-white text-xl" aria-hidden="true"></i>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{t('home.searchDemo.feature2.title')}</h3>
              <p className="text-gray-600 text-sm">{t('home.searchDemo.feature2.desc')}</p>
            </div>

            <div className="text-center p-6 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <i className="ri-speed-line text-white text-xl" aria-hidden="true"></i>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{t('home.searchDemo.feature3.title')}</h3>
              <p className="text-gray-600 text-sm">{t('home.searchDemo.feature3.desc')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}