/**
 * Security Monitor
 * GitHub Security Alert #14 - リアルタイムセキュリティ監視
 */

import { supabaseManager } from '@/lib/infrastructure/supabase-manager';
import { NextRequest, NextResponse } from 'next/server';

export interface SecurityEvent {
  timestamp: Date;
  eventType: 'PATH_INJECTION' | 'SQL_INJECTION' | 'XSS_ATTEMPT' | 'CSRF_ATTEMPT' |
             'RATE_LIMIT' | 'UNAUTHORIZED' | 'SUSPICIOUS_PATTERN' | 'VALIDATION_ERROR';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source: string;
  clientIp?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  violations?: string[];
  details?: any;
  requestId?: string;
}

export interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  mediumEvents: number;
  lowEvents: number;
  pathInjectionAttempts: number;
  sqlInjectionAttempts: number;
  xssAttempts: number;
  rateLimitExceeded: number;
  uniqueIps: number;
  topViolations: Array<{ violation: string; count: number }>;
  timeRange: { start: Date; end: Date };
}

export interface SecurityThreat {
  threatLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  indicators: string[];
  recommendations: string[];
  affectedEndpoints: string[];
  suspiciousIps: string[];
}

export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private events: SecurityEvent[] = [];
  private readonly MAX_EVENTS = 10000;
  private readonly ALERT_THRESHOLD_CRITICAL = 5;
  private readonly ALERT_THRESHOLD_HIGH = 10;
  private readonly WINDOW_SIZE_MS = 3600000; // 1時間

  // IPごとのイベント追跡
  private ipEvents: Map<string, SecurityEvent[]> = new Map();

  // エンドポイントごとのイベント追跡
  private endpointEvents: Map<string, SecurityEvent[]> = new Map();

  // アラート送信済みフラグ
  private alertsSent: Map<string, number> = new Map();

  private constructor() {
    // Singleton pattern
    this.startCleanupJob();
  }

  static getInstance(): SecurityMonitor {
    if (!this.instance) {
      this.instance = new SecurityMonitor();
    }
    return this.instance;
  }

  /**
   * セキュリティイベントの記録
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    // メモリに保存
    this.events.push(event);

    // イベント数制限
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    // IP別追跡
    if (event.clientIp) {
      if (!this.ipEvents.has(event.clientIp)) {
        this.ipEvents.set(event.clientIp, []);
      }
      this.ipEvents.get(event.clientIp)!.push(event);
    }

    // エンドポイント別追跡
    if (event.endpoint) {
      if (!this.endpointEvents.has(event.endpoint)) {
        this.endpointEvents.set(event.endpoint, []);
      }
      this.endpointEvents.get(event.endpoint)!.push(event);
    }

    // データベースに保存（非同期）
    this.persistToDatabase(event).catch(console.error);

    // 脅威評価とアラート
    await this.evaluateThreatAndAlert(event);
  }

  /**
   * データベースへの永続化
   */
  private async persistToDatabase(event: SecurityEvent): Promise<void> {
    try {
      const serviceClient = supabaseManager.getServiceClient();
    if (!serviceClient) {
      return NextResponse.json(
        { error: 'Service client not available' },
        { status: 500 }
      );
    }

      await serviceClient.from('security_events').insert({
        timestamp: event.timestamp.toISOString(),
        event_type: event.eventType,
        severity: event.severity,
        source: event.source,
        client_ip: event.clientIp,
        user_agent: event.userAgent,
        endpoint: event.endpoint,
        method: event.method,
        violations: event.violations,
        details: event.details,
        request_id: event.requestId
      });
    } catch (error) {
      console.error('Failed to persist security event:', error);
      // データベース書き込み失敗はログのみ（システム停止しない）
    }
  }

  /**
   * 脅威評価とアラート
   */
  private async evaluateThreatAndAlert(event: SecurityEvent): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.WINDOW_SIZE_MS;

    // IPからの攻撃パターン検出
    if (event.clientIp) {
      const ipEvents = this.getRecentEventsForIp(event.clientIp, windowStart);

      // 同一IPから短時間に複数の攻撃
      const criticalCount = ipEvents.filter(e => e.severity === 'CRITICAL').length;
      const highCount = ipEvents.filter(e => e.severity === 'HIGH').length;

      if (criticalCount >= this.ALERT_THRESHOLD_CRITICAL) {
        await this.sendAlert({
          level: 'CRITICAL',
          message: `Critical security threat detected from IP ${event.clientIp}`,
          details: {
            ip: event.clientIp,
            criticalEvents: criticalCount,
            recentViolations: ipEvents.flatMap(e => e.violations || [])
          }
        });
      } else if (highCount >= this.ALERT_THRESHOLD_HIGH) {
        await this.sendAlert({
          level: 'HIGH',
          message: `High security threat detected from IP ${event.clientIp}`,
          details: {
            ip: event.clientIp,
            highEvents: highCount,
            recentViolations: ipEvents.flatMap(e => e.violations || [])
          }
        });
      }
    }

    // エンドポイント攻撃パターン検出
    if (event.endpoint) {
      const endpointEvents = this.getRecentEventsForEndpoint(event.endpoint, windowStart);

      if (endpointEvents.length > 50) {
        await this.sendAlert({
          level: 'HIGH',
          message: `Potential DDoS attack on endpoint ${event.endpoint}`,
          details: {
            endpoint: event.endpoint,
            eventCount: endpointEvents.length,
            uniqueIps: new Set(endpointEvents.map(e => e.clientIp)).size
          }
        });
      }
    }
  }

  /**
   * 特定IPの最近のイベント取得
   */
  private getRecentEventsForIp(ip: string, since: number): SecurityEvent[] {
    const events = this.ipEvents.get(ip) || [];
    return events.filter(e => e.timestamp.getTime() > since);
  }

  /**
   * 特定エンドポイントの最近のイベント取得
   */
  private getRecentEventsForEndpoint(endpoint: string, since: number): SecurityEvent[] {
    const events = this.endpointEvents.get(endpoint) || [];
    return events.filter(e => e.timestamp.getTime() > since);
  }

  /**
   * アラート送信
   */
  private async sendAlert(alert: {
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
    details: any;
  }): Promise<void> {
    // レート制限（同じアラートを繰り返し送らない）
    const alertKey = `${alert.level}:${alert.message}`;
    const lastSent = this.alertsSent.get(alertKey) || 0;
    const now = Date.now();

    if (now - lastSent < 300000) { // 5分以内は再送しない
      return;
    }

    this.alertsSent.set(alertKey, now);

    console.error('🚨 SECURITY ALERT:', {
      timestamp: new Date().toISOString(),
      ...alert
    });

    // 本番環境では外部サービスに通知
    if (process.env.NODE_ENV === 'production') {
      try {
        // Webhook通知（実装例）
        if (process.env.SECURITY_WEBHOOK_URL) {
          await fetch(process.env.SECURITY_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              timestamp: new Date().toISOString(),
              ...alert
            })
          });
        }

        // データベースにアラート記録
        const serviceClient = supabaseManager.getServiceClient();
    if (!serviceClient) {
      return NextResponse.json(
        { error: 'Service client not available' },
        { status: 500 }
      );
    }
        await serviceClient.from('security_alerts').insert({
          timestamp: new Date().toISOString(),
          level: alert.level,
          message: alert.message,
          details: alert.details
        });
      } catch (error) {
        console.error('Failed to send security alert:', error);
      }
    }
  }

  /**
   * セキュリティメトリクス取得
   */
  getMetrics(timeRangeMs: number = 3600000): SecurityMetrics {
    const now = Date.now();
    const startTime = now - timeRangeMs;
    const relevantEvents = this.events.filter(
      e => e.timestamp.getTime() > startTime
    );

    // 違反の集計
    const violationCounts = new Map<string, number>();
    relevantEvents.forEach(event => {
      (event.violations || []).forEach(violation => {
        violationCounts.set(violation, (violationCounts.get(violation) || 0) + 1);
      });
    });

    // トップ違反の取得
    const topViolations = Array.from(violationCounts.entries())
      .map(([violation, count]) => ({ violation, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEvents: relevantEvents.length,
      criticalEvents: relevantEvents.filter(e => e.severity === 'CRITICAL').length,
      highEvents: relevantEvents.filter(e => e.severity === 'HIGH').length,
      mediumEvents: relevantEvents.filter(e => e.severity === 'MEDIUM').length,
      lowEvents: relevantEvents.filter(e => e.severity === 'LOW').length,
      pathInjectionAttempts: relevantEvents.filter(e => e.eventType === 'PATH_INJECTION').length,
      sqlInjectionAttempts: relevantEvents.filter(e => e.eventType === 'SQL_INJECTION').length,
      xssAttempts: relevantEvents.filter(e => e.eventType === 'XSS_ATTEMPT').length,
      rateLimitExceeded: relevantEvents.filter(e => e.eventType === 'RATE_LIMIT').length,
      uniqueIps: new Set(relevantEvents.map(e => e.clientIp).filter(Boolean)).size,
      topViolations,
      timeRange: {
        start: new Date(startTime),
        end: new Date(now)
      }
    };
  }

  /**
   * 脅威評価
   */
  assessThreat(): SecurityThreat {
    const metrics = this.getMetrics();
    const suspiciousIps = this.identifySuspiciousIps();
    const affectedEndpoints = this.identifyAffectedEndpoints();

    let threatLevel: SecurityThreat['threatLevel'] = 'NONE';
    const indicators: string[] = [];
    const recommendations: string[] = [];

    // 脅威レベル判定
    if (metrics.criticalEvents > 0) {
      threatLevel = 'CRITICAL';
      indicators.push(`${metrics.criticalEvents} critical security events detected`);
      recommendations.push('Immediate investigation required');
      recommendations.push('Consider blocking suspicious IPs');
    } else if (metrics.highEvents > 5) {
      threatLevel = 'HIGH';
      indicators.push(`${metrics.highEvents} high severity events detected`);
      recommendations.push('Review security logs');
      recommendations.push('Increase monitoring');
    } else if (metrics.mediumEvents > 10) {
      threatLevel = 'MEDIUM';
      indicators.push(`${metrics.mediumEvents} medium severity events detected`);
      recommendations.push('Monitor for escalation');
    } else if (metrics.totalEvents > 50) {
      threatLevel = 'LOW';
      indicators.push('Elevated security event activity');
      recommendations.push('Continue monitoring');
    }

    // 特定の攻撃パターン
    if (metrics.pathInjectionAttempts > 0) {
      indicators.push(`${metrics.pathInjectionAttempts} path injection attempts`);
      recommendations.push('Review path validation logic');
    }

    if (metrics.sqlInjectionAttempts > 0) {
      indicators.push(`${metrics.sqlInjectionAttempts} SQL injection attempts`);
      recommendations.push('Verify query parameterization');
    }

    if (metrics.xssAttempts > 0) {
      indicators.push(`${metrics.xssAttempts} XSS attempts`);
      recommendations.push('Check output encoding');
    }

    return {
      threatLevel,
      indicators,
      recommendations,
      affectedEndpoints,
      suspiciousIps
    };
  }

  /**
   * 疑わしいIPの特定
   */
  private identifySuspiciousIps(): string[] {
    const suspiciousIps: string[] = [];
    const threshold = 10; // 10イベント以上で疑わしい

    this.ipEvents.forEach((events, ip) => {
      const recentEvents = events.filter(
        e => e.timestamp.getTime() > Date.now() - this.WINDOW_SIZE_MS
      );

      if (recentEvents.length >= threshold) {
        suspiciousIps.push(ip);
      }
    });

    return suspiciousIps;
  }

  /**
   * 影響を受けたエンドポイントの特定
   */
  private identifyAffectedEndpoints(): string[] {
    const affectedEndpoints: string[] = [];
    const threshold = 20; // 20イベント以上で影響あり

    this.endpointEvents.forEach((events, endpoint) => {
      const recentEvents = events.filter(
        e => e.timestamp.getTime() > Date.now() - this.WINDOW_SIZE_MS
      );

      if (recentEvents.length >= threshold) {
        affectedEndpoints.push(endpoint);
      }
    });

    return affectedEndpoints;
  }

  /**
   * リクエストから基本情報を抽出
   */
  static extractRequestInfo(request: NextRequest): {
    clientIp?: string;
    userAgent?: string;
    endpoint: string;
    method: string;
  } {
    return {
      clientIp: request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                request.headers.get('x-real-ip') ||
                request.headers.get('cf-connecting-ip') ||
                request.ip,
      userAgent: request.headers.get('user-agent') || undefined,
      endpoint: request.nextUrl.pathname,
      method: request.method
    };
  }

  /**
   * クリーンアップジョブ
   * サーバレス環境では動作しないように制御
   */
  private startCleanupJob(): void {
    // サーバレス環境（Vercel等）では setInterval を使用しない
    const isServerless = process.env.VERCEL ||
                        process.env.AWS_LAMBDA_FUNCTION_NAME ||
                        process.env.NETLIFY ||
                        process.env.NODE_ENV === 'test';

    if (isServerless) {
      console.log('[SecurityMonitor] Cleanup job disabled in serverless environment');
      return;
    }

    const intervalId = setInterval(() => {
      const cutoff = Date.now() - this.WINDOW_SIZE_MS * 2;

      // 古いイベントを削除
      this.events = this.events.filter(
        e => e.timestamp.getTime() > cutoff
      );

      // IP別イベントのクリーンアップ
      this.ipEvents.forEach((events, ip) => {
        const filtered = events.filter(
          e => e.timestamp.getTime() > cutoff
        );
        if (filtered.length === 0) {
          this.ipEvents.delete(ip);
        } else {
          this.ipEvents.set(ip, filtered);
        }
      });

      // エンドポイント別イベントのクリーンアップ
      this.endpointEvents.forEach((events, endpoint) => {
        const filtered = events.filter(
          e => e.timestamp.getTime() > cutoff
        );
        if (filtered.length === 0) {
          this.endpointEvents.delete(endpoint);
        } else {
          this.endpointEvents.set(endpoint, filtered);
        }
      });

      // アラート送信履歴のクリーンアップ
      this.alertsSent.forEach((timestamp, key) => {
        if (timestamp < cutoff) {
          this.alertsSent.delete(key);
        }
      });
    }, 600000); // 10分ごと

    // グローバルなクリーンアップ関数の登録（Jest等のテスト環境用）
    if (typeof global !== 'undefined') {
      (global as any).__cleanupSecurityMonitor = () => {
        clearInterval(intervalId);
      };
    }
  }
}

/**
 * セキュリティイベントのログユーティリティ
 */
export async function logSecurityEvent(
  request: NextRequest,
  eventType: SecurityEvent['eventType'],
  severity: SecurityEvent['severity'],
  violations?: string[],
  details?: any
): Promise<void> {
  const monitor = SecurityMonitor.getInstance();
  const requestInfo = SecurityMonitor.extractRequestInfo(request);

  await monitor.logSecurityEvent({
    timestamp: new Date(),
    eventType,
    severity,
    source: 'API',
    ...requestInfo,
    violations,
    details,
    requestId: request.headers.get('x-request-id') || undefined
  });
}

/**
 * エクスポート用のメトリクス取得
 */
export function getSecurityMetrics(timeRangeMs?: number): SecurityMetrics {
  const monitor = SecurityMonitor.getInstance();
  return monitor.getMetrics(timeRangeMs);
}

/**
 * 脅威評価取得
 */
export function assessSecurityThreat(): SecurityThreat {
  const monitor = SecurityMonitor.getInstance();
  return monitor.assessThreat();
}