'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient, createSupabaseServerAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function signIn(email: string, password: string) {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return {
      success: false,
      error: error.message
    }
  }

  if (data?.user) {
    // APIキー情報を取得
    const supabaseAdmin = await createSupabaseServerAdminClient()
    const { data: apiKeys } = await supabaseAdmin
      .from('api_keys')
      .select('key_prefix, key_suffix, name, is_active')
      .eq('user_id', data.user.id)
      .eq('is_active', true)
      .limit(1)

    // ページを再検証
    revalidatePath('/dashboard', 'layout')

    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email!,
        name: data.user.user_metadata?.name || '',
        company: data.user.user_metadata?.company || null,
        plan: data.user.user_metadata?.plan || 'beta',
        apiKey: apiKeys && apiKeys.length > 0
          ? `${apiKeys[0].key_prefix}...${apiKeys[0].key_suffix}`
          : null,
      }
    }
  }

  return {
    success: false,
    error: 'ログインに失敗しました'
  }
}

export async function signOut() {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/auth/login')
}

export async function getUser() {
  const supabase = await createSupabaseServerClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}