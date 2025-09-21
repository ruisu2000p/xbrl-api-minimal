import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
}

serve(async (req: Request) => {
  // CORS対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 環境変数チェック
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const jwtSecret = Deno.env.get('JWT_SECRET')

    // デバッグ情報
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        supabaseUrl: supabaseUrl ? 'SET' : 'NOT_SET',
        serviceRoleKey: serviceRoleKey ? 'SET' : 'NOT_SET',
        jwtSecret: jwtSecret ? 'SET' : 'NOT_SET',
        jwtSecretLength: jwtSecret ? jwtSecret.length : 0
      },
      headers: {
        authorization: req.headers.get('Authorization') ? 'PRESENT' : 'MISSING',
        userAgent: req.headers.get('User-Agent')
      },
      url: req.url,
      method: req.method
    }

    return new Response(
      JSON.stringify({
        success: true,
        debug: debugInfo,
        message: 'Debug information collected successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})