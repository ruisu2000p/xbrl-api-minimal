-- ===========================================
-- サンプルMarkdownメタデータ投入
-- Supabase SQL Editorで実行してください
-- ===========================================

-- サンプルデータ投入
INSERT INTO markdown_files_metadata (
  company_id,
  company_name,
  file_name,
  file_path,
  storage_path,
  fiscal_year,
  document_type,
  section_type,
  file_order,
  file_size,
  content_preview,
  has_tables,
  has_images
) VALUES 

-- フルサト・マルカホールディングス - ヘッダー
(
  'S100NS9Y',
  'フルサト・マルカホールディングス株式会社',
  '0000000_header_jpcrp030000-asr-001_E36707-000_2021-12-31_01_2022-03-30_ixbrl.md',
  'S100NS9Y/PublicDoc/0000000_header_jpcrp030000-asr-001_E36707-000_2021-12-31_01_2022-03-30_ixbrl.md',
  'markdown-files/S100NS9Y/PublicDoc/0000000_header_jpcrp030000-asr-001_E36707-000_2021-12-31_01_2022-03-30_ixbrl.md',
  2021,
  'PublicDoc',
  'header',
  0,
  2048,
  '# 【表紙】

【提出書類】 |  有価証券報告書
---|---
【根拠条文】 |  金融商品取引法第24条第１項
【提出先】 |  関東財務局長
【提出日】 |  2022年３月30日
【事業年度】 |  第１期（自 2021年10月１日 至 2021年12月31日）
【会社名】 |  フルサト・マルカホールディングス株式会社
【英訳名】 |  MARUKA FURUSATO Corporation',
  TRUE,
  FALSE
),

-- タカショー - 企業概況
(
  'S100L3K4',
  '株式会社タカショー',
  '0101010_honbun_jpcrp030000-asr-001_E02888-000_2021-01-20_01_2021-04-15_ixbrl.md',
  'S100L3K4/PublicDoc_markdown/0101010_honbun_jpcrp030000-asr-001_E02888-000_2021-01-20_01_2021-04-15_ixbrl.md',
  'markdown-files/S100L3K4/PublicDoc_markdown/0101010_honbun_jpcrp030000-asr-001_E02888-000_2021-01-20_01_2021-04-15_ixbrl.md',
  2021,
  'PublicDoc',
  'company_overview',
  101010,
  15000,
  '# 第一部【企業情報】

## 第１【企業の概況】

### １【主要な経営指標等の推移】

当社は、エクステリア・ガーデニング用品の企画・製造・販売を主力事業として展開しております。

#### 連結経営指標等

| 決算年月 | 2017年１月 | 2018年１月 | 2019年１月 | 2020年１月 | 2021年１月 |
|---------|-----------|-----------|-----------|-----------|-----------|
| 売上高（千円） | 7,244,588 | 7,899,652 | 8,156,983 | 8,440,125 | 8,789,456 |',
  TRUE,
  FALSE
),

-- 亀田製菓 - 事業状況
(
  'S100LJ4F',
  '亀田製菓株式会社',
  '0102010_honbun_jpcrp030000-asr-001_E00302-000_2021-03-31_01_2021-06-29_ixbrl.md',
  'S100LJ4F/PublicDoc_markdown/0102010_honbun_jpcrp030000-asr-001_E00302-000_2021-03-31_01_2021-06-29_ixbrl.md',
  'markdown-files/S100LJ4F/PublicDoc_markdown/0102010_honbun_jpcrp030000-asr-001_E00302-000_2021-03-31_01_2021-06-29_ixbrl.md',
  2021,
  'PublicDoc',
  'business_overview',
  102010,
  22000,
  '## 第１【企業の概況】

### ２【事業の状況】

#### (1) 経営方針、経営環境及び対処すべき課題等

当社グループは、「美味しさ、楽しさ、健康を」をモットーに、米菓を中心とした菓子事業を展開しております。

| リスク項目 | 内容 | 対策 |
|----------|------|------|
| 原材料価格の変動 | 米価格の変動 | 調達先の多様化 |',
  TRUE,
  FALSE
),

-- サンプル企業 - 事業リスク
(
  'S100A123',
  '株式会社サンプル',
  '0103010_honbun_sample_2020.md',
  'S100A123/PublicDoc_markdown/0103010_honbun_sample_2020.md',
  'markdown-files/S100A123/PublicDoc_markdown/0103010_honbun_sample_2020.md',
  2020,
  'PublicDoc',
  'business_risks',
  103010,
  8500,
  '### ３【事業等のリスク】

当社グループの事業展開において、投資者の判断に重要な影響を及ぼす可能性があると考えられる主要なリスクは以下のとおりです。

#### (1) 市場環境の変化

消費者の嗜好の変化や競合他社との競争激化により、当社製品の売上が減少する可能性があります。

#### (2) 原材料価格の変動

主要原材料の価格上昇が、当社の業績に影響を与える可能性があります。',
  FALSE,
  FALSE
),

-- テスト企業 - 経営分析（監査資料）
(
  'S100B456',
  '株式会社テスト',
  '0104010_honbun_test_2022.md',
  'S100B456/AuditDoc_markdown/0104010_honbun_test_2022.md',
  'markdown-files/S100B456/AuditDoc_markdown/0104010_honbun_test_2022.md',
  2022,
  'AuditDoc',
  'management_analysis',
  104010,
  12000,
  '### ４【経営者による財政状態、経営成績及びキャッシュ・フローの状況の分析】

#### (1) 経営成績等の状況の概要

当連結会計年度の業績は以下のとおりです。

| 項目 | 金額（千円） | 前年同期比 |
|------|-------------|----------|
| 売上高 | 1,500,000 | +5.2% |
| 営業利益 | 150,000 | +8.1% |

![業績推移グラフ](images/performance_graph.png)',
  TRUE,
  TRUE
);

-- ===========================================
-- 投入確認クエリ
-- ===========================================

-- 1. 投入件数確認
SELECT 
  '投入完了' as status,
  COUNT(*) as total_records
FROM markdown_files_metadata;

-- 2. 企業別統計
SELECT 
  company_name,
  fiscal_year,
  document_type,
  COUNT(*) as file_count
FROM markdown_files_metadata 
GROUP BY company_name, fiscal_year, document_type
ORDER BY company_name, fiscal_year;

-- 3. セクション別統計
SELECT 
  section_type,
  COUNT(*) as count,
  AVG(file_size) as avg_size_bytes
FROM markdown_files_metadata 
GROUP BY section_type
ORDER BY count DESC;

-- 4. 年度別統計
SELECT 
  fiscal_year,
  COUNT(*) as file_count,
  COUNT(DISTINCT company_id) as company_count
FROM markdown_files_metadata 
WHERE fiscal_year IS NOT NULL
GROUP BY fiscal_year
ORDER BY fiscal_year DESC;

-- 5. コンテンツ特徴統計
SELECT 
  'テーブルあり' as feature,
  COUNT(*) as count
FROM markdown_files_metadata 
WHERE has_tables = TRUE

UNION ALL

SELECT 
  '画像あり' as feature,
  COUNT(*) as count
FROM markdown_files_metadata 
WHERE has_images = TRUE;

SELECT '✅ サンプルMarkdownメタデータ投入完了' as message;