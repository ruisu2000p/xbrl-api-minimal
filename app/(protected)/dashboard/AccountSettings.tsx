'use client';

import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ApiKey } from '@/types/api-key';
import ApiKeyDisplay from '@/components/ApiKeyDisplay';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useSupabase } from '@/components/SupabaseProvider';
import { useLanguage } from '@/contexts/LanguageContext';
import AccountDeletionSection from '../../(dashboard)/settings/AccountDeletionSection';

type TabId = 'profile' | 'plan' | 'api';

type Message = {
  type: 'success' | 'error';
  text: string;
} | null;

type ProfileState = {
  email: string;
  name: string;
  company: string;
};

type ApiState = 'idle' | 'loading' | 'ready' | 'error';

// Plan structures will use translation keys
const getDefaultCurrentPlan = (t: (key: string) => string, subscription?: any) => {
  const planName = subscription?.subscription_plans?.name || 'freemium';
  const billingCycle = subscription?.billing_cycle; // 'monthly' or 'yearly'

  // Determine the plan ID based on name and billing cycle
  let planId = planName;
  if (planName === 'standard' && billingCycle) {
    planId = `standard-${billingCycle}`;
  }

  // Determine the display name
  let displayName = planName === 'standard'
    ? t('dashboard.settings.plan.standard.name')
    : t('dashboard.settings.plan.freemium.name');

  // Determine the price display
  let displayPrice = t('dashboard.settings.plan.freemium.price');
  if (planName === 'standard') {
    if (billingCycle === 'yearly') {
      displayPrice = t('dashboard.settings.plan.standard.yearlyPrice');
    } else {
      displayPrice = t('dashboard.settings.plan.standard.monthlyPrice');
    }
  }

  return {
    id: planId,
    name: displayName,
    price: displayPrice,
    nextBilling: subscription?.current_period_end
      ? new Date(subscription.current_period_end).toLocaleDateString()
      : '未設定',
    status: subscription?.status === 'active'
      ? t('dashboard.settings.plan.currentPlanStatus')
      : '未契約'
  };
};

const getPlanOptions = (t: (key: string) => string) => [
  {
    id: 'freemium',
    name: t('dashboard.settings.plan.freemium.name'),
    price: t('dashboard.settings.plan.freemium.price'),
    description: t('dashboard.settings.plan.freemium.description'),
    highlights: [
      t('dashboard.settings.plan.freemium.feature1'),
      t('dashboard.settings.plan.freemium.feature2'),
      t('dashboard.settings.plan.freemium.feature3')
    ],
    recommended: false,
    billingPeriod: null
  },
  {
    id: 'standard-monthly',
    name: t('dashboard.settings.plan.standard.name'),
    price: t('dashboard.settings.plan.standard.monthlyPrice'),
    billingPeriodLabel: t('dashboard.settings.plan.billingPeriod.monthly'),
    description: t('dashboard.settings.plan.standard.description'),
    highlights: [
      t('dashboard.settings.plan.standard.feature1'),
      t('dashboard.settings.plan.standard.feature2'),
      t('dashboard.settings.plan.standard.feature3'),
      t('dashboard.settings.plan.standard.feature4')
    ],
    recommended: false,
    billingPeriod: 'monthly' as const,
    stripeProductId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID || 'price_1SGVArBhdDcfCsmvM54B7xdN'
  },
  {
    id: 'standard-yearly',
    name: t('dashboard.settings.plan.standard.name'),
    price: t('dashboard.settings.plan.standard.yearlyPrice'),
    priceSubtext: t('dashboard.settings.plan.standard.yearlyEquivalent'),
    billingPeriodLabel: t('dashboard.settings.plan.billingPeriod.yearly'),
    description: t('dashboard.settings.plan.standard.description'),
    highlights: [
      t('dashboard.settings.plan.standard.feature1'),
      t('dashboard.settings.plan.standard.feature2'),
      t('dashboard.settings.plan.standard.feature3'),
      t('dashboard.settings.plan.standard.feature4')
    ],
    recommended: true,
    discountBadge: t('dashboard.settings.plan.yearlyDiscount'),
    billingPeriod: 'yearly' as const,
    stripeProductId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID || 'price_1SGVLZBhdDcfCsmvFa5iVe8r'
  }
] as const;

// 請求履歴は実際のデータを取得するか、空の状態で表示
const BILLING_HISTORY: Array<{date: string; amount: string; status: string}> = [];

// プロフィールの初期値（実際のユーザー情報で上書きされる）
const INITIAL_PROFILE: ProfileState = {
  email: '',
  name: '',
  company: ''
};

