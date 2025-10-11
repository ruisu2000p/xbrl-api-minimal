'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { User, SupabaseClient } from '@supabase/supabase-js'
import { supabaseManager } from '@/lib/infrastructure/supabase-manager'

type SupabaseContextType = {
  user: User | null
  loading: boolean
  supabase: SupabaseClient
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error('useSupabase must be used within SupabaseProvider')
  }
  return context
}

// Use the unified Supabase manager to get browser client
function getSupabaseBrowserClient() {
  return supabaseManager.getBrowserClient()
}

export default function SupabaseProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    console.log('⏳ Supabaseセッション読み込み中...')

    // 初回のセッション復元
    const initializeUser = async () => {
      try {
        // まずセッションを復元
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('❌ セッション復元エラー:', sessionError)
          setUser(null)
          setLoading(false)
          return
        }

        if (session?.user) {
          console.log('✅ 認証済みユーザー:', session.user.email)
          setUser(session.user)
        } else {
          console.log('ℹ️ セッションが見つかりません')
          setUser(null)
        }
      } catch (error) {
        console.error('Failed to get initial session:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initializeUser()

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.email)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const value = {
    user,
    loading,
    supabase,
  }

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  )
}