import { redirect } from 'next/navigation'
import { createSupabaseServerClient, createSupabaseServerAdminClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()

  // 認証チェック
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // APIキー情報を取得
  const supabaseAdmin = await createSupabaseServerAdminClient()
  const { data: apiKeys } = await supabaseAdmin
    .from('api_keys')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (
    <DashboardClient
      user={{
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.name,
        company: user.user_metadata?.company,
      }}
      apiKeys={apiKeys || []}
    />
  )
}