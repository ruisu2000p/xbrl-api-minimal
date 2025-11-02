'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { User, SupabaseClient } from '@supabase/supabase-js'
import { supabaseManager } from '@/lib/infrastructure/supabase-manager'
import { logger } from '@/utils/logger/client'

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
    logger.debug('Supabase session loading')

    // 初回のセッション復元
    const initializeUser = async () => {
      try {
        // まずセッションを復元
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          logger.error('Session restoration failed', {
            err: sessionError instanceof Error ? sessionError : { message: String(sessionError) }
          })
          setUser(null)
          setLoading(false)
          return
        }

        if (session?.user) {
          logger.info('User authenticated', { email: session.user.email })
          setUser(session.user)
        } else {
          logger.debug('No session found')
          setUser(null)
        }
      } catch (error) {
        logger.error('Failed to get initial session', {
          err: error instanceof Error ? error : { message: String(error) }
        })
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initializeUser()

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.debug('Auth state changed', {
        event,
        email: session?.user?.email
      })
      setUser(session?.user ?? null)
      setLoading(false)

      // Send welcome email on first sign-in
      // The endpoint is idempotent so it's safe to call multiple times
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const response = await fetch('/api/notifications/welcome', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          })

          if (response.ok) {
            const data = await response.json()
            if (data.sent) {
              logger.info('Welcome email sent', { email: session.user.email })
            } else if (data.alreadySent) {
              logger.debug('Welcome email already sent', { email: session.user.email })
            }
          } else {
            // Non-blocking: log but don't affect UX
            logger.warn('Welcome email request failed', {
              status: response.status,
              email: session.user.email
            })
          }
        } catch (error) {
          // Non-blocking: silent failure with retry on next login
          logger.debug('Welcome email call failed (will retry later)', {
            err: error instanceof Error ? error : { message: String(error) }
          })
        }
      }
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