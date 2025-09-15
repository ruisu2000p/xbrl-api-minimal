import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || null,
        company: user.user_metadata?.company || null,
        created_at: user.created_at,
      }
    })

  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, company } = body

    // ユーザーメタデータを更新
    const { error: updateError } = await supabase.auth.updateUser({
      data: { name, company }
    })

    if (updateError) {
      console.error('Failed to update profile:', updateError)
      return NextResponse.json(
        { error: 'プロフィールの更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'プロフィールを更新しました'
    })

  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}