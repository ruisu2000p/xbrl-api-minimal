import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// デモアカウントのデータ
const demoAccounts = [
  {
    email: 'demo@example.com',
    password: 'demo1234',
    name: 'デモユーザー',
    company: 'デモ株式会社',
    plan: 'beta'
  },
  {
    email: 'test@example.com', 
    password: 'test1234',
    name: 'テストユーザー',
    company: 'テスト企業',
    plan: 'beta'
  }
];

// パスワードのハッシュ化
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// APIキーの生成
function generateApiKey(): string {
  return 'xbrl_demo_' + crypto.randomBytes(16).toString('hex');
}

export async function GET(request: NextRequest) {
  try {
    const seedData = demoAccounts.map(account => ({
      ...account,
      apiKey: generateApiKey(),
      hashedPassword: hashPassword(account.password),
      createdAt: new Date().toISOString(),
      usage: {
        apiCalls: Math.floor(Math.random() * 500),
        lastReset: new Date().toISOString(),
        monthlyLimit: 1000
      }
    }));

    return NextResponse.json({
      success: true,
      message: 'デモアカウント情報',
      accounts: seedData.map(({ hashedPassword, ...account }) => account),
      note: 'これらのアカウントでログインできます'
    }, { status: 200 });

  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'シードデータの生成に失敗しました' },
      { status: 500 }
    );
  }
}