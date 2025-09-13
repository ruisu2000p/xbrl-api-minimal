'use client';

import { useState, useEffect } from 'react';
import { Search, Database, Calendar, Download, ChevronRight, FileText, TrendingUp } from 'react-feather';

interface Company {
  id: string;
  name?: string;
  ticker?: string;
  sector?: string;
  hasData2016?: boolean;
  hasData2021?: boolean;
}

interface FinancialData {
  revenue?: string;
  operating_income?: string;
  ordinary_income?: string;
  net_income?: string;
  total_assets?: string;
  net_assets?: string;
}

export default function DataExplorer() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedYear, setSelectedYear] = useState<'2016' | '2021'>('2021');
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dataContent, setDataContent] = useState('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  // 初期データ読み込み
  useEffect(() => {
    loadCompanies();
    checkAvailableYears();
  }, []);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/companies?per_page=100', {
        headers: {
          'X-API-Key': localStorage.getItem('apiKey') || 'xbrl_live_12b1a708907167ad8620537e90ba0afbcdd43a83cad80830',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAvailableYears = async () => {
    try {
      const response = await fetch('/api/data-explorer/available-years');
      if (response.ok) {
        const data = await response.json();
        setAvailableYears(data.years || ['2016', '2021']);
      }
    } catch (error) {
      console.error('Error checking years:', error);
      setAvailableYears(['2016', '2021']);
    }
  };

  const searchCompanies = async () => {
    if (!searchTerm) {
      loadCompanies();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/v1/companies?search=${encodeURIComponent(searchTerm)}&per_page=50`, {
        headers: {
          'X-API-Key': localStorage.getItem('apiKey') || 'xbrl_live_12b1a708907167ad8620537e90ba0afbcdd43a83cad80830',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error('Error searching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFinancialData = async (company: Company, year: '2016' | '2021') => {
    setLoading(true);
    setFinancialData(null);
    setDataContent('');
    
    try {
      const response = await fetch('/api/data-explorer/financial-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: company.id,
          fiscalYear: year,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setFinancialData(data.financial_metrics || {});
        setDataContent(data.content_preview || '');
      }
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadData = async () => {
    if (!selectedCompany) return;
    
    try {
      const response = await fetch('/api/data-explorer/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: selectedCompany.id,
          fiscalYear: selectedYear,
        }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedCompany.id}_FY${selectedYear}.md`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading data:', error);
    }
  };

  const filteredCompanies = companies.filter(c => 
    !searchTerm || 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Database className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">XBRL データエクスプローラー</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                総企業数: {companies.length.toLocaleString()}社
              </span>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value as '2016' | '2021');
                  if (selectedCompany) {
                    loadFinancialData(selectedCompany, e.target.value as '2016' | '2021');
                  }
                }}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                <option value="2021">FY2021 (最新)</option>
                <option value="2016">FY2016</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左側: 企業リスト */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="企業名またはIDで検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchCompanies()}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              <div className="max-h-[600px] overflow-y-auto">
                {loading && (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                )}
                
                {!loading && filteredCompanies.map((company) => (
                  <div
                    key={company.id}
                    onClick={() => {
                      setSelectedCompany(company);
                      loadFinancialData(company, selectedYear);
                    }}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedCompany?.id === company.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 text-sm">
                          {company.name || company.id}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          ID: {company.id}
                          {company.ticker && ` | ${company.ticker}`}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右側: 詳細データ */}
          <div className="lg:col-span-2">
            {selectedCompany ? (
              <div className="space-y-6">
                {/* 企業情報ヘッダー */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {selectedCompany.name || selectedCompany.id}
                      </h2>
                      <p className="text-gray-500 mt-1">
                        企業ID: {selectedCompany.id}
                        {selectedCompany.sector && ` | セクター: ${selectedCompany.sector}`}
                      </p>
                    </div>
                    <button
                      onClick={downloadData}
                      className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>ダウンロード</span>
                    </button>
                  </div>
                </div>

                {/* 財務指標 */}
                {financialData && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2 text-indigo-600" />
                      財務指標（{selectedYear === '2021' ? '2021年3月期' : '2015年3月期'}）
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {financialData.revenue && (
                        <div className="bg-gray-50 p-4 rounded">
                          <p className="text-sm text-gray-500">売上高</p>
                          <p className="text-lg font-semibold text-gray-900">{financialData.revenue}</p>
                          <p className="text-xs text-gray-500">百万円</p>
                        </div>
                      )}
                      {financialData.operating_income && (
                        <div className="bg-gray-50 p-4 rounded">
                          <p className="text-sm text-gray-500">営業利益</p>
                          <p className="text-lg font-semibold text-gray-900">{financialData.operating_income}</p>
                          <p className="text-xs text-gray-500">百万円</p>
                        </div>
                      )}
                      {financialData.ordinary_income && (
                        <div className="bg-gray-50 p-4 rounded">
                          <p className="text-sm text-gray-500">経常利益</p>
                          <p className="text-lg font-semibold text-gray-900">{financialData.ordinary_income}</p>
                          <p className="text-xs text-gray-500">百万円</p>
                        </div>
                      )}
                      {financialData.net_income && (
                        <div className="bg-gray-50 p-4 rounded">
                          <p className="text-sm text-gray-500">当期純利益</p>
                          <p className="text-lg font-semibold text-gray-900">{financialData.net_income}</p>
                          <p className="text-xs text-gray-500">百万円</p>
                        </div>
                      )}
                      {financialData.total_assets && (
                        <div className="bg-gray-50 p-4 rounded">
                          <p className="text-sm text-gray-500">総資産</p>
                          <p className="text-lg font-semibold text-gray-900">{financialData.total_assets}</p>
                          <p className="text-xs text-gray-500">百万円</p>
                        </div>
                      )}
                      {financialData.net_assets && (
                        <div className="bg-gray-50 p-4 rounded">
                          <p className="text-sm text-gray-500">純資産</p>
                          <p className="text-lg font-semibold text-gray-900">{financialData.net_assets}</p>
                          <p className="text-xs text-gray-500">百万円</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* データプレビュー */}
                {dataContent && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-indigo-600" />
                      データプレビュー
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {dataContent.substring(0, 1000)}...
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12">
                <div className="text-center">
                  <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    企業を選択してください
                  </h3>
                  <p className="text-gray-500">
                    左側のリストから企業を選択すると、財務データが表示されます
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}