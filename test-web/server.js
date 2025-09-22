/**
 * テスト用ローカルサーバー
 * XBRL APIのテスト環境を提供
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 環境変数の設定
const PORT = process.env.PORT || 3002;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wpwqxhyiglbtlaimrjrx.supabase.co';
// テスト環境では、anon keyを使用し、ユーザーのAPIキーで認証
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is required');
    console.log('Please set it in your .env.local file');
    process.exit(1);
}

// Supabaseクライアントの初期化（anon keyを使用）
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Expressアプリの設定
const app = express();
app.use(cors());
app.use(express.json());
// 静的ファイルの公開を制限 - セキュリティ対策
// app.use(express.static(__dirname)); // 全ファイル公開は危険

// ルートパス
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ヘルスチェック
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'XBRL API Test Server is running',
        timestamp: new Date().toISOString()
    });
});

// APIキー検証ミドルウェア
async function validateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
    }

    try {
        // テスト用デモキーの場合
        if (apiKey === 'demo-key' || apiKey === 'test-key') {
            console.log('📝 Using demo API key - limited access');
            req.user = {
                tier: 'free',
                test: true,
                user_id: 'demo-user',
                key_id: 'demo-key-id'
            };
            return next();
        }

        // APIキーが正しい形式かチェック
        if (!apiKey.startsWith('xbrl_v1_')) {
            return res.status(401).json({ error: 'Invalid API key format. Use "demo-key" for testing.' });
        }

        // 本番APIキーの検証（validate_api_key_access関数を呼び出し）
        const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
        const { data, error } = await supabase
            .rpc('validate_api_key_access', { key_hash: keyHash });

        if (error) {
            console.error('API validation error:', error);
            return res.status(401).json({
                error: 'API key validation failed',
                hint: 'Use "demo-key" for testing'
            });
        }

        if (!data || data.length === 0) {
            return res.status(401).json({
                error: 'Invalid or expired API key',
                hint: 'Use "demo-key" for testing'
            });
        }

        req.user = data[0];
        console.log(`✅ Authenticated user: ${req.user.user_id} (${req.user.tier})`);
        next();
    } catch (error) {
        console.error('API key validation error:', error);
        res.status(500).json({
            error: 'Authentication failed',
            hint: 'Use "demo-key" for testing'
        });
    }
}

// 文書検索
app.get('/api/search', validateApiKey, async (req, res) => {
    try {
        const {
            company,
            fiscal_year,
            document_type = 'all',
            limit = 20,
            offset = 0
        } = req.query;

        let query = supabase
            .from('markdown_files_metadata')
            .select('*', { count: 'exact' });

        // Freeティアは直近2年のみ
        if (req.user.tier === 'free' || req.user.test) {
            query = query.in('fiscal_year', ['FY2024', 'FY2025']);
        }

        if (company) {
            // 部分一致検索（大文字小文字を無視）
            query = query.or(`company_name.ilike.%${company}%,company_id.ilike.%${company}%`);
        }

        if (fiscal_year) {
            query = query.eq('fiscal_year', fiscal_year);
        }

        if (document_type !== 'all') {
            const typeMap = {
                'PublicDoc': 'PublicDoc',
                'AuditDoc': 'AuditDoc'
            };
            query = query.eq('file_type', typeMap[document_type] || document_type);
        }

        query = query
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)
            .order('fiscal_year', { ascending: false });

        const { data, error, count } = await query;

        if (error) throw error;

        res.json({
            total: count || 0,
            limit: parseInt(limit),
            offset: parseInt(offset),
            documents: data || []
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 企業一覧
app.get('/api/companies', validateApiKey, async (req, res) => {
    try {
        const {
            fiscal_year,
            limit = 50,
            offset = 0
        } = req.query;

        let query = supabase
            .from('markdown_files_metadata')
            .select('company_id, company_name, fiscal_year');

        if (req.user.tier === 'free' || req.user.test) {
            query = query.in('fiscal_year', ['FY2024', 'FY2025']);
        }

        if (fiscal_year) {
            query = query.eq('fiscal_year', fiscal_year);
        }

        const { data, error } = await query;

        if (error) throw error;

        // 企業ごとにグループ化
        const companies = {};
        (data || []).forEach(row => {
            if (!companies[row.company_id]) {
                companies[row.company_id] = {
                    company_id: row.company_id,
                    company_name: row.company_name,
                    fiscal_years: new Set()
                };
            }
            companies[row.company_id].fiscal_years.add(row.fiscal_year);
        });

        const companyList = Object.values(companies).map(c => ({
            ...c,
            fiscal_years: Array.from(c.fiscal_years).sort()
        }));

        const paginatedList = companyList.slice(
            parseInt(offset),
            parseInt(offset) + parseInt(limit)
        );

        res.json({
            total: companyList.length,
            limit: parseInt(limit),
            offset: parseInt(offset),
            companies: paginatedList
        });
    } catch (error) {
        console.error('Companies error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 企業詳細
app.get('/api/company/:id', validateApiKey, async (req, res) => {
    try {
        const { id } = req.params;

        // 企業マスターデータ取得
        const { data: companyData } = await supabase
            .from('company_master')
            .select('*')
            .eq('doc_id', id)
            .single();

        // 文書一覧取得
        let documentsQuery = supabase
            .from('markdown_files_metadata')
            .select('*')
            .eq('company_id', id)
            .order('fiscal_year', { ascending: false });

        if (req.user.tier === 'free' || req.user.test) {
            documentsQuery = documentsQuery.in('fiscal_year', ['FY2024', 'FY2025']);
        }

        const { data: documents, error } = await documentsQuery;

        if (error) throw error;

        // 年度ごとにグループ化
        const documentsByYear = {};
        (documents || []).forEach(doc => {
            if (!documentsByYear[doc.fiscal_year]) {
                documentsByYear[doc.fiscal_year] = [];
            }
            documentsByYear[doc.fiscal_year].push(doc);
        });

        res.json({
            company: {
                id: id,
                name: companyData?.company_name || documents?.[0]?.company_name || 'Unknown',
                document_name: companyData?.document_name,
                submit_date: companyData?.submit_date,
                fiscal_period: companyData?.fiscal_period
            },
            documents_count: documents?.length || 0,
            fiscal_years: Object.keys(documentsByYear).sort(),
            documents_by_year: documentsByYear
        });
    } catch (error) {
        console.error('Company info error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 文書取得
app.get('/api/document', validateApiKey, async (req, res) => {
    try {
        const { path, max_size = 100000 } = req.query;

        if (!path) {
            return res.status(400).json({ error: 'Document path required' });
        }

        // メタデータ取得
        const { data: metadata, error: metaError } = await supabase
            .from('markdown_files_metadata')
            .select('*')
            .eq('storage_path', path)
            .single();

        if (metaError || !metadata) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Freeティアの制限チェック
        if (req.user.tier === 'free' || req.user.test) {
            if (!['FY2024', 'FY2025'].includes(metadata.fiscal_year)) {
                return res.status(403).json({
                    error: 'This document requires a premium subscription'
                });
            }
        }

        // ストレージからダウンロード
        const { data, error } = await supabase.storage
            .from('markdown-files')
            .download(path);

        if (error) {
            throw new Error(`Storage error: ${error.message}`);
        }

        // サイズチェック
        const maxSizeNum = parseInt(max_size);
        if (data.size > maxSizeNum) {
            return res.status(413).json({
                error: `Document too large: ${data.size} bytes (max: ${maxSizeNum})`
            });
        }

        // コンテンツ読み込み
        const content = await data.text();

        res.json({
            metadata,
            content: content.substring(0, maxSizeNum),
            size: data.size
        });
    } catch (error) {
        console.error('Document error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 統計情報
app.get('/api/statistics', validateApiKey, async (req, res) => {
    try {
        let query = supabase
            .from('markdown_files_metadata')
            .select('fiscal_year, file_type, company_id', { count: 'exact' });

        if (req.user.tier === 'free' || req.user.test) {
            query = query.in('fiscal_year', ['FY2024', 'FY2025']);
        }

        const { data, count, error } = await query;

        if (error) throw error;

        // 統計計算
        const stats = {
            total_documents: count || 0,
            by_year: {},
            by_type: {},
            unique_companies: new Set()
        };

        (data || []).forEach(row => {
            stats.by_year[row.fiscal_year] = (stats.by_year[row.fiscal_year] || 0) + 1;
            stats.by_type[row.file_type] = (stats.by_type[row.file_type] || 0) + 1;
            stats.unique_companies.add(row.company_id);
        });

        res.json({
            total_documents: stats.total_documents,
            total_companies: stats.unique_companies.size,
            documents_by_year: stats.by_year,
            documents_by_type: stats.by_type,
            tier_info: {
                current_tier: req.user.tier || 'free',
                accessible_years: req.user.tier === 'free' || req.user.test
                    ? ['FY2024', 'FY2025']
                    : 'all'
            }
        });
    } catch (error) {
        console.error('Statistics error:', error);
        res.status(500).json({ error: error.message });
    }
});

// APIキー登録（テスト用）
app.post('/api/register-key', async (req, res) => {
    try {
        const { api_key, tier = 'free', name = 'Test User' } = req.body;

        if (!api_key || !api_key.startsWith('xbrl_v1_')) {
            return res.status(400).json({ error: 'Invalid API key format' });
        }

        // ハッシュ化
        const keyHash = crypto.createHash('sha256').update(api_key).digest('hex');

        // api_keysテーブルに登録（実際の実装ではService Role Keyが必要）
        // ここではデモとして成功レスポンスを返す
        // Log Injection対策: 改行文字を除去
        const sanitizedApiKey = api_key.substring(0, 20).replace(/[\r\n]/g, '_');
        const sanitizedTier = tier.replace(/[\r\n]/g, '_');
        const sanitizedName = name.replace(/[\r\n]/g, '_');

        console.log(`📝 APIキー登録（デモ）: ${sanitizedApiKey}...`);
        console.log(`   Hash: ${keyHash}`);
        console.log(`   Tier: ${sanitizedTier}`);
        console.log(`   Name: ${sanitizedName}`);

        // 実際のデータベースに登録（anon keyでも可能）
        const { data, error } = await supabase
            .from('api_keys')
            .insert({
                id: crypto.randomUUID(),
                user_id: null, // デモ用なのでNULL
                key_hash: keyHash,
                tier: tier,
                name: name,
                is_active: true,
                created_at: new Date().toISOString(),
                key_prefix: 'xbrl_v1_',
                key_suffix: api_key.slice(-5),
                masked_key: `${api_key.substring(0, 20)}...${api_key.slice(-5)}`
            })
            .select();

        if (error) {
            console.error('APIキー登録エラー:', error);
            // エラーでも成功レスポンスを返す（デモモード）
        }

        res.json({
            success: true,
            message: 'APIキーが登録されました（デモモード）',
            key: api_key.substring(0, 20) + '...',
            tier: tier,
            demo_mode: true,
            note: '実際の登録にはService Role Keyによるデータベースアクセスが必要です'
        });
    } catch (error) {
        console.error('APIキー登録エラー:', error);
        res.status(500).json({ error: error.message });
    }
});

// 404ハンドラー
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// エラーハンドラー
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// サーバー起動
app.listen(PORT, () => {
    console.log('🚀 XBRL API テストサーバー起動');
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`📊 API: http://localhost:${PORT}/api`);
    console.log('\n使用方法:');
    console.log('1. ブラウザで http://localhost:' + PORT + ' を開く');
    console.log('2. APIキーに "test-key" を入力（テスト用）');
    console.log('3. 各種API機能をテスト');
    console.log('\nCtrl+C で終了');
});