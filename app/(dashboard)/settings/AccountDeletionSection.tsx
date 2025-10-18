'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

// ---------- helpers ----------
function getCookie(name: string): string {
  const v = typeof document !== 'undefined'
    ? document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${encodeURIComponent(name)}=`))
        ?.split('=')[1]
    : ''
  try {
    return v ? decodeURIComponent(v) : ''
  } catch {
    return v || ''
  }
}

function uuid(): string {
  try {
    // @ts-ignore
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  } catch {}
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// ---------- types ----------
type Step = 1 | 2 | 3 | 'done'
type Reason = 'too_expensive' | 'missing_features' | 'low_usage' | 'other' | ''

// ---------- component ----------
export default function AccountDeletionSection() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>(1)
  const [ack, setAck] = useState(false)
  const [reason, setReason] = useState<Reason>('')
  const [comment, setComment] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const idemKeyRef = useRef<string>('')
  useEffect(() => {
    if (open) idemKeyRef.current = uuid()
  }, [open])

  const csrfToken = useMemo(() => getCookie('csrf-token'), [open])

  const reset = () => {
    setStep(1)
    setAck(false)
    setReason('')
    setComment('')
    setPassword('')
    setError(null)
  }

  const onOpenChange = (isOpen: boolean) => {
    if (!loading && (!isOpen || step === 'done')) {
      setOpen(isOpen)
      if (!isOpen) reset()
    }
  }

  const closeDialog = () => {
    if (!loading) {
      setOpen(false)
      reset()
    }
  }

  const submitDeletion = async () => {
    if (loading || !password) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
          'Idempotency-Key': idemKeyRef.current || uuid(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({ password, reason, comment }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        setStep('done')
        setTimeout(() => {
          router.replace('/login?deleted=1')
        }, 1200)
        return
      }

      if (res.status === 401) {
        setError(data?.error || '認証エラーが発生しました。再度ログインしてからお試しください。')
        return
      }

      if (res.status === 429) {
        setError('リクエストが多すぎます。しばらくしてから再度お試しください。')
        return
      }

      setError(data?.error || '退会処理に失敗しました。しばらくしてから再試行してください。')
    } catch (e) {
      setError('ネットワークエラーが発生しました。接続をご確認のうえ再試行してください。')
    } finally {
      setLoading(false)
    }
  }

  const canNextFromStep1 = ack
  const canNextFromStep2 = true
  const canSubmit = password.length > 0

  // ESC key handler
  useEffect(() => {
    if (!open) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading && step !== 'done') {
        closeDialog()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, loading, step])

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <i className="ri-shield-cross-line text-red-600"></i> アカウントの削除（退会）/ Delete Account
          </h3>
          <p className="text-gray-600 mt-1 text-sm">
            退会するとサブスクリプションが即時停止し、APIキーは無効化されます。<br />
            When you delete your account, your subscription will be immediately canceled and API keys will be deactivated.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <i className="ri-delete-bin-line"></i> 退会する / Delete
        </button>
      </div>

      {/* Modal */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm animate-fadeIn"
            onClick={() => !loading && step !== 'done' && closeDialog()}
            aria-hidden="true"
          />

          {/* Dialog */}
          <div
            role="dialog"
            aria-modal="true"
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 animate-slideIn"
          >
            <div className="rounded-2xl bg-white shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    {step === 'done' ? (
                      <>
                        <i className="ri-checkbox-circle-line text-green-600"></i> 退会が完了しました / Account Deleted
                      </>
                    ) : (
                      <>
                        <i className="ri-error-warning-line text-red-600"></i> 退会の確認 / Confirm Deletion
                      </>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {step === 'done' ? 'セッションを終了し、ログインページへ移動します。 / Ending session and redirecting to login page.' : '内容を確認のうえ、手順に沿って進めてください。 / Please review and follow the steps.'}
                  </p>
                </div>
                {step !== 'done' && (
                  <button
                    onClick={closeDialog}
                    disabled={loading}
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                    aria-label="閉じる"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                )}
              </div>

              {/* Progress indicator */}
              {step !== 'done' && (
                <div className="px-6 pt-4 pb-2 flex items-center gap-2 text-xs text-gray-600">
                  <span className="rounded-full bg-gray-200 px-2 py-1 font-medium">Step {step} / 3</span>
                  <div className="h-1 flex-1 rounded bg-gray-200">
                    <div
                      className="h-1 rounded bg-red-600 transition-all duration-300"
                      style={{ width: `${(Number(step) / 3) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Body */}
              <div className="px-6 py-6 min-h-[180px]">
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <div className="flex items-start gap-3">
                        <i className="ri-error-warning-line text-red-600 text-xl"></i>
                        <div>
                          <h4 className="font-semibold text-red-900">退会すると以下が失われます / You will lose the following:</h4>
                          <ul className="mt-2 text-sm text-red-800 space-y-1">
                            <li>• サブスクリプションは即時停止（未使用分は按分精算） / Subscription will be immediately canceled (prorated refund for unused period)</li>
                            <li>• すべての API キーが無効化 / All API keys will be deactivated</li>
                            <li>• 保存データは 30 日後に完全削除（猶予期間内は復元可） / Stored data will be permanently deleted after 30 days (recoverable during grace period)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ack}
                        onChange={(e) => setAck(e.target.checked)}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm text-gray-700">上記を理解しました / I understand the above</span>
                    </label>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">退会理由（任意） / Reason for leaving (optional)</label>
                      <div className="space-y-2">
                        {[
                          { value: 'too_expensive', label: '価格が高い / Too expensive' },
                          { value: 'missing_features', label: '必要な機能がない / Missing features' },
                          { value: 'low_usage', label: '使用頻度が低い / Low usage' },
                          { value: 'other', label: 'その他 / Other' }
                        ].map((opt) => (
                          <label key={opt.value} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              name="reason"
                              value={opt.value}
                              checked={reason === opt.value}
                              onChange={(e) => setReason(e.target.value as Reason)}
                              className="border-gray-300 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-sm text-gray-700">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label htmlFor="comment" className="text-sm font-medium text-gray-700 block mb-2">自由記述（任意） / Additional comments (optional)</label>
                      <textarea
                        id="comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="改善点やご要望があればご記入ください / Please share any improvements or requests"
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="password" className="text-sm font-medium text-gray-700 block mb-2">パスワード再入力（セキュリティ確認） / Re-enter password (security confirmation)</label>
                      <div className="relative">
                        <input
                          id="password"
                          type="password"
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-10 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <i className="ri-lock-line absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                      </div>
                    </div>
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <div className="flex items-start gap-3">
                        <i className="ri-shield-cross-line text-red-600 text-xl"></i>
                        <div>
                          <h4 className="font-semibold text-red-900">最終確認 / Final Confirmation</h4>
                          <p className="text-sm text-red-800 mt-1">この操作は取り消せません。よろしいですか？ / This action cannot be undone. Are you sure?</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {step === 'done' && (
                  <div className="flex flex-col items-center justify-center gap-3 text-center min-h-[160px]">
                    <i className="ri-checkbox-circle-line text-green-600 text-5xl"></i>
                    <p className="text-sm text-gray-600">退会が完了しました。ログイン画面へ移動します… / Account deletion completed. Redirecting to login page…</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="mx-6 mb-4">
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-3">
                      <i className="ri-error-warning-line text-red-600 text-xl"></i>
                      <div>
                        <h4 className="font-semibold text-red-900">エラー / Error</h4>
                        <p className="text-sm text-red-800 mt-1 whitespace-pre-wrap">{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              {step !== 'done' && (
                <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
                  <span className="text-xs text-gray-600">
                    {step < 3 ? '戻る' : 'キャンセル'}で中断できます / You can cancel anytime
                  </span>
                  <div className="flex gap-2">
                    {step > 1 ? (
                      <button
                        onClick={() => setStep((s) => (s === 2 ? 1 : 2))}
                        disabled={loading}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
                      >
                        戻る / Back
                      </button>
                    ) : (
                      <button
                        onClick={closeDialog}
                        disabled={loading}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
                      >
                        キャンセル / Cancel
                      </button>
                    )}

                    {step < 3 && (
                      <button
                        onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
                        disabled={(!ack && step === 1) || loading}
                        className="rounded-lg bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        次へ / Next
                      </button>
                    )}

                    {step === 3 && (
                      <button
                        onClick={submitDeletion}
                        disabled={!canSubmit || loading}
                        className="rounded-lg bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {loading ? (
                          <>
                            <i className="ri-loader-4-line animate-spin"></i>
                            処理中… / Processing…
                          </>
                        ) : (
                          <>
                            <i className="ri-delete-bin-line"></i>
                            退会する / Delete Account
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
