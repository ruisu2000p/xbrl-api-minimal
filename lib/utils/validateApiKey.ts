/**
 * Validate API key for authentication
 */
export async function validateApiKey(apiKey: string | null, supabase?: any): Promise<boolean> {
  if (!apiKey) return false
  
  // 開発用のデモキー（後方互換性のため一時的に残す）
  if (apiKey === 'xbrl_demo') {
    console.warn('Using demo API key. This should not be used in production.')
    return true
  }
  
  // Supabaseクライアントが提供されていない場合は基本チェックのみ
  if (!supabase) {
    return apiKey.startsWith('xbrl_')
  }
  
  try {
    // APIキーのハッシュ化
    const crypto = require('crypto')
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
    
    // データベースでAPIキーを検証
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, status, expires_at')
      .eq('key_hash', keyHash)
      .eq('status', 'active')
      .single()
    
    if (error || !data) {
      return false
    }
    
    // 有効期限チェック
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      // 期限切れの場合、ステータスを更新
      await supabase
        .from('api_keys')
        .update({ status: 'expired' })
        .eq('id', data.id)
      
      return false
    }
    
    // 最終使用日時を更新
    await supabase
      .from('api_keys')
      .update({ 
        last_used_at: new Date().toISOString(),
        total_requests: supabase.rpc('increment', { row_id: data.id, column_name: 'total_requests' })
      })
      .eq('id', data.id)
    
    return true
  } catch (error) {
    console.error('Error validating API key:', error)
    return false
  }
}