'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    company: '',
    plan: 'beta',
    agreeToTerms: false,
    agreeToDisclaimer: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // localStorage縺九ｉ莠句燕蜈･蜉帙ョ繝ｼ繧ｿ繧貞叙蠕・    const pendingEmail = localStorage.getItem('pendingEmail');
    const selectedPlan = localStorage.getItem('selectedPlan');
    
    if (pendingEmail) {
      setFormData(prev => ({ ...prev, email: pendingEmail }));
      localStorage.removeItem('pendingEmail');
    }
    if (selectedPlan) {
      setFormData(prev => ({ ...prev, plan: selectedPlan }));
      localStorage.removeItem('selectedPlan');
    }
  }, []);

  const validateStep = (stepNumber: number) => {
    const newErrors: Record<string, string> = {};

    if (stepNumber === 1) {
      if (!formData.email) {
        newErrors.email = '繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ縺ｯ蠢・医〒縺・;
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = '譛牙柑縺ｪ繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ繧貞・蜉帙＠縺ｦ縺上□縺輔＞';
      }

      if (!formData.password) {
        newErrors.password = '繝代せ繝ｯ繝ｼ繝峨・蠢・医〒縺・;
      } else if (formData.password.length < 8) {
        newErrors.password = '繝代せ繝ｯ繝ｼ繝峨・8譁・ｭ嶺ｻ･荳翫↓縺励※縺上□縺輔＞';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = '繝代せ繝ｯ繝ｼ繝峨′荳閾ｴ縺励∪縺帙ｓ';
      }
    }

    if (stepNumber === 2) {
      if (!formData.name) {
        newErrors.name = '蜷榊燕縺ｯ蠢・医〒縺・;
      }
    }

    if (stepNumber === 3) {
      if (!formData.agreeToTerms) {
        newErrors.agreeToTerms = '蛻ｩ逕ｨ隕冗ｴ・∈縺ｮ蜷梧э縺悟ｿ・ｦ√〒縺・;
      }
      if (!formData.agreeToDisclaimer) {
        newErrors.agreeToDisclaimer = '蜈崎ｲｬ莠矩・∈縺ｮ蜷梧э縺悟ｿ・ｦ√〒縺・;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(3)) return;
    
    setIsLoading(true);
    
    try {
      // 螳滄圀縺ｮAPI蜻ｼ縺ｳ蜃ｺ縺・      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          company: formData.company,
          plan: formData.plan,
          agreeToTerms: formData.agreeToTerms,
          agreeToDisclaimer: formData.agreeToDisclaimer
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '逋ｻ骭ｲ縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
      }

      // 逋ｻ骭ｲ謌仙粥譎ゅ・蜃ｦ逅・      if (data.success) {
        // 繝ｦ繝ｼ繧ｶ繝ｼ繝・・繧ｿ繧鱈ocalStorage縺ｫ菫晏ｭ假ｼ・elcome繝壹・繧ｸ縺ｧ菴ｿ逕ｨ・・        localStorage.setItem('registrationData', JSON.stringify(data.user));
        
        // welcome繝壹・繧ｸ縺ｸ繝ｪ繝繧､繝ｬ繧ｯ繝・        router.push('/welcome');
      }
    } catch (error) {
      setIsLoading(false);
      
      // 繧ｨ繝ｩ繝ｼ繝｡繝・そ繝ｼ繧ｸ縺ｮ陦ｨ遉ｺ
      if (error instanceof Error) {
        if (error.message.includes('譌｢縺ｫ逋ｻ骭ｲ')) {
          setErrors({ email: '縺薙・繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ縺ｯ譌｢縺ｫ逋ｻ骭ｲ縺輔ｌ縺ｦ縺・∪縺・ });
          setStep(1); // Step 1縺ｫ謌ｻ繧・        } else {
          alert(`逋ｻ骭ｲ繧ｨ繝ｩ繝ｼ: ${error.message}`);
        }
      } else {
        alert('莠域悄縺励↑縺・お繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲ゅｂ縺・ｸ蠎ｦ縺願ｩｦ縺励￥縺縺輔＞縲・);
      }
    }
  };

  const plans = {
    beta: { name: '繝吶・繧ｿ繧｢繧ｯ繧ｻ繧ｹ', price: 'ﾂ･0', period: '20蟷ｴ蛻・, api: '1,000蝗・譛・, description: '迴ｾ蝨ｨ繝吶・繧ｿ迚医・螳悟・辟｡譁・ }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* 繝ｭ繧ｴ */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            XBRL雋｡蜍吶ョ繝ｼ繧ｿAPI
          </h1>
          <p className="text-gray-600">繧｢繧ｫ繧ｦ繝ｳ繝井ｽ懈・</p>
        </div>

        {/* 繝励Ο繧ｰ繝ｬ繧ｹ繝舌・ */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`w-2 h-2 mx-1`}></div>
            <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`w-2 h-2 mx-1`}></div>
            <div className={`flex-1 h-2 rounded-full ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span className={step === 1 ? 'font-bold text-blue-600' : ''}>繧｢繧ｫ繧ｦ繝ｳ繝域ュ蝣ｱ</span>
            <span className={step === 2 ? 'font-bold text-blue-600' : ''}>繝励Ο繝輔ぅ繝ｼ繝ｫ</span>
            <span className={step === 3 ? 'font-bold text-blue-600' : ''}>遒ｺ隱・/span>
          </div>
        </div>

        {/* 繝輔か繝ｼ繝 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit}>
            {/* Step 1: 繧｢繧ｫ繧ｦ繝ｳ繝域ュ蝣ｱ */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">繧｢繧ｫ繧ｦ繝ｳ繝域ュ蝣ｱ</h2>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="you@example.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    繝代せ繝ｯ繝ｼ繝・                  </label>
                  <input
                    type="password"
                    id="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="8譁・ｭ嶺ｻ･荳・
                  />
                  {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
                  
                  {/* 繝代せ繝ｯ繝ｼ繝牙ｼｷ蠎ｦ繧､繝ｳ繧ｸ繧ｱ繝ｼ繧ｿ繝ｼ */}
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        <div className={`h-1 flex-1 rounded ${formData.password.length >= 8 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                        <div className={`h-1 flex-1 rounded ${formData.password.length >= 12 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                        <div className={`h-1 flex-1 rounded ${formData.password.length >= 16 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        繝代せ繝ｯ繝ｼ繝牙ｼｷ蠎ｦ: {
                          formData.password.length < 8 ? '蠑ｱ縺・ :
                          formData.password.length < 12 ? '譎ｮ騾・ :
                          formData.password.length < 16 ? '蠑ｷ縺・ : '縺ｨ縺ｦ繧ょｼｷ縺・
                        }
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    繝代せ繝ｯ繝ｼ繝会ｼ育｢ｺ隱搾ｼ・                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="繝代せ繝ｯ繝ｼ繝峨ｒ蜀榊・蜉・
                  />
                  {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>}
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  谺｡縺ｸ 竊・                </button>
              </div>
            )}

            {/* Step 2: 繝励Ο繝輔ぅ繝ｼ繝ｫ */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">繝励Ο繝輔ぅ繝ｼ繝ｫ</h2>
                
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    縺雁錐蜑・<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="螻ｱ逕ｰ 螟ｪ驛・
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                    莨夂､ｾ蜷・<span className="text-gray-400">・井ｻｻ諢擾ｼ・/span>
                  </label>
                  <input
                    type="text"
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="譬ｪ蠑丈ｼ夂､ｾ縲・・
                  />
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    <span className="font-semibold">繝偵Φ繝・</span> 繝励Ο繝輔ぅ繝ｼ繝ｫ諠・ｱ縺ｯ蠕後°繧峨ム繝・す繝･繝懊・繝峨〒螟画峩縺ｧ縺阪∪縺吶・                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                  >
                    竊・謌ｻ繧・                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    谺｡縺ｸ 竊・                  </button>
                </div>
              </div>
            )}

            {/* Step 3: 繝吶・繧ｿ迚育｢ｺ隱・*/}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">繝吶・繧ｿ迚医∈繧医≧縺薙◎</h2>
                
                {/* 繝吶・繧ｿ迚医・迚ｹ蜈ｸ陦ｨ遉ｺ */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
                  <div className="flex items-center mb-4">
                    <div className="bg-white/20 rounded-full px-4 py-1 text-sm font-bold">
                      噫 繝吶・繧ｿ髯仙ｮ・                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-3">繝吶・繧ｿ繧｢繧ｯ繧ｻ繧ｹ</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>蜈ｨ20蟷ｴ蛻・・繝・・繧ｿ繧｢繧ｯ繧ｻ繧ｹ</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>1,000蝗・譛医・API蜻ｼ縺ｳ蜃ｺ縺・/span>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>蜈ｨ讖溯・縺ｸ縺ｮ繝輔Ν繧｢繧ｯ繧ｻ繧ｹ</span>
                    </div>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>豁｣蠑冗沿縺ｧ縺ｮ迚ｹ蛻･萓｡譬ｼ驕ｩ逕ｨ</span>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-white/20">
                    <div className="text-3xl font-bold">ﾂ･0<span className="text-lg font-normal">/譛・/span></div>
                    <p className="text-sm opacity-90 mt-1">豁｣蠑冗沿縺ｾ縺ｧ螳悟・辟｡譁・/p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">透 縺顔衍繧峨○:</span> 豁｣蠑冗沿繝ｪ繝ｪ繝ｼ繧ｹ譎ゅ・莠句燕縺ｫ繝｡繝ｼ繝ｫ縺ｧ縺顔衍繧峨○縺励√・繝ｼ繧ｿ蜿ょ刈閠・剞螳壹・迚ｹ蛻･萓｡譬ｼ繧偵＃譯亥・縺励∪縺吶・                  </p>
                </div>

                <div className="space-y-4">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={formData.agreeToTerms}
                      onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
                      className="mt-1 mr-3"
                    />
                    <span className="text-sm text-gray-600">
                      <a href="/terms" className="text-blue-600 hover:underline" target="_blank">蛻ｩ逕ｨ隕冗ｴ・/a>縺翫ｈ縺ｳ
                      <a href="/privacy" className="text-blue-600 hover:underline" target="_blank">繝励Λ繧､繝舌す繝ｼ繝昴Μ繧ｷ繝ｼ</a>縺ｫ蜷梧э縺励∪縺・                    </span>
                  </label>
                  {errors.agreeToTerms && <p className="text-sm text-red-500">{errors.agreeToTerms}</p>}

                  {/* 謚戊ｳ・勧險蜈崎ｲｬ莠矩・*/}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">笞・・驥崎ｦ√↑蜈崎ｲｬ莠矩・/h4>
                    <div className="text-sm text-gray-700 space-y-2 mb-3">
                      <p>譛ｬ繧ｵ繝ｼ繝薙せ縺ｯ莉･荳九・轤ｹ縺ｫ縺､縺・※縺皮炊隗｣縺・◆縺縺丞ｿ・ｦ√′縺ゅｊ縺ｾ縺呻ｼ・/p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>謠蝉ｾ帙☆繧九ョ繝ｼ繧ｿ縺ｯ<strong>諠・ｱ謠蝉ｾ帙・縺ｿ</strong>繧堤岼逧・→縺励※縺・∪縺・/li>
                        <li><strong>謚戊ｳ・勧險繝ｻ謚戊ｳ・匡隱倥ｒ陦後≧繧ゅ・縺ｧ縺ｯ縺ゅｊ縺ｾ縺帙ｓ</strong></li>
                        <li>謚戊ｳ・愛譁ｭ縺ｯ蠢・★縺碑・霄ｫ縺ｮ雋ｬ莉ｻ縺ｧ陦後▲縺ｦ縺上□縺輔＞</li>
                        <li>繝・・繧ｿ蛻ｩ逕ｨ縺ｫ繧医ｋ謳榊､ｱ縺ｫ縺､縺・※荳蛻・ｲｬ莉ｻ繧定ｲ縺・∪縺帙ｓ</li>
                        <li>驥題檮蝠・刀蜿門ｼ墓ｳ輔↓蝓ｺ縺･縺乗兜雉・勧險讌ｭ縺ｮ逋ｻ骭ｲ縺ｯ陦後▲縺ｦ縺翫ｊ縺ｾ縺帙ｓ</li>
                      </ul>
                    </div>
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        checked={formData.agreeToDisclaimer}
                        onChange={(e) => setFormData({ ...formData, agreeToDisclaimer: e.target.checked })}
                        className="mt-1 mr-3"
                      />
                      <span className="text-sm font-medium text-gray-800">
                        荳願ｨ倥・蜈崎ｲｬ莠矩・ｒ逅・ｧ｣縺励∵悽繧ｵ繝ｼ繝薙せ縺梧兜雉・勧險縺ｧ縺ｯ縺ｪ縺・％縺ｨ縺ｫ蜷梧э縺励∪縺・                      </span>
                    </label>
                  </div>
                  {errors.agreeToDisclaimer && <p className="text-sm text-red-500">{errors.agreeToDisclaimer}</p>}
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                  >
                    竊・謌ｻ繧・                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        逋ｻ骭ｲ荳ｭ...
                      </span>
                    ) : (
                      '逋ｻ骭ｲ縺吶ｋ'
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* 繝ｭ繧ｰ繧､繝ｳ繝ｪ繝ｳ繧ｯ */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            縺吶〒縺ｫ繧｢繧ｫ繧ｦ繝ｳ繝医ｒ縺頑戟縺｡縺ｧ縺吶°・毬' '}
            <a href="/login" className="text-blue-600 hover:underline font-semibold">
              繝ｭ繧ｰ繧､繝ｳ
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
