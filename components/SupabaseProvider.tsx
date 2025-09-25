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
      const supabase = supabaseManager.getBrowserClient()
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        // エラーは状態で管理するため、console出力は不要
        setUser(null)
        return
      }

      if (session) {
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
        setUser(null)
      }
    } catch (error) {
      // エラーは状態で管理
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const supabase = supabaseManager.getBrowserClient()

    // 初回読み込み時のセッション確認
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (!error && session) {
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
          setUser(null)
        }
      } catch (error) {
        // 初回セッションエラーは無視（未認証の場合も正常）
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
          // Cookie同期エラーは無視（ネットワークエラー等）
        }

        // ログイン後のリダイレクト
        if (event === 'SIGNED_IN') {
          router.refresh()
        }
      } else {
        setUser(null)

        // ログアウト時のCookieクリア
        if (event === 'SIGNED_OUT') {
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