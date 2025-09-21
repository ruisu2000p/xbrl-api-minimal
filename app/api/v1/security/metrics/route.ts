/**
 * Security Metrics API Endpoint
 * GitHub Security Alert #14 - セキュリティメトリクスの取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseManager } from '@/lib/infrastructure/supabase-manager';
import { getSecurityMetrics, assessSecurityThreat } from '@/lib/security/security-monitor';
import { withSecurity } from '@/lib/middleware/security-middleware';

// このルートは動的である必要があります（request.headersを使用）
export const dynamic = 'force-dynamic'
async function handleGetRequest(request: NextRequest) {
  try {
    // API key validation
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 401 }
      );
    }

    const serviceClient = supabaseManager.getServiceClient();

    // APIキー検証
    const { data: authResult, error: authError } = await serviceClient
      .rpc('verify_api_key_complete_v2', { p_api_key: apiKey });

    if (authError || !authResult?.valid) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Admin権限チェック（セキュリティメトリクスは管理者のみアクセス可能）
    if (authResult.tier !== 'premium' && authResult.tier !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient privileges. Admin access required.' },
        { status: 403 }
      );
    }

    // クエリパラメータから時間範囲を取得
    const searchParams = request.nextUrl.searchParams;
    const timeRangeParam = searchParams.get('timeRange');
    let timeRangeMs = 3600000; // デフォルト1時間

    if (timeRangeParam) {
      switch (timeRangeParam) {
        case '5m':
          timeRangeMs = 300000;
          break;
        case '15m':
          timeRangeMs = 900000;
          break;
        case '1h':
          timeRangeMs = 3600000;
          break;
        case '6h':
          timeRangeMs = 21600000;
          break;
        case '24h':
          timeRangeMs = 86400000;
          break;
        case '7d':
          timeRangeMs = 604800000;
          break;
        default:
          const customMs = parseInt(timeRangeParam, 10);
          if (!isNaN(customMs) && customMs > 0 && customMs <= 604800000) {
            timeRangeMs = customMs;
          }
      }
    }

    // メトリクス取得
    const metrics = getSecurityMetrics(timeRangeMs);
    const threat = assessSecurityThreat();

    // データベースから追加統計を取得
    const { data: dbStats, error: dbError } = await serviceClient
      .from('security_events')
      .select('event_type, severity, COUNT(*)', { count: 'exact' })
      .gte('timestamp', new Date(Date.now() - timeRangeMs).toISOString())
      .order('timestamp', { ascending: false });

    // レスポンス構築
    const response = {
      success: true,
      metrics: {
        ...metrics,
        databaseEvents: dbStats?.length || 0
      },
      threat,
      summary: {
        healthStatus: threat.threatLevel === 'NONE' || threat.threatLevel === 'LOW' ? 'HEALTHY' :
                      threat.threatLevel === 'MEDIUM' ? 'WARNING' : 'CRITICAL',
        totalThreatsDetected: metrics.pathInjectionAttempts + metrics.sqlInjectionAttempts + metrics.xssAttempts,
        blockedAttempts: metrics.rateLimitExceeded,
        securityScore: calculateSecurityScore(metrics, threat)
      },
      recommendations: generateRecommendations(metrics, threat),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff'
      }
    });

  } catch (error) {
    console.error('Security metrics API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve security metrics',
        message: process.env.NODE_ENV === 'production' ?
          'Internal server error' : (error as Error).message
      },
      { status: 500 }
    );
  }
}

/**
 * セキュリティスコアの計算（0-100）
 */
function calculateSecurityScore(metrics: any, threat: any): number {
  let score = 100;

  // 脅威レベルによる減点
  switch (threat.threatLevel) {
    case 'CRITICAL':
      score -= 50;
      break;
    case 'HIGH':
      score -= 30;
      break;
    case 'MEDIUM':
      score -= 15;
      break;
    case 'LOW':
      score -= 5;
      break;
  }

  // イベント数による減点
  score -= Math.min(20, metrics.criticalEvents * 5);
  score -= Math.min(15, metrics.highEvents * 2);
  score -= Math.min(10, metrics.mediumEvents * 0.5);

  // 攻撃タイプによる減点
  if (metrics.pathInjectionAttempts > 0) score -= 10;
  if (metrics.sqlInjectionAttempts > 0) score -= 10;
  if (metrics.xssAttempts > 0) score -= 8;
  if (metrics.rateLimitExceeded > 10) score -= 5;

  return Math.max(0, Math.round(score));
}

/**
 * 推奨事項の生成
 */
function generateRecommendations(metrics: any, threat: any): string[] {
  const recommendations: string[] = [];

  // 基本的な推奨事項
  if (threat.threatLevel === 'CRITICAL' || threat.threatLevel === 'HIGH') {
    recommendations.push('⚠️ Immediate action required: Review security logs and block suspicious IPs');
  }

  if (metrics.pathInjectionAttempts > 0) {
    recommendations.push('🔒 Strengthen path validation and implement strict input sanitization');
  }

  if (metrics.sqlInjectionAttempts > 0) {
    recommendations.push('💾 Review database queries and ensure proper parameterization');
  }

  if (metrics.xssAttempts > 0) {
    recommendations.push('🛡️ Enhance output encoding and Content Security Policy');
  }

  if (metrics.uniqueIps > 100) {
    recommendations.push('🌐 Consider implementing IP-based rate limiting');
  }

  if (threat.suspiciousIps.length > 0) {
    recommendations.push(`🚫 Block suspicious IPs: ${threat.suspiciousIps.slice(0, 5).join(', ')}`);
  }

  if (metrics.rateLimitExceeded > 0) {
    recommendations.push('⏱️ Review rate limiting thresholds');
  }

  // 一般的な推奨事項
  if (recommendations.length === 0) {
    recommendations.push('✅ Continue monitoring security events');
    recommendations.push('📊 Regularly review security metrics');
    recommendations.push('🔄 Keep security policies up to date');
  }

  return recommendations;
}

// エクスポート
export const GET = withSecurity(handleGetRequest);