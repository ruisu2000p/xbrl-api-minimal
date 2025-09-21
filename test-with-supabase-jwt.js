/**
 * SupabaseのJWTを使用したテスト
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwd3F4aHlpZ2xidGxhaW1yanJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMTk1NDEsImV4cCI6MjA3Mzc5NTU0MX0.aGMCRtTRIbdUMRTdJ7KFZ7oJ2krkD7QWzUEcTs7Jlfs';

async function testWithSupabaseJWT() {
    console.log('🔑 Supabase JWTを使用したテスト\n');

    const supabase = createClient(supabaseUrl, anonKey);

    try {
        // テストクエリ
        const { data, error } = await supabase
            .from('api_keys')
            .select('id, name, tier')
            .limit(1);

        if (error) {
            console.log('❌ Supabase接続エラー:', error.message);
        } else {
            console.log('✅ Supabase接続成功');
            console.log('テストデータ:', data);
        }

        // Edge Functionを有効なJWTでテスト
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

        const response = await fetch('https://wpwqxhyiglbtlaimrjrx.supabase.co/functions/v1/debug-jwt', {
            headers: {
                'Authorization': `Bearer ${anonKey}`
            }
        });

        console.log('\nEdge Functionテスト:');
        console.log('ステータス:', response.status);
        const responseText = await response.text();
        console.log('レスポンス:', responseText);

    } catch (error) {
        console.error('❌ エラー:', error.message);
    }
}

testWithSupabaseJWT();