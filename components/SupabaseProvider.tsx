'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseManager } from '@/lib/infrastructure/supabase-manager'
import type { User } from '@supabase/supabase-js'

type SupabaseContextType = {
  user: User | null
  loading: boolean
  refreshSession: () => Promise<void>
}

const SupabaseContext = createContext<SupabaseContextType>({
  user: null,
  loading: true,
  refreshSession: async () => {}
})

export const useSupabase = () => useContext(SupabaseContext)

export default function SupabaseProvider({
  children,
  initialSession
}: {
  children: React.ReactNode
  initialSession: any
}) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(initialSession?.user || null)
  const [loading, setLoading] = useState(!initialSession)

  const refreshSession = async () => {
    try {
      console.log('🔄 セッション読み込み開始...')
      const supabase = supabaseManager.getBrowserClient()
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('❌ セッション読み込みエラー:', error)
        setUser(null)
        return
      }

      if (session) {
        console.log('✅ セッション復元成功:', session.user.email)
        setUser(session.user)
        // Cookieとの同期
        await fetch('/api/auth/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }),
          credentials: 'include'
        })
      } else {
        console.log('⚠️ セッションが見つかりません')
        setUser(null)
      }
    } catch (error) {
      console.error('❌ セッション処理エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const supabase = supabaseManager.getBrowserClient()

    // 初回読み込み時のセッション確認
    const checkSession = async () => {
      try {
        console.log('📱 初回セッションチェック開始...')

        // localStorage の状態を確認
        const storageKeys = Object.keys(window.localStorage).filter(k => k.includes('sb-'))
        console.log('🔍 localStorage keys:', storageKeys)

        const { data: { session }, error } = await supabase.auth.getSession()

        if (!error && session) {
          console.log('✅ 初回セッション確認成功:', session.user.email)
          setUser(session.user)
          // Cookieとの同期
          await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            }),
            credentials: 'include'
          })
        } else {
          console.log('⚠️ 初回セッション確認: 未認証状態')
          setUser(null)
        }
      } catch (error) {
        console.error('❌ 初回セッション確認エラー:', error)
      } finally {
        setLoading(false)
      }
    }

    if (!initialSession) {
      checkSession()
    }

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 認証イベント:', event, session?.user?.email || '未認証')

      if (session) {
        setUser(session.user)

        // Cookieとの同期
        try {
          await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            }),
            credentials: 'include'
          })
        } catch (error) {
          console.error('Cookie同期エラー:', error)
        }

        // ログイン後のリダイレクト
        if (event === 'SIGNED_IN') {
          console.log('🚀 ログイン検知、ページをリフレッシュ')
          router.refresh()
        }
      } else {
        setUser(null)

        // ログアウト時のCookieクリア
        if (event === 'SIGNED_OUT') {
          console.log('👋 ログアウト検知')
          try {
            await fetch('/api/auth/sync', {
              method: 'DELETE',
              credentials: 'include'
            })
          } catch (error) {
            // Cookieクリアエラーは無視
          }
          router.refresh()
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, initialSession])

  const value = {
    user,
    loading,
    refreshSession
  }

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  )
}