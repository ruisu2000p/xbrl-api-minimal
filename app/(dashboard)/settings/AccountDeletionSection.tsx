'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, ShieldAlert, Trash2, Loader2, CheckCircle2, LockKeyhole } from 'lucide-react'

// shadcn/ui
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

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
  // crypto.randomUUID is supported broadly; fallback for older envs
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

  // idempotency key per dialog open
  const idemKeyRef = useRef<string>('')
  useEffect(() => {
    if (open) idemKeyRef.current = uuid()
  }, [open])

  const csrfToken = useMemo(() => getCookie('csrf-token'), [open])

  // reset state when dialog closes
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
        // 少しだけ完了画面を見せてからログインへ
        setTimeout(() => {
          router.replace('/login?deleted=1')
        }, 1200)
        return
      }

      if (res.status === 401) {
        // 未ログイン or セッション衝突 or 再認証失敗
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
  const canNextFromStep2 = true // 理由は任意
  const canSubmit = password.length > 0

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" /> アカウントの削除（退会）
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            退会するとサブスクリプションが即時停止し、APIキーは無効化されます。30日後にデータは物理削除されます。
          </p>
        </div>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="rounded-2xl" size="sm">
              <Trash2 className="mr-2 h-4 w-4" /> 退会する
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {step === 'done' ? (
                  <>
                    <CheckCircle2 className="h-5 w-5" /> 退会が完了しました
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5" /> 退会の確認
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {step === 'done' ? 'セッションを終了し、ログインページへ移動します。' : '内容を確認のうえ、手順に沿って進めてください。'}
              </DialogDescription>
            </DialogHeader>

            {/* step indicator */}
            {step !== 'done' && (
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">Step {step} / 3</Badge>
                <div className="h-1 flex-1 rounded bg-muted">
                  <div
                    className="h-1 rounded bg-destructive"
                    style={{ width: `${(Number(step) / 3) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* body */}
            <div className="min-h-[180px]">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4"
                  >
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>退会すると以下が失われます</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc pl-5">
                          <li>サブスクリプションは即時停止（未使用分は按分精算）</li>
                          <li>すべての API キーが無効化</li>
                          <li>保存データは 30 日後に完全削除（猶予期間内は復元可）</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="ack" checked={ack} onCheckedChange={(v) => setAck(Boolean(v))} />
                      <Label htmlFor="ack">上記を理解しました</Label>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4"
                  >
                    <Label className="text-sm">退会理由（任意）</Label>
                    <RadioGroup value={reason} onValueChange={(v) => setReason(v as Reason)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem id="r1" value="too_expensive" />
                        <Label htmlFor="r1">価格が高い</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem id="r2" value="missing_features" />
                        <Label htmlFor="r2">必要な機能がない</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem id="r3" value="low_usage" />
                        <Label htmlFor="r3">使用頻度が低い</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem id="r4" value="other" />
                        <Label htmlFor="r4">その他</Label>
                      </div>
                    </RadioGroup>
                    <div>
                      <Label htmlFor="comment" className="text-sm">自由記述（任意）</Label>
                      <Textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="改善点やご要望があればご記入ください" className="mt-1" />
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-sm">パスワード再入力（セキュリティ確認）</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type="password"
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pr-10"
                        />
                        <LockKeyhole className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
                      </div>
                    </div>
                    <Alert variant="destructive">
                      <ShieldAlert className="h-4 w-4" />
                      <AlertTitle>最終確認</AlertTitle>
                      <AlertDescription>この操作は取り消せません。よろしいですか？</AlertDescription>
                    </Alert>
                  </motion.div>
                )}

                {step === 'done' && (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="flex min-h-[160px] flex-col items-center justify-center gap-2 text-center"
                  >
                    <CheckCircle2 className="h-10 w-10" />
                    <p className="text-sm text-muted-foreground">退会が完了しました。ログイン画面へ移動します…</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {error && (
              <div className="-mb-1 mt-2">
                <Alert variant="destructive">
                  <AlertTitle>エラー</AlertTitle>
                  <AlertDescription className="break-words">{error}</AlertDescription>
                </Alert>
              </div>
            )}

            {step !== 'done' && (
              <DialogFooter className="mt-2">
                <div className="flex w-full items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {step < 3 ? '戻る' : 'キャンセル'}で中断できます
                  </div>
                  <div className="flex gap-2">
                    {step > 1 ? (
                      <Button variant="ghost" onClick={() => setStep((s) => (s === 2 ? 1 : 2))} disabled={loading}>
                        戻る
                      </Button>
                    ) : (
                      <Button variant="ghost" onClick={closeDialog} disabled={loading}>
                        キャンセル
                      </Button>
                    )}

                    {step < 3 && (
                      <Button onClick={() => setStep((s) => (s === 1 ? 2 : 3))} disabled={!ack && step === 1 ? true : !canNextFromStep2 || loading}>
                        次へ
                      </Button>
                    )}

                    {step === 3 && (
                      <Button variant="destructive" onClick={submitDeletion} disabled={!canSubmit || loading}>
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            処理中…
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" /> 退会する
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Separator className="my-4" />
      <ul className="text-xs text-muted-foreground space-y-1">
        <li>・サブスクリプションは即時停止（最終請求/按分は自動処理）</li>
        <li>・データは30日後に物理削除されます（猶予期間内は復元可）</li>
        <li>・退会後はログインできません</li>
      </ul>
    </div>
  )
}
