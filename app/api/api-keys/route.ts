import { NextRequest, NextResponse } from 'next/server'
import { supabaseManager } from '@/lib/infrastructure/supabase-manager'
import { apiKeyNameSchema } from '@/lib/security/input-validation'
import {
  createApiKey as generateNewApiKey,
  extractApiKeyPrefix,
  extractApiKeySuffix
} from '@/lib/security/bcrypt-apikey'

async function getSessionContext() {
  const supabase = await supabaseManager.createSSRClient()
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    return { supabase, error }
  }

  if (!session?.user) {
    return { supabase, error: new Error('Not authenticated') }
  }

  return { supabase, userId: session.user.id }
}

export async function GET(_request: NextRequest) {
  try {
    const { supabase, userId, error } = await getSessionContext()
    if (error || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: apiKeys, error: fetchError } = await supabase
      .from('api_keys')
      .select('id, name, masked_key, key_prefix, key_suffix, tier, status, is_active, created_at, last_used_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10)

    if (fetchError) {
      console.error('Error fetching API keys:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
    }

    const sanitized = (apiKeys ?? []).map((key) => ({
      id: key.id,
      name: key.name,
      masked_key: key.masked_key
        ? key.masked_key
        : key.key_prefix
          ? `${key.key_prefix}****`
          : `api_key****${(key.key_suffix ?? key.id).slice(-4)}`,
      tier: key.tier,
      status: key.status,
      is_active: key.is_active,
      created_at: key.created_at,
      last_used_at: key.last_used_at
    }))

    return NextResponse.json({ success: true, apiKeys: sanitized })
  } catch (err) {
    console.error('API keys fetch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, userId, error } = await getSessionContext()
    if (error || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: any
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    const providedName = typeof body?.name === 'string' ? body.name : undefined

    let validatedName: string
    try {
      validatedName = providedName ? apiKeyNameSchema.parse(providedName) : 'API Key'
    } catch (validationError) {
      return NextResponse.json({ error: 'Invalid API key name' }, { status: 400 })
    }

    const { apiKey, hash, salt, masked } = await generateNewApiKey()
    const keyPrefix = extractApiKeyPrefix(apiKey)
    const keySuffix = extractApiKeySuffix(apiKey)
    const timestamp = new Date().toISOString()

    const { data, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        name: validatedName,
        key_prefix: keyPrefix,
        key_suffix: keySuffix,
        key_hash: hash,
        salt,
        masked_key: masked,
        user_id: userId,
        tier: 'free',
        status: 'active',
        is_active: true,
        created_at: timestamp,
        updated_at: timestamp
      })
      .select('id, name, tier, status, masked_key, created_at, last_used_at')
      .single()

    if (insertError || !data) {
      console.error('Error creating API key:', insertError)
      return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      apiKey: {
        id: data.id,
        name: data.name,
        masked_key: data.masked_key ?? masked,
        tier: data.tier,
        status: data.status,
        created_at: data.created_at,
        last_used_at: data.last_used_at
      },
      plaintextKey: apiKey
    })
  } catch (err) {
    console.error('API key creation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, userId, error } = await getSessionContext()
    if (error || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    let keyId = url.searchParams.get('id')

    if (!keyId) {
      const segments = url.pathname.split('/').filter(Boolean)
      const candidate = segments.at(-1)
      if (candidate && candidate !== 'api-keys') {
        keyId = candidate
      }
    }

    if (!keyId) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 })
    }

    const { data: keyRecord, error: fetchError } = await supabase
      .from('api_keys')
      .select('id')
      .eq('id', keyId)
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchError) {
      console.error('Error verifying API key ownership:', fetchError)
      return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 })
    }

    if (!keyRecord) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    const { error: updateError } = await supabase
      .from('api_keys')
      .update({
        is_active: false,
        status: 'revoked',
        updated_at: new Date().toISOString()
      })
      .eq('id', keyId)
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error deleting API key:', updateError)
      return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'API key revoked successfully' })
  } catch (err) {
    console.error('API key deletion error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Force update