interface ProfileTabProps {
  profile: ProfileState;
  originalProfile: ProfileState;
  message: Message;
  onChange: (field: keyof ProfileState, value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  t: (key: string) => string;
}

function ProfileTab({ profile, originalProfile, message, onChange, onSave, isSaving, t }: ProfileTabProps) {
  // 変更があるかどうかをチェック
  const hasChanges = profile.email !== originalProfile.email || profile.name !== originalProfile.name || profile.company !== originalProfile.company;
  const emailChanged = profile.email !== originalProfile.email;

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 未保存の変更警告 */}
      {hasChanges && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <div className="flex items-center gap-2">
            <i className="ri-alert-line text-amber-600"></i>
            <span className="text-amber-800 font-medium">{t('dashboard.settings.profile.unsavedChanges')}</span>
          </div>
          {emailChanged && (
            <p className="mt-2 text-xs text-amber-700">
              {t('dashboard.settings.profile.emailChangeNote')}
            </p>
          )}
        </div>
      )}

      {/* Current Profile Information */}
      {originalProfile.email && (
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('dashboard.settings.profile.currentInfoTitle')}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs text-gray-600 mb-1">{t('dashboard.settings.profile.emailLabel')}</p>
              <p className="text-sm font-medium text-gray-900">{originalProfile.email}</p>
            </div>
            {originalProfile.name && (
              <div>
                <p className="text-xs text-gray-600 mb-1">{t('dashboard.settings.profile.nameLabel')}</p>
                <p className="text-sm font-medium text-gray-900">{originalProfile.name}</p>
              </div>
            )}
            {originalProfile.company && (
              <div>
                <p className="text-xs text-gray-600 mb-1">{t('dashboard.settings.profile.companyLabel')}</p>
                <p className="text-sm font-medium text-gray-900">{originalProfile.company}</p>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="profile-email" className="mb-2 block text-sm font-medium text-gray-700">{t('dashboard.settings.profile.emailLabel')}</label>
          <input
            id="profile-email"
            name="email"
            type="email"
            value={profile.email}
            onChange={(event) => onChange('email', event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('dashboard.settings.profile.emailPlaceholder')}
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="profile-name" className="mb-2 block text-sm font-medium text-gray-700">{t('dashboard.settings.profile.nameLabel')}</label>
          <input
            id="profile-name"
            name="name"
            type="text"
            value={profile.name}
            onChange={(event) => onChange('name', event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('dashboard.settings.profile.namePlaceholder')}
            autoComplete="name"
          />
        </div>
      </section>

      <div>
        <label htmlFor="profile-company" className="mb-2 block text-sm font-medium text-gray-700">{t('dashboard.settings.profile.companyLabel')}</label>
        <input
          id="profile-company"
          name="company"
          type="text"
          value={profile.company}
          onChange={(event) => onChange('company', event.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={t('dashboard.settings.profile.companyPlaceholder')}
          autoComplete="organization"
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={isSaving || !hasChanges}
          className={`flex items-center space-x-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors ${
            isSaving || !hasChanges
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>{t('dashboard.settings.profile.saving')}</span>
            </>
          ) : (
            <>
              <i className="ri-save-line"></i>
              <span>{t('dashboard.settings.profile.saveButton')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

interface PlanTabProps {
  currentPlan: ReturnType<typeof getDefaultCurrentPlan>;
  selectedPlan: string;
  message: Message;
  onSelectPlan: (planId: string) => void;
  onUpdatePlan: () => void;
  planOptions: ReturnType<typeof getPlanOptions>;
  trialInfo: any;
  t: (key: string) => string;
}

function PlanTab({ currentPlan, selectedPlan, message, onSelectPlan, onUpdatePlan, planOptions, trialInfo, t }: PlanTabProps) {
  return (
    <div className="space-y-8">
      {message && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            message.type === 'success'
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Current Plan Section */}
      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
              <i className="ri-vip-crown-line text-xl"></i>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{currentPlan.name}</h3>
              <p className="text-blue-600">{currentPlan.price}</p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              <i className="ri-check-line mr-1"></i>
              {currentPlan.status}
            </span>
            <span className="text-xs text-gray-600">{t('dashboard.settings.plan.nextBillingLabel')} {currentPlan.nextBilling}</span>
          </div>
        </div>
      </section>

      {/* Trial Period Banner - Only show for freemium users with trial info */}
      {currentPlan.id === 'freemium' && trialInfo && (
        <div className={`rounded-2xl border p-4 ${
          trialInfo.is_trial_active && trialInfo.days_remaining > 3
            ? 'border-blue-200 bg-blue-50'
            : trialInfo.is_trial_active && trialInfo.days_remaining <= 3
            ? 'border-amber-200 bg-amber-50'
            : 'border-red-200 bg-red-50'
        }`}>
          <div className="flex items-start gap-3">
            <i className={`text-2xl ${
              trialInfo.is_trial_active && trialInfo.days_remaining > 3
                ? 'ri-time-line text-blue-600'
                : trialInfo.is_trial_active && trialInfo.days_remaining <= 3
                ? 'ri-error-warning-line text-amber-600'
                : 'ri-close-circle-line text-red-600'
            }`}></i>
            <div className="flex-1">
              <h4 className={`font-semibold ${
                trialInfo.is_trial_active && trialInfo.days_remaining > 3
                  ? 'text-blue-900'
                  : trialInfo.is_trial_active && trialInfo.days_remaining <= 3
                  ? 'text-amber-900'
                  : 'text-red-900'
              }`}>
                {trialInfo.is_trial_active
                  ? t('dashboard.settings.plan.trial.active').replace('{days}', trialInfo.days_remaining.toString())
                  : t('dashboard.settings.plan.trial.expired')}
              </h4>
              <p className={`text-sm mt-1 ${
                trialInfo.is_trial_active && trialInfo.days_remaining > 3
                  ? 'text-blue-700'
                  : trialInfo.is_trial_active && trialInfo.days_remaining <= 3
                  ? 'text-amber-700'
                  : 'text-red-700'
              }`}>
                {trialInfo.is_trial_active
                  ? t('dashboard.settings.plan.trial.expiresOn').replace('{date}', new Date(trialInfo.trial_ends_at).toLocaleDateString())
                  : t('dashboard.settings.plan.trial.expiredMessage')}
              </p>
              {!trialInfo.is_trial_active && (
                <button
                  onClick={() => {
                    onSelectPlan('standard-yearly');
                    setTimeout(() => onUpdatePlan(), 100);
                  }}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-blue-700 hover:to-indigo-700"
                >
                  <i className="ri-vip-crown-line"></i>
                  <span>{t('dashboard.settings.plan.trial.upgradeCta')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <section className="grid gap-6 md:grid-cols-3">
        {planOptions.map((plan) => {
          const isSelected = plan.id === selectedPlan;
          const isCurrent = plan.id === currentPlan.id;

          return (
            <button
              key={plan.id}
              onClick={() => onSelectPlan(plan.id)}
              className={`flex h-full flex-col rounded-2xl border text-left transition-colors relative ${
                isSelected
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-200'
              } ${plan.recommended || ('discountBadge' in plan && plan.discountBadge) ? 'overflow-hidden pt-16 px-6 pb-6' : 'p-6'}`}
            >
              {isCurrent && (
                <span className="absolute right-4 top-4 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                  {t('dashboard.settings.plan.currentPlanBadge')}
                </span>
              )}
              {plan.recommended && (
                <span className="absolute right-4 top-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-3 py-1 text-xs font-semibold text-white">
                  {t('dashboard.settings.plan.recommendedBadge')}
                </span>
              )}
              {'discountBadge' in plan && plan.discountBadge && (
                <span className="absolute right-4 top-20 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-3 py-1 text-xs font-semibold text-white">
                  {plan.discountBadge}
                </span>
              )}

              <div>
                <h4 className="text-lg font-semibold text-gray-900">{plan.name}</h4>
                {'billingPeriodLabel' in plan && plan.billingPeriodLabel && (
                  <span className="mt-1 inline-block rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {plan.billingPeriodLabel}
                  </span>
                )}
                {plan.description && !plan.description.startsWith('dashboard.') && (
                  <p className="mt-1 text-sm text-gray-600">{plan.description}</p>
                )}
              </div>

              <div className="mt-4">
                <div className="text-2xl font-bold text-gray-900">{plan.price}</div>
                {'priceSubtext' in plan && plan.priceSubtext && (
                  <div className="mt-1 text-xs text-gray-500">{plan.priceSubtext}</div>
                )}
              </div>

              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                {plan.highlights.filter(item => item.trim() !== '' && !item.startsWith('dashboard.')).map((item) => (
                  <li key={item} className="flex items-center">
                    <i className="ri-check-line mr-2 text-green-500"></i>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">
                  {isSelected ? t('dashboard.settings.plan.selectedLabel') : t('dashboard.settings.plan.clickSelectLabel')}
                </span>
                <span className={`h-4 w-4 rounded-full border ${
                  isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-400'
                }`}></span>
              </div>
            </button>
          );
        })}
      </section>

      <div className="space-y-4 rounded-2xl border border-gray-200 p-6">
        <h4 className="text-sm font-semibold text-gray-900">{t('dashboard.settings.plan.billingHistoryTitle')}</h4>
        {BILLING_HISTORY.length > 0 ? (
          <ul className="space-y-3 text-sm text-gray-600">
            {BILLING_HISTORY.map((item) => (
              <li key={item.date} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span>{item.date}</span>
                <div className="flex items-center space-x-4">
                  <span className="font-medium text-gray-900">{item.amount}</span>
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">{item.status}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">{t('dashboard.settings.plan.noBillingHistory')}</p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onUpdatePlan}
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          {t('dashboard.settings.plan.updateButton')}
        </button>
      </div>
    </div>
  );
}

interface ApiKeyTabProps {
  apiKeys: ApiKey[];
  status: ApiState;
  message: Message;
  generatedKey: string | null;
  newKeyName: string;
  isCreating: boolean;
  onReload: () => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onChangeName: (value: string) => void;
  onCopy: (value: string) => void;
  t: (key: string) => string;
}

function ApiKeyTab({
  apiKeys,
  status,
  message,
  generatedKey,
  newKeyName,
  isCreating,
  onReload,
  onCreate,
  onDelete,
  onChangeName,
  onCopy,
  t
}: ApiKeyTabProps) {
  const isLoading = status === 'loading' || status === 'idle';

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {generatedKey && (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
          <h4 className="text-sm font-semibold text-yellow-800">{t('dashboard.settings.api.newKeyTitle')}</h4>
          <p className="mt-2 text-xs text-yellow-700">{t('dashboard.settings.api.newKeyWarning')}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <code className="flex-1 break-all rounded-lg bg-white px-4 py-3 text-sm text-gray-800 shadow-inner">{generatedKey}</code>
            <button
              onClick={() => onCopy(generatedKey)}
              className="flex items-center space-x-2 rounded-lg border border-yellow-300 px-4 py-2 text-sm font-medium text-yellow-800 transition-colors hover:bg-yellow-100"
            >
              <i className="ri-file-copy-line"></i>
              <span>{t('dashboard.settings.api.copyButton')}</span>
            </button>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
        <div className="flex items-start gap-3">
          <i className="ri-information-line text-xl text-blue-600"></i>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900">{t('dashboard.settings.api.mcpTitle')}</h3>
            <p className="mt-2 text-sm text-blue-700">{t('dashboard.settings.api.mcpDescription')}</p>

            <div className="mt-4">
              <p className="text-sm font-medium text-blue-800">{t('dashboard.settings.api.mcpConfigPath')}</p>
              <code className="mt-1 block rounded-lg bg-white px-3 py-2 text-xs text-gray-800">
                {typeof navigator !== 'undefined' && navigator.platform.includes('Win')
                  ? '%APPDATA%\\Claude\\claude_desktop_config.json'
                  : typeof navigator !== 'undefined' && navigator.platform.includes('Mac')
                  ? '~/Library/Application Support/Claude/claude_desktop_config.json'
                  : '~/.config/Claude/claude_desktop_config.json'}
              </code>
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium text-blue-800">{t('dashboard.settings.api.mcpConfigExample')}</p>
              <pre className="mt-1 overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-green-400">
{`{
  "mcpServers": {
    "xbrl-financial": {
      "command": "npx",
      "args": ["shared-supabase-mcp-minimal@8.2.9"],
      "env": {
        "XBRL_API_KEY": "your-api-key-here"
      }
    }
  }
}`}</pre>
            </div>

            <p className="mt-3 text-xs text-blue-600">{t('dashboard.settings.api.mcpRestart')}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <label htmlFor="api-key-name" className="mb-2 block text-sm font-medium text-gray-700">{t('dashboard.settings.api.newKeyLabel')}</label>
            <input
              id="api-key-name"
              name="apiKeyName"
              type="text"
              value={newKeyName}
              onChange={(event) => onChangeName(event.target.value)}
              placeholder={t('dashboard.settings.api.newKeyPlaceholder')}
              autoComplete="off"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onReload}
              type="button"
              className="flex items-center space-x-2 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <i className="ri-refresh-line"></i>
              <span>{t('dashboard.settings.api.reloadButton')}</span>
            </button>
            <button
              onClick={onCreate}
              disabled={isCreating || newKeyName.trim().length === 0}
              className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              <i className="ri-add-line"></i>
              <span>{isCreating ? t('dashboard.settings.api.creatingButton') : t('dashboard.settings.api.createButton')}</span>
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.settings.api.listTitle')}</h3>
          <span className="text-sm text-gray-500">{t('dashboard.settings.api.countLabel').replace('{count}', String(apiKeys.length))}</span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-12 text-gray-500">
            <i className="ri-loader-4-line animate-spin text-2xl"></i>
            <span>{t('dashboard.settings.api.loadingMessage')}</span>
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-gray-500">
            <i className="ri-key-line text-3xl"></i>
            <p className="mt-3 text-sm">{t('dashboard.settings.api.noKeysMessage')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{key.name}</span>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-600">
                      {t('dashboard.settings.api.activeBadge')}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-col gap-1 text-xs text-gray-500 md:flex-row md:items-center md:gap-4">
                    <span>{t('dashboard.settings.api.createdLabel')} {key.created}</span>
                    <span>{t('dashboard.settings.api.lastUsedLabel')} {key.lastUsed}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onCopy(key.key)}
                    className="flex items-center space-x-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <i className="ri-file-copy-line"></i>
                    <span>{t('dashboard.settings.api.copyButton')}</span>
                  </button>
                  <button
                    onClick={() => onDelete(key.id)}
                    className="flex items-center space-x-1 rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
                  >
                    <i className="ri-delete-bin-line"></i>
                    <span>{t('dashboard.settings.api.deleteButton')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function AccountSettings() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: supabaseLoading, supabase: supabaseClient } = useSupabase();
  const { t } = useLanguage();

  // 新規アカウントの場合はAPIキータブを初期表示
  const isNewAccount = searchParams.get('newAccount') === 'true';
  const initialTab = isNewAccount ? 'api' : 'profile';

  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [profile, setProfile] = useState<ProfileState>(INITIAL_PROFILE);
  const [originalProfile, setOriginalProfile] = useState<ProfileState>(INITIAL_PROFILE); // 元の値を保持
  const [profileMessage, setProfileMessage] = useState<Message>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Create plan options using translation function
  const planOptions = useMemo(() => getPlanOptions(t), [t]);
  const [userSubscription, setUserSubscription] = useState<any>(null);
  const [trialInfo, setTrialInfo] = useState<any>(null);
  const defaultCurrentPlan = useMemo(() => getDefaultCurrentPlan(t, userSubscription), [t, userSubscription]);

  const [selectedPlan, setSelectedPlan] = useState<string>(defaultCurrentPlan.id);
  const [currentPlan, setCurrentPlan] = useState(defaultCurrentPlan);
  const [planMessage, setPlanMessage] = useState<Message>(null);

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiStatus, setApiStatus] = useState<ApiState>('idle');
  const [apiMessage, setApiMessage] = useState<Message>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isKeyCopied, setIsKeyCopied] = useState(false);

  // ダイアログ関連の状態
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // 認証状態をSupabaseProviderから取得
  const isAuthenticated = !!user;
  const checkingAuth = supabaseLoading;

  // セッション確認フラグ（初回読み込み時の早すぎるリダイレクトを防ぐ）
  const [sessionChecked, setSessionChecked] = useState(false);
  const [redirectTimer, setRedirectTimer] = useState<NodeJS.Timeout | null>(null);

  // リダイレクト済みかどうかを記録（useRefで永続化）
  const hasRedirected = useRef(false);

  // 初回マウント時に認証状態をチェック（改善版）
  useEffect(() => {
    // まだローディング中なら何もしない
    if (supabaseLoading) {
      console.log('⏳ Supabaseセッション読み込み中...');
      return;
    }

    // ユーザーが存在すれば認証済み
    if (user) {
      console.log('✅ 認証済みユーザー:', user.email);
      // 既存のタイマーをクリア
      if (redirectTimer) {
        clearTimeout(redirectTimer);
        setRedirectTimer(null);
      }
      setSessionChecked(true);
      hasRedirected.current = false; // ユーザーがいる場合はリセット
      return;
    }

    // 初回チェック時は少し待つ（セッション復元のため）
    if (!sessionChecked) {
      console.log('🔍 セッション復元を待機中...');
      const timer = setTimeout(() => {
        // 再度チェックして、まだユーザーがいなければリダイレクト
        if (!user && !supabaseLoading && !hasRedirected.current) {
          console.log('❌ セッション復元タイムアウト。ログインページへリダイレクトします。');
          hasRedirected.current = true; // リダイレクト済みとマーク
          router.replace('/login'); // replaceを使用して履歴に残さない
        }
        setSessionChecked(true);
      }, 5000); // 5秒待機（新規登録後のセッション復元に十分な時間を与える）

      setRedirectTimer(timer);
      return () => {
        if (timer) clearTimeout(timer);
      };
    }

    // セッションチェック済みで、ユーザーがいない場合
    if (sessionChecked && !user && !supabaseLoading && !hasRedirected.current) {
      console.log('❌ 認証されていません。ログインページへリダイレクトします。');
      hasRedirected.current = true; // リダイレクト済みとマーク
      router.replace('/login'); // replaceを使用して履歴に残さない
    }
  }, [user, supabaseLoading, sessionChecked]); // router と redirectTimer を依存配列から削除

  // プロフィールが読み込み済みかどうかを追跡（useRefで再レンダリングを防ぐ）
  const profileLoadedRef = useRef(false);

  // ユーザー情報でプロフィールを初期化（一度だけ実行）
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user && !profileLoadedRef.current) {
        console.log('📋 Loading user profile:', {
          email: user.email,
          metadata: user.user_metadata,
          app_metadata: user.app_metadata
        });

        // user_metadataから情報を取得
        const name = user.user_metadata?.name || user.user_metadata?.full_name || '';
        const company = user.user_metadata?.company || '';

        const profileData = {
          email: user.email || '',
          name: name,
          company: company
        };

        setProfile(profileData);
        setOriginalProfile(profileData); // 元の値も保存

        profileLoadedRef.current = true;
        console.log('✅ Profile loaded:', { email: user.email, name, company });
      }
    };

    void loadUserProfile();
  }, [user]); // profileLoadedを依存配列から削除

  // サブスクリプション情報を取得（再利用可能なコールバック）
  const refreshSubscription = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🔄 Refreshing subscription data...');

      // Use new subscription status API
      const response = await fetch('/api/subscription/status');
      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Error fetching subscription:', data.error);
        setUserSubscription(null);
        setCurrentPlan(getDefaultCurrentPlan(t, null));
        setSelectedPlan('freemium');
        return;
      }

      const { subscription, trial } = data;

      // Store trial info
      setTrialInfo(trial);

      if (!subscription || !subscription.subscription_plans) {
        console.log('📋 No subscription found, using freemium');
        setUserSubscription(null);
        setCurrentPlan(getDefaultCurrentPlan(t, null));
        setSelectedPlan('freemium');
        return;
      }

      console.log('✅ Subscription refreshed:', subscription);
      setUserSubscription(subscription);
      setCurrentPlan(getDefaultCurrentPlan(t, subscription));

      // Set selected plan based on plan name and billing cycle
      const planName = subscription.subscription_plans.name;
      const billingCycle = subscription.billing_cycle;

      if (planName === 'standard' && billingCycle) {
        setSelectedPlan(`standard-${billingCycle}`);
      } else {
        setSelectedPlan(planName || 'freemium');
      }
    } catch (err) {
      console.error('❌ Error loading subscription:', err);
    }
  }, [user, t]);

  // Load subscription on mount
  useEffect(() => {
    void refreshSubscription();
  }, [user, t]); // Fixed: Use direct dependencies instead of callback reference

  // Poll subscription after Stripe Checkout success
  useEffect(() => {
    const paymentSuccess = searchParams.get('payment_success');
    const sessionId = searchParams.get('session_id');

    if (paymentSuccess === 'true' && sessionId) {
      console.log('💳 Payment success detected, polling for subscription update...');

      let pollCount = 0;
      const maxPolls = 10; // Poll for up to 20 seconds (10 * 2s)
      const pollInterval = 2000; // 2 seconds

      const pollTimer = setInterval(async () => {
        pollCount++;
        console.log(`🔄 Polling subscription status (attempt ${pollCount}/${maxPolls})...`);

        try {
          const response = await fetch('/api/subscription/status');
          const data = await response.json();

          if (response.ok && data.subscription) {
            const { subscription } = data;

            // Check if subscription is active and has a Stripe subscription ID
            if (subscription.status === 'active' && subscription.stripe_subscription_id) {
              console.log('✅ Subscription updated successfully!');

              // Update UI
              setUserSubscription(subscription);
              setCurrentPlan(getDefaultCurrentPlan(t, subscription));

              const planName = subscription.subscription_plans?.name;
              const billingCycle = subscription.billing_cycle;

              if (planName === 'standard' && billingCycle) {
                setSelectedPlan(`standard-${billingCycle}`);
              } else {
                setSelectedPlan(planName || 'freemium');
              }

              setPlanMessage({
                type: 'success',
                text: t('dashboard.settings.plan.successPlanChange')
              });

              clearInterval(pollTimer);

              // Clean up URL parameters
              router.replace('/dashboard');
              return;
            }
          }

          // Stop polling after max attempts
          if (pollCount >= maxPolls) {
            console.log('⏰ Polling timeout - subscription may take longer to update');
            setPlanMessage({
              type: 'success',
              text: '決済が完了しました。プランの反映まで少しお待ちください。'
            });
            clearInterval(pollTimer);

            // Clean up URL parameters
            router.replace('/dashboard');
          }
        } catch (error) {
          console.error('❌ Error polling subscription:', error);

          // Stop polling on error
          if (pollCount >= maxPolls) {
            clearInterval(pollTimer);
            router.replace('/dashboard');
          }
        }
      }, pollInterval);

      // Cleanup on unmount
      return () => {
        clearInterval(pollTimer);
      };
    }
  }, [searchParams, router, t]); // Fixed: Removed refreshSubscription dependency

  const loadApiKeys = useCallback(async () => {
    setApiStatus('loading');
    setApiMessage(null);

    try {
      // Supabase認証を確認
      const { data: { session } } = await supabaseClient.auth.getSession();

      if (!session?.user) {
        console.log('❌ セッションが存在しません');
        setApiStatus('error');
        setApiMessage({ type: 'error', text: t('dashboard.settings.api.errorLoginRequired') });
        return;
      }

      const accessToken = session.access_token;

      console.log('📡 APIキー取得開始:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasToken: !!accessToken,
        tokenPreview: accessToken?.substring(0, 20) + '...'
      });

      // 現在のセッション確認
      const currentSession = await supabaseClient.auth.getSession();
      console.log('🔍 Current session check:', {
        hasSession: !!currentSession.data.session,
        hasToken: !!currentSession.data.session?.access_token,
        tokenPrefix: currentSession.data.session?.access_token?.substring(0, 30)
      });

      if (!currentSession.data.session?.access_token) {
        console.error('❌ No JWT token available in session');
        setApiMessage({ type: 'error', text: t('dashboard.settings.api.errorSessionNotFound') });
        setApiStatus('error');
        return;
      }

      // supabase.functions.invokeのみを使用（JWTを自動付与）
      console.log('🔧 Using supabase.functions.invoke (POST with explicit method)...');

      // Use local API endpoint instead of Edge Function
      const response = await fetch('/api/keys/manage', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const invokeData = await response.json();
      const invokeError = !response.ok ? invokeData.error : null;

      console.log('📨 Invoke result:', { data: invokeData, error: invokeError });

      if (invokeError) {
        console.error('❌ Invoke error:', invokeError);
        throw new Error(invokeError.message || 'Failed to invoke API key manager');
      }

      if (!invokeData) {
        throw new Error('No data returned from API key manager');
      }

      console.log('✅ Invoke succeeded:', invokeData);

      if (!invokeData?.success) {
        throw new Error(invokeData?.error || 'Failed to fetch API keys');
      }

      const apiKeys = invokeData.keys || [];
      console.log('✅ Loaded API keys:', apiKeys);

      const formattedKeys: ApiKey[] = (apiKeys || []).map((key: any) => ({
        id: key.id,
        name: key.name,
        key: key.key_prefix ? `${key.key_prefix}****` : `api_key****${key.id.slice(-4)}`,
        created: new Date(key.created_at).toLocaleDateString('ja-JP'),
        lastUsed: key.last_used_at
          ? new Date(key.last_used_at).toLocaleDateString('ja-JP')
          : '未使用',
        tier: (key.tier || 'free') as ApiKey['tier']
      }));

      setApiKeys(formattedKeys);
      setApiStatus('ready');
    } catch (error) {
      console.error('Failed to load API keys:', error);
      setApiStatus('error');
      setApiMessage({ type: 'error', text: t('dashboard.settings.api.errorLoad') });
    }
  }, [supabaseClient, t]);

  useEffect(() => {
    if (activeTab === 'api' && apiStatus === 'idle') {
      void loadApiKeys();
    }
  }, [activeTab, apiStatus, loadApiKeys]);

  // APIキーが生成されていて、まだコピーされていない場合、ページ離脱時に警告を表示
  useEffect(() => {
    if (!generatedKey || isKeyCopied) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [generatedKey, isKeyCopied]);

  const handleProfileChange = useCallback((field: keyof ProfileState, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleProfileSave = useCallback(async () => {
    // 既に保存中の場合は何もしない（ダブルクリック防止）
    if (isSavingProfile) {
      console.log('⏭️ Already saving, skipping...');
      return;
    }

    setProfileMessage(null);

    // 変更チェック - 変更がない場合は何もしない
    const emailChanged = profile.email !== originalProfile.email;
    const nameChanged = profile.name !== originalProfile.name;
    const companyChanged = profile.company !== originalProfile.company;
    const hasChanges = emailChanged || nameChanged || companyChanged;

    if (!hasChanges) {
      console.log('⏭️ No changes detected, skipping update');
      setProfileMessage({ type: 'success', text: t('dashboard.settings.profile.noChanges') });
      return;
    }

    console.log('🔍 Changes detected:', JSON.stringify({
      emailChanged,
      nameChanged,
      companyChanged
    }, null, 2));

    setIsSavingProfile(true);

    try {
      // セッションを確認
      const { data: { session } } = await supabaseClient.auth.getSession();

      if (!session) {
        console.error('❌ セッションが存在しません');
        setProfileMessage({ type: 'error', text: t('dashboard.settings.profile.errorUpdate') });
        return;
      }

      console.log('📋 Current session:', JSON.stringify({
        user_id: session.user?.id,
        email: session.user?.email,
        hasToken: !!session.access_token
      }, null, 2));

      console.log('📤 Profile data:', JSON.stringify({
        currentEmail: profile.email,
        originalEmail: originalProfile.email,
        currentName: profile.name,
        originalName: originalProfile.name
      }, null, 2));

      // メールアドレスが変更されている場合のみemailを含める
      let updatePayload: any;

      if (emailChanged) {
        // メールアドレス変更の場合
        updatePayload = {
          email: profile.email,
          data: {
            name: profile.name,
            company: profile.company
          }
        };
      } else {
        // メタデータのみ更新
        updatePayload = {
          data: {
            name: profile.name,
            company: profile.company
          }
        };
      }

      console.log('📤 Updating user with payload:', JSON.stringify(updatePayload, null, 2));

      const { data, error } = await supabaseClient.auth.updateUser(updatePayload);

      if (error) {
        console.error('プロフィール更新エラー:', {
          message: error.message,
          status: error.status,
          name: error.name
        });

        // レート制限エラーの場合は特別なメッセージを表示
        if (error.status === 429) {
          setProfileMessage({
            type: 'error',
            text: t('dashboard.settings.profile.rateLimitError')
          });
        } else {
          setProfileMessage({ type: 'error', text: t('dashboard.settings.profile.errorUpdate') });
        }
        return;
      }

      console.log('✅ プロフィール更新成功:', data);

      // メールアドレス変更の場合は確認メッセージを表示
      if (emailChanged) {
        setProfileMessage({
          type: 'success',
          text: t('dashboard.settings.profile.emailConfirmationSent')
        });
      } else {
        setOriginalProfile(profile); // 保存成功時に元の値を更新
        setProfileMessage({ type: 'success', text: t('dashboard.settings.profile.successMessage') });
      }
    } catch (error) {
      console.error('プロフィール更新失敗:', error);
      setProfileMessage({ type: 'error', text: t('dashboard.settings.profile.errorUpdate') });
    } finally {
      setIsSavingProfile(false);
    }
  }, [profile, originalProfile, supabaseClient, t, isSavingProfile]);

  const handlePlanSelect = useCallback((planId: string) => {
    setSelectedPlan(planId);
  }, []);

  const handlePlanUpdate = useCallback(async () => {
    if (selectedPlan === currentPlan.id) {
      setPlanMessage({ type: 'success', text: t('dashboard.settings.plan.successCurrentPlan').replace('{name}', currentPlan.name) });
      return;
    }

    // 選択したプラン情報を取得
    const newPlan = planOptions.find(p => p.id === selectedPlan);
    if (!newPlan) {
      setPlanMessage({ type: 'error', text: 'プランが見つかりませんでした' });
      return;
    }

    try {
      const user = await supabaseClient.auth.getUser();
      if (!user.data.user) {
        setPlanMessage({ type: 'error', text: '認証エラーが発生しました' });
        return;
      }

      // Determine base plan name (remove billing period suffix)
      const basePlanName = selectedPlan.startsWith('standard-') ? 'standard' : selectedPlan;

      // subscription_plansテーブルから新しいプランIDを取得
      console.log('🔍 Looking up plan:', { selectedPlan, basePlanName });

      const { data: planData, error: planError } = await supabaseClient
        .from('subscription_plans')
        .select('id')
        .eq('name', basePlanName)
        .single();

      console.log('📋 Plan lookup result:', { planData, planError });

      if (planError || !planData) {
        console.error('Error fetching plan:', planError);
        setPlanMessage({ type: 'error', text: 'プラン情報の取得に失敗しました' });
        return;
      }

      console.log('✅ Found plan ID:', planData.id);

      // Standardプランに変更する場合はStripe決済へ (monthly or yearly)
      if (selectedPlan.startsWith('standard-')) {
        setPlanMessage({ type: 'success', text: '決済ページへリダイレクト中...' });

        // Get billing period from selected plan
        const billingPeriod = selectedPlan === 'standard-monthly' ? 'monthly' : 'yearly';

        // サーバー側で認証とPrice ID解決を行うため、planTypeとbillingCycleのみ送信
        const requestBody = {
          planType: 'standard', // 'freemium' | 'standard' | 'premium'
          billingCycle: billingPeriod // 'monthly' | 'yearly'
        };

        console.log('📤 Sending to Stripe API:', requestBody);

        // Get CSRF token from cookie
        const csrfToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('csrf-token='))
          ?.split('=')[1];

        if (!csrfToken) {
          console.error('❌ CSRF token not found');
          setPlanMessage({ type: 'error', text: 'セキュリティトークンが見つかりません。ページを再読み込みしてください。' });
          return;
        }

        // Stripe Checkout Sessionを作成
        const response = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify(requestBody),
        });

        const { sessionUrl, error: checkoutError } = await response.json();

        if (checkoutError || !sessionUrl) {
          console.error('Error creating checkout session:', checkoutError);
          setPlanMessage({ type: 'error', text: '決済ページの作成に失敗しました' });
          return;
        }

        // Stripe Checkoutページへリダイレクト
        window.location.href = sessionUrl;
        return;
      }

      // Freemiumプランに変更する場合は新しいAPIを使用
      console.log('⬇️ Downgrading to freemium via API...');

      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf-token='))
        ?.split('=')[1];

      if (!csrfToken) {
        console.error('❌ CSRF token not found');
        setPlanMessage({ type: 'error', text: 'セキュリティトークンが見つかりません。ページを再読み込みしてください。' });
        return;
      }

      // Call freemium downgrade API
      const downgradeResponse = await fetch('/api/subscription/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          action: 'downgrade',
          planType: 'freemium'
        }),
      });

      const downgradeResult = await downgradeResponse.json();

      if (!downgradeResponse.ok || !downgradeResult.success) {
        console.error('Error downgrading to freemium:', downgradeResult.error);
        setPlanMessage({ type: 'error', text: downgradeResult.error || 'プランの更新に失敗しました' });
        return;
      }

      console.log('✅ Downgrade successful, refreshing subscription data...');

      // Refresh subscription data from status API
      await refreshSubscription();

      setPlanMessage({ type: 'success', text: t('dashboard.settings.plan.successPlanChange') });
    } catch (error) {
      console.error('Error in handlePlanUpdate:', error);
      setPlanMessage({ type: 'error', text: 'プランの更新に失敗しました' });
    }
  }, [selectedPlan, currentPlan, planOptions, t, supabaseClient]); // Fixed: Removed refreshSubscription dependency

  const handleCreateKey = useCallback(async () => {
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 APIキー作成ボタンクリック開始');
      console.log('📝 入力されたキー名:', newKeyName);
    }
    
    if (newKeyName.trim().length === 0) {
      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ キー名が空のため処理を中止');
      }
      return;
    }

    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV === 'development') {
      console.log('⏳ 作成処理を開始...');
    }
    setIsCreatingKey(true);
    setApiMessage(null);
    setGeneratedKey(null);

    try {
      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === 'development') {
        console.log('📡 Supabaseクライアントを取得中...');
      }


      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Supabaseクライアント取得完了');
      }

      // 認証状態を確認
      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 認証状態を確認中...');
      }

      // 本番環境ではSupabase認証、開発環境ではlocalstorage認証をサポート
      let userId: string | null = null;
      let userEmail: string | null = null;

      // まずSupabase認証を確認
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

      if (session?.user) {
        // Supabase認証が有効な場合
        userId = session.user.id;
        userEmail = session.user.email || null;
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Supabase認証セッション有効:', { userId, email: userEmail });
        }
      } else {
        // Supabase認証が無効な場合、localStorage認証を確認（開発環境用）
        const isAuthenticated = localStorage.getItem('isAuthenticated');
        const currentUser = localStorage.getItem('currentUser');

        if (isAuthenticated === 'true' && currentUser) {
          try {
            const userData = JSON.parse(currentUser);

            // UUID形式チェック（古いIDの場合は新しいUUIDを生成）
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(userData.id)) {
              // eslint-disable-next-line no-console
              console.warn('⚠️ 古い形式のユーザーID検出:', userData.id);

              // 新しいUUID形式のIDを生成
              const generateUUID = () => {
                // Use crypto.randomUUID if available
                if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                  return crypto.randomUUID();
                }
                // Fallback to crypto.getRandomValues for older browsers
                const array = new Uint8Array(16);
                crypto.getRandomValues(array);
                array[6] = (array[6] & 0x0f) | 0x40; // Version 4
                array[8] = (array[8] & 0x3f) | 0x80; // Variant bits
                const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
                return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
              };

              userData.id = generateUUID();
              // 更新したデータを保存
              localStorage.setItem('currentUser', JSON.stringify(userData));

              // eslint-disable-next-line no-console
              console.log('✅ 新しいUUID形式のIDを生成:', userData.id);
            }

            userId = userData.id;
            userEmail = userData.email;
            // eslint-disable-next-line no-console
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ localStorage認証有効:', { userId, email: userEmail });
            }
          } catch (e) {
            console.error('❌ localStorage認証データが無効:', e);
          }
        }
      }

      if (!userId || !userEmail) {
        console.error('❌ 認証セッションが存在しません (Supabase + localStorage両方とも無効)');
        setApiMessage({ type: 'error', text: t('dashboard.settings.api.errorLoginRequired') });
        setIsCreatingKey(false);
        // 3秒後に認証ページにリダイレクト
        setTimeout(() => {
          window.location.href = '/auth';
        }, 3000);
        return;
      }
      
      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ 認証OK - ユーザーID:', userId);
        console.log('📝 キー名:', newKeyName);
      }

      // Edge Function経由でAPIキーを作成（supabase.functions.invoke使用）
      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 /api/keys/manage (create)を呼び出し中...');
        console.log('📋 パラメータ:', {
          action: 'create',
          key_name: newKeyName.trim(),
          tier: 'free'
        });
      }

      // 現在のセッションのトークンを取得
      const currentToken = session?.access_token || '';

      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf-token='))
        ?.split('=')[1];

      const response = await fetch('/api/keys/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`,
          'x-csrf-token': csrfToken || ''
        },
        body: JSON.stringify({
          action: 'create',
          key_name: newKeyName.trim(),
          tier: 'free'
        })
      });

      const result = await response.json();
      const invokeError = !response.ok ? result.error : null;

      if (invokeError) {
        console.error('❌ APIキー作成失敗:', invokeError);

        // Check for specific error types (409 Conflict - AlreadyExists)
        if (response.status === 409 || result.error === 'AlreadyExists') {
          const errorMessage = result.message || '既にAPIキーが存在します';
          const errorDetails = result.details || '新しいキーを作成する前に、既存のキーを削除してください。';

          // Show detailed error message with line breaks
          setApiMessage({
            type: 'error',
            text: `${errorMessage}\n\n${errorDetails}`
          });
          setIsCreatingKey(false);
          return;
        }

        throw new Error(invokeError.message || 'APIキーの作成に失敗しました');
      }

      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === 'development') {
        console.log('📨 Edge Function実行結果:', result);
      }

      if (!result.success) {
        console.error('❌ APIキー作成失敗:', result);
        setApiMessage({ type: 'error', text: result?.error || t('dashboard.settings.api.errorCreate') });
        setIsCreatingKey(false);
        return;
      }

      // 新規作成時は newKey フィールドに平文キーが含まれる
      // 一覧取得時は keys 配列にメタ情報のみ
      const newApiKey = result.newKey || result.api_key || result.apiKey;

      if (!newApiKey) {
        console.error('❌ APIキー作成失敗 - 新規キーが返されませんでした:', result);
        setApiMessage({ type: 'error', text: t('dashboard.settings.api.errorCreate') });
        setIsCreatingKey(false);
        return;
      }

      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === 'development') {
        console.log('🎉 APIキー作成成功!');
        console.log('🔑 作成されたキー情報:', {
          key_id: result.key_id || result.keyId,
          name: result.name,
          tier: result.tier,
          api_key_length: newApiKey.length
        });
      }

      const keyId = result.key_id || result.keyId;

      const newKey: ApiKey = {
        id: keyId,
        name: result.name,
        key: newApiKey, // 作成時のみ完全なキーを表示
        created: new Date().toLocaleDateString('ja-JP'),
        lastUsed: t('dashboard.settings.api.notUsedLabel'),
        tier: (result.tier || 'free') as ApiKey['tier']
      };

      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === 'development') {
        console.log('📝 フォーマット済みキー情報:', newKey);
      }

      setApiKeys((prev) => {
        const updated = [...prev, newKey];
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === 'development') {
          console.log('📚 更新後のAPIキーリスト:', updated);
        }
        return updated;
      });
      
      setGeneratedKey(newApiKey);
      setIsKeyCopied(false); // 新しいキーを生成したのでコピー済みフラグをリセット
      setNewKeyName('');
      setApiMessage({ type: 'success', text: t('dashboard.settings.api.successCreated') });
      
      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ 状態更新完了');
      }
    } catch (error) {
      console.error('💥 予期しないエラー:', error);
      if (process.env.NODE_ENV === 'development') {
        console.error('🔍 エラースタック:', error instanceof Error ? error.stack : 'スタックなし');
      }
      setApiMessage({ type: 'error', text: t('dashboard.settings.api.errorCreate') });
    }

    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV === 'development') {
      console.log('🏁 作成処理終了 - ローディング状態をfalseに');
    }
    setIsCreatingKey(false);
  }, [newKeyName, supabaseClient, t]);

  const handleDeleteKey = useCallback((id: string) => {
    setDeleteKeyId(id);
  }, []);

  const confirmDeleteKey = useCallback(async () => {
    if (!deleteKeyId) return;

    try {

      // 本番環境ではSupabase認証、開発環境ではlocalstorage認証をサポート
      let userId: string | null = null;

      // まずSupabase認証を確認
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

      if (session?.user) {
        // Supabase認証が有効な場合
        userId = session.user.id;
        // eslint-disable-next-line no-console
        if (process.env.NODE_ENV === 'development') {
          console.log('🗑️ Supabase認証で削除:', userId);
        }
      } else {
        // Supabase認証が無効な場合、localStorage認証を確認（開発環境用）
        const isAuthenticated = localStorage.getItem('isAuthenticated');
        const currentUser = localStorage.getItem('currentUser');

        if (isAuthenticated === 'true' && currentUser) {
          try {
            const userData = JSON.parse(currentUser);
            userId = userData.id;
            // eslint-disable-next-line no-console
            if (process.env.NODE_ENV === 'development') {
              console.log('🗑️ localStorage認証で削除:', userId);
            }
          } catch (e) {
            console.error('❌ localStorage認証データが無効:', e);
          }
        }
      }

      if (!userId) {
        setApiMessage({ type: 'error', text: t('dashboard.settings.api.errorLoginRequired') });
        setDeleteKeyId(null);
        return;
      }

      // 現在のセッションを再取得
      const { data: { session: currentSession } } = await supabaseClient.auth.getSession();

      if (!currentSession?.access_token) {
        setApiMessage({ type: 'error', text: t('dashboard.settings.api.errorLoginRequired') });
        setDeleteKeyId(null);
        return;
      }

      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf-token='))
        ?.split('=')[1];

      // Use local API endpoint to delete API key
      const response = await fetch('/api/keys/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
          'x-csrf-token': csrfToken || ''
        },
        body: JSON.stringify({
          action: 'delete',
          key_id: deleteKeyId
        })
      });

      const result = await response.json();
      const invokeError = !response.ok ? result.error : null;

      if (invokeError) {
        console.error('❌ APIキー削除失敗:', invokeError);
        setApiMessage({ type: 'error', text: invokeError.message || t('dashboard.settings.api.errorDelete') });
      } else if (!result?.success) {
        console.error('❌ APIキー削除失敗:', result);
        setApiMessage({ type: 'error', text: result?.error || t('dashboard.settings.api.errorDelete') });
      } else {
        setApiKeys((prev) => prev.filter((key) => key.id !== deleteKeyId));
        setApiMessage({ type: 'success', text: t('dashboard.settings.api.successDeleted') });
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
      setApiMessage({ type: 'error', text: t('dashboard.settings.api.errorDelete') });
    }

    setDeleteKeyId(null);
  }, [deleteKeyId, supabaseClient, t]);

  const handleCopyKey = useCallback((value: string) => {
    void navigator.clipboard.writeText(value);
    setApiMessage({ type: 'success', text: t('dashboard.settings.api.successCopied') });

    // generatedKeyをコピーした場合は、コピー済みフラグを立てる（ページ離脱警告を解除）
    if (generatedKey && value === generatedKey) {
      setIsKeyCopied(true);
    }
  }, [t, generatedKey]);

  const handleLogout = useCallback(() => {
    setShowLogoutDialog(true);
  }, []);

  const confirmLogout = useCallback(async () => {
    setShowLogoutDialog(false);

    try {
      // Call server-side logout API to properly clear cookies
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        console.log('✅ サーバー側ログアウト成功');

        // Also clear client-side session
        try {
          await supabaseClient.auth.signOut({ scope: 'local' });
          console.log('✅ クライアント側ログアウト成功');
        } catch (clientError) {
          console.error('クライアント側ログアウトエラー:', clientError);
        }

        // Wait a moment for cookies to be processed
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      // If logout fails, just log the error and continue with redirect
      // The middleware will handle clearing the session
      console.error('ログアウトエラー:', error);
    }

    // Clear local client state and redirect
    // Force reload to clear any cached state
    window.location.href = '/login';
  }, [supabaseClient]);

  // Define tabs using translation
  const tabs = useMemo(() => [
    { id: 'profile' as TabId, label: t('dashboard.settings.tabs.profile'), icon: 'ri-user-line' },
    { id: 'plan' as TabId, label: t('dashboard.settings.tabs.plan'), icon: 'ri-vip-crown-line' },
    { id: 'api' as TabId, label: t('dashboard.settings.tabs.api'), icon: 'ri-key-line' }
  ], [t]);

  const activeTabLabel = useMemo(() => tabs.find((tab) => tab.id === activeTab)?.label ?? '', [activeTab, tabs]);

  // 削除対象のAPIキー名を取得（ダイアログ表示用）
  const deleteKeyName = useMemo(() => {
    if (!deleteKeyId) return '';
    const key = apiKeys.find(k => k.id === deleteKeyId);
    return key?.name || '';
  }, [deleteKeyId, apiKeys]);

  // 認証チェック中の表示
  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[400px] rounded-2xl bg-white shadow-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('dashboard.settings.auth.checking')}</p>
        </div>
      </div>
    );
  }

  // 認証されていない場合の表示
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px] rounded-2xl bg-white shadow-lg">
        <div className="text-center space-y-4">
          <i className="ri-lock-line text-4xl text-gray-400"></i>
          <p className="text-gray-600">{t('dashboard.settings.auth.required')}</p>
          <p className="text-sm text-gray-500">{t('dashboard.settings.auth.redirecting')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl bg-white shadow-lg">
        <div className="border-b border-gray-200">
          <div className="flex flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <nav className="flex gap-4 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 border-b-2 px-1 pb-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <i className={`${tab.icon} text-base`}></i>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <i className="ri-logout-box-line"></i>
              <span>{t('dashboard.settings.tabs.logout')}</span>
            </button>
          </div>
        </div>

        <div className="space-y-6 border-b border-gray-100 px-6 pb-4 pt-6">
          <h2 className="text-lg font-semibold text-gray-900">{activeTabLabel}</h2>
          <p className="text-sm text-gray-500">
            {activeTab === 'profile' && t('dashboard.settings.profile.description')}
            {activeTab === 'plan' && t('dashboard.settings.plan.description')}
            {activeTab === 'api' && t('dashboard.settings.api.description')}
          </p>
        </div>

        <div className="px-6 pb-8 pt-2">
          {activeTab === 'profile' && (
            <ProfileTab
              profile={profile}
              originalProfile={originalProfile}
              message={profileMessage}
              onChange={handleProfileChange}
              onSave={handleProfileSave}
              isSaving={isSavingProfile}
              t={t}
            />
          )}

          {activeTab === 'plan' && (
            <PlanTab
              currentPlan={currentPlan}
              selectedPlan={selectedPlan}
              message={planMessage}
              onSelectPlan={handlePlanSelect}
              onUpdatePlan={handlePlanUpdate}
              planOptions={planOptions}
              trialInfo={trialInfo}
              t={t}
            />
          )}

          {activeTab === 'api' && (
            <ApiKeyTab
              apiKeys={apiKeys}
              status={apiStatus}
              message={apiMessage}
              generatedKey={generatedKey}
              newKeyName={newKeyName}
              isCreating={isCreatingKey}
              onReload={loadApiKeys}
              onCreate={handleCreateKey}
              onDelete={handleDeleteKey}
              onChangeName={setNewKeyName}
              onCopy={handleCopyKey}
              t={t}
            />
          )}
        </div>
      </div>

      {/* アカウント削除セクション */}
      <div className="mt-8">
        <AccountDeletionSection />
      </div>

      {/* APIキー削除確認ダイアログ */}
      <ConfirmDialog
        isOpen={deleteKeyId !== null}
        title={t('dashboard.settings.dialog.deleteKey.title')}
        message={t('dashboard.settings.dialog.deleteKey.message').replace('{name}', deleteKeyName)}
        confirmText={t('dashboard.settings.dialog.deleteKey.confirm')}
        cancelText={t('dashboard.settings.dialog.deleteKey.cancel')}
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
        icon="danger"
        onConfirm={confirmDeleteKey}
        onCancel={() => setDeleteKeyId(null)}
      />

      {/* ログアウト確認ダイアログ */}
      <ConfirmDialog
        isOpen={showLogoutDialog}
        title={t('dashboard.settings.dialog.logout.title')}
        message={t('dashboard.settings.dialog.logout.message')}
        confirmText={t('dashboard.settings.dialog.logout.confirm')}
        cancelText={t('dashboard.settings.dialog.logout.cancel')}
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
        icon="warning"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutDialog(false)}
      />
    </>
  );
}
