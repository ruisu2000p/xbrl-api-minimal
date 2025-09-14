import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { corsHeaders } from '../_shared/cors.ts'

interface StorageRequest {
  storage_path: string
  max_bytes?: number
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify API key
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify API key
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, user_id, tier, usage_count, usage_limit')
      .eq('key_hash', await hashApiKey(apiKey))
      .eq('is_active', true)
      .single()

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check usage limit
    if (keyData.usage_limit && keyData.usage_count >= keyData.usage_limit) {
      return new Response(
        JSON.stringify({ error: 'Usage limit exceeded' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body = await req.json() as StorageRequest
    const { storage_path, max_bytes = 500000 } = body

    if (!storage_path) {
      return new Response(
        JSON.stringify({ error: 'Storage path required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check tier-based access
    const tierLimits = {
      free: 100000,      // 100KB
      standard: 500000,  // 500KB
      pro: 2000000,      // 2MB
      enterprise: 10000000 // 10MB
    }

    const maxAllowedBytes = tierLimits[keyData.tier as keyof typeof tierLimits] || tierLimits.free
    const effectiveMaxBytes = Math.min(max_bytes, maxAllowedBytes)

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('markdown-files')
      .download(storage_path)

    if (downloadError) {
      if (downloadError.message.includes('not found')) {
        return new Response(
          JSON.stringify({ error: 'File not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw downloadError
    }

    // Read file content
    const arrayBuffer = await fileData.arrayBuffer()
    const decoder = new TextDecoder()
    let content = decoder.decode(arrayBuffer)

    // Truncate if necessary
    if (content.length > effectiveMaxBytes) {
      content = content.substring(0, effectiveMaxBytes)
    }

    // Get file metadata
    const { data: metadata } = await supabase
      .from('markdown_files_metadata')
      .select('*')
      .eq('storage_path', storage_path)
      .single()

    // Update usage count
    await supabase
      .from('api_keys')
      .update({
        usage_count: keyData.usage_count + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', keyData.id)

    // Return content
    return new Response(
      JSON.stringify({
        content,
        metadata: metadata || {},
        size: content.length,
        truncated: content.length >= effectiveMaxBytes,
        usage: {
          current: keyData.usage_count + 1,
          limit: keyData.usage_limit
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in get-storage-md:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Hash API key using SHA-256
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}