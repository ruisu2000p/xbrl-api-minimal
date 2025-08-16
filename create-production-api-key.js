import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Supabase設定
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zxzyidqrvzfzhicfuhlo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4enlpZHFydnpmemhpY2Z1aGxvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE1NjIyMiwiZXhwIjoyMDcwNzMyMjIyfQ.I48BfRK6_YgAMF0LR9PmhzvFgqwu8fZDp-hz7ZVTvns';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createProductionApiKey(name, tier = 'pro') {
    console.log('🔑 Creating Production API Key\n');
    console.log('=====================================\n');
    
    try {
        // 1. Generate a secure API key
        const randomBytes = crypto.randomBytes(32);
        const apiKey = `xbrl_prod_${randomBytes.toString('hex')}`;
        const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
        
        console.log(`📝 Key Name: ${name}`);
        console.log(`🎯 Tier: ${tier}`);
        console.log(`🔐 Key Hash: ${keyHash.substring(0, 16)}...`);
        
        // 2. Insert into database
        const { data: keyData, error: keyError } = await supabase
            .from('api_keys')
            .insert({
                key_hash: keyHash,
                name: name,
                description: `Production API key created on ${new Date().toISOString()}`,
                tier: tier,
                status: 'active',
                expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (keyError) {
            console.error('❌ Error creating API key:', keyError);
            return null;
        }
        
        console.log(`✅ API key created with ID: ${keyData.id}\n`);
        
        // 3. Set up rate limits based on tier
        const rateLimits = {
            free: { hour: 100, day: 1000, month: 10000 },
            basic: { hour: 500, day: 5000, month: 50000 },
            pro: { hour: 1000, day: 10000, month: 100000 },
            enterprise: { hour: 10000, day: 100000, month: 1000000 }
        };
        
        const limits = rateLimits[tier] || rateLimits.free;
        
        const { error: limitError } = await supabase
            .from('api_key_rate_limits')
            .insert({
                api_key_id: keyData.id,
                requests_per_hour: limits.hour,
                requests_per_day: limits.day,
                requests_per_month: limits.month,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        
        if (limitError) {
            console.error('⚠️ Warning: Could not set rate limits:', limitError.message);
        } else {
            console.log('📊 Rate Limits Set:');
            console.log(`   - Per Hour: ${limits.hour}`);
            console.log(`   - Per Day: ${limits.day}`);
            console.log(`   - Per Month: ${limits.month}\n`);
        }
        
        // 4. Return the key (only shown once!)
        console.log('=====================================');
        console.log('🎉 SUCCESS! API Key Created\n');
        console.log('⚠️  IMPORTANT: Save this key securely!');
        console.log('    This is the only time it will be shown.\n');
        console.log('=====================================\n');
        console.log('API KEY:', apiKey);
        console.log('\n=====================================\n');
        console.log('📋 Usage Example:\n');
        console.log('curl -H "X-API-Key: ' + apiKey + '" \\');
        console.log('  https://xbrl-api-minimal.vercel.app/api/v1/companies\n');
        console.log('=====================================\n');
        
        return {
            apiKey,
            keyId: keyData.id,
            expiresAt: keyData.expires_at,
            tier: tier
        };
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
        return null;
    }
}

// Command line interface
const args = process.argv.slice(2);
const keyName = args[0] || 'Production API Key';
const keyTier = args[1] || 'pro';

// Validate tier
const validTiers = ['free', 'basic', 'pro', 'enterprise'];
if (!validTiers.includes(keyTier)) {
    console.error('❌ Invalid tier. Must be one of:', validTiers.join(', '));
    process.exit(1);
}

// Create the key
createProductionApiKey(keyName, keyTier).then(result => {
    if (result) {
        console.log('✅ API key generation complete!');
        process.exit(0);
    } else {
        console.error('❌ Failed to create API key');
        process.exit(1);
    }
}).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});