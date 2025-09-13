#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CSVファイルからSQL INSERT文を生成するスクリプト
"""

import csv
import re
import os

# CSVファイルのパス
CSV_FILE = r'C:\Users\pumpk\Downloads\2025-09-01T11-24_export.csv'
OUTPUT_DIR = r'C:\Users\pumpk\xbrl-api-minimal\scripts\sql-inserts'

# セクターのマッピング
def guess_sector(company_name):
    if '銀行' in company_name:
        return '銀行業'
    elif '証券' in company_name:
        return '証券業'
    elif '保険' in company_name:
        return '保険業'
    elif '不動産' in company_name:
        return '不動産業'
    elif '建設' in company_name or '建築' in company_name:
        return '建設業'
    elif '電機' in company_name or '電気' in company_name or '電子' in company_name:
        return '電気機器'
    elif '自動車' in company_name or 'モーター' in company_name:
        return '輸送用機器'
    elif '鉄道' in company_name or '旅客' in company_name:
        return '陸運業'
    elif '海運' in company_name or '船' in company_name:
        return '海運業'
    elif '航空' in company_name or 'エアライン' in company_name:
        return '空運業'
    elif '製薬' in company_name or '薬品' in company_name or '薬局' in company_name:
        return '医薬品'
    elif '化学' in company_name or '化成' in company_name:
        return '化学'
    elif '食品' in company_name or '製菓' in company_name or '飲料' in company_name:
        return '食料品'
    elif '鉄鋼' in company_name or '製鉄' in company_name:
        return '鉄鋼'
    elif '機械' in company_name or '機器' in company_name:
        return '機械'
    elif '商事' in company_name or '商社' in company_name or '商業' in company_name:
        return '卸売業'
    elif '百貨店' in company_name or 'ストア' in company_name or 'マート' in company_name:
        return '小売業'
    elif 'ホテル' in company_name or '旅館' in company_name or 'リゾート' in company_name:
        return 'サービス業'
    elif 'ソフト' in company_name or 'システム' in company_name or 'IT' in company_name:
        return '情報・通信業'
    elif 'ガラス' in company_name or 'セメント' in company_name:
        return 'ガラス・土石製品'
    elif 'ゴム' in company_name:
        return 'ゴム製品'
    elif '繊維' in company_name or 'テキスタイル' in company_name:
        return '繊維製品'
    elif '紙' in company_name or 'パルプ' in company_name:
        return 'パルプ・紙'
    elif '電力' in company_name:
        return '電気・ガス業'
    elif 'ガス' in company_name:
        return '電気・ガス業'
    elif '石油' in company_name or 'エネルギー' in company_name:
        return '石油・石炭製品'
    elif '印刷' in company_name:
        return 'その他製品'
    elif '精密' in company_name:
        return '精密機器'
    elif '金属' in company_name:
        return '非鉄金属'
    elif '倉庫' in company_name or '物流' in company_name:
        return '倉庫・運輸関連業'
    elif '通信' in company_name or 'テレコム' in company_name:
        return '情報・通信業'
    elif 'メディア' in company_name or '放送' in company_name or 'テレビ' in company_name:
        return '情報・通信業'
    elif '農' in company_name or '林' in company_name or '水産' in company_name:
        return '水産・農林業'
    elif '鉱業' in company_name or '鉱山' in company_name:
        return '鉱業'
    elif 'サービス' in company_name:
        return 'サービス業'
    else:
        return 'その他'

def generate_ticker(doc_id, index):
    """ティッカーコードを生成"""
    # doc_idのハッシュ値から4桁の数字を生成
    hash_val = hash(doc_id) % 9000 + 1000
    return str(hash_val)

def escape_sql_string(s):
    """SQLインジェクション対策のためエスケープ"""
    if s is None:
        return ''
    # シングルクォートをエスケープ
    s = s.replace("'", "''")
    return s

def main():
    # 出力ディレクトリ作成
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # CSVファイル読み込み
    with open(CSV_FILE, 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        next(reader)  # ヘッダーをスキップ
        
        companies = {}
        for i, row in enumerate(reader):
            if len(row) >= 2:
                doc_id = row[0].strip()
                company_name = row[1].strip()
                
                # IDの妥当性チェック
                if doc_id and company_name and doc_id not in companies:
                    companies[doc_id] = {
                        'name': company_name,
                        'ticker': generate_ticker(doc_id, i),
                        'sector': guess_sector(company_name)
                    }
    
    print(f"総企業数: {len(companies)}")
    
    # 1000社ずつのバッチに分割してSQL生成
    batch_size = 1000
    company_items = list(companies.items())
    
    for batch_num in range(0, len(company_items), batch_size):
        batch = company_items[batch_num:batch_num + batch_size]
        batch_index = batch_num // batch_size + 1
        
        output_file = os.path.join(OUTPUT_DIR, f'insert_companies_batch_{batch_index:03d}.sql')
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("-- 企業データ挿入 バッチ {}\n".format(batch_index))
            f.write("INSERT INTO companies (id, ticker_code, company_name, sector) VALUES\n")
            
            values = []
            for doc_id, info in batch:
                name_escaped = escape_sql_string(info['name'])
                values.append(f"  ('{doc_id}', '{info['ticker']}', '{name_escaped}', '{info['sector']}')")
            
            f.write(',\n'.join(values))
            f.write("\nON CONFLICT (id) DO UPDATE SET\n")
            f.write("  company_name = EXCLUDED.company_name,\n")
            f.write("  ticker_code = EXCLUDED.ticker_code,\n")
            f.write("  sector = EXCLUDED.sector;\n")
        
        print(f"バッチ {batch_index}: {len(batch)}社のSQL生成完了 -> {output_file}")
    
    print(f"\n完了! SQLファイルは {OUTPUT_DIR} に保存されました。")

if __name__ == '__main__':
    main()