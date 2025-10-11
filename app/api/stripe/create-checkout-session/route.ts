import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { billingPeriod = 'monthly' } = body

    console.log('📋 Checkout request:', {
      userId: session.user.id,
      billingPeriod,
      body
    })

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        plan: 'standard',
        billingPeriod: billingPeriod,
        source: 'dashboard'
      }
    })

    if (error) {
      console.error('❌ Edge function error:', error)
      return NextResponse.json(
        { error: 'Failed to create checkout session', details: error.message },
        { status: 500 }
      )
    }

    if (!data?.url) {
      console.error('❌ No checkout URL returned:', data)
      return NextResponse.json(
        { error: 'No checkout URL returned' },
        { status: 500 }
      )
    }

    console.log('✅ Checkout session created:', data)

    return NextResponse.json({ sessionUrl: data.url })
  } catch (error: any) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
