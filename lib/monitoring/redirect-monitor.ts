/**
 * Redirect Security Monitor
 * GitHub Security Alert #13 - リダイレクトセキュリティ監視
 */

import { NextResponse } from 'next/server';
import { supabaseManager } from '@/lib/infrastructure/supabase-manager';

export interface RedirectSecurityEvent {
  timestamp: Date;
  type: 'OPEN_REDIRECT' | 'PATH_TRAVERSAL' | 'XSS_URL' | 'STATE_TAMPERING' | 'OAUTH_VIOLATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  originalUrl: string;
  sanitizedUrl?: string;
  threat?: string;
  code: string;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

export interface SecurityTrends {
  openRedirectAttempts: number;
  xssAttempts: number;
  pathTraversalAttempts: number;
  stateTamperingAttempts: number;
  totalViolations: number;
  uniqueIps: number;
  topThreats: Array<{ threat: string; count: number }>;
  timeWindow: { start: Date; end: Date };
}

export interface SuspiciousPattern {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ipAddress?: string;
  targetDomain?: string;
  violationCount?: number;
  attemptCount?: number;
  timeWindow?: string;
  details?: any;
}

export class RedirectSecurityMonitor {
  private static instance: RedirectSecurityMonitor;
  private events: RedirectSecurityEvent[] = [];
  private readonly MAX_EVENTS = 10000;
  private readonly WINDOW_SIZE_MS = 3600000; // 1時間

  // アラート閾値
  private static readonly ALERT_THRESHOLDS = {
    OPEN_REDIRECT_ATTEMPTS_PER_MINUTE: 10,
    XSS_ATTEMPTS_PER_HOUR: 5,
    SUSPICIOUS_DOMAINS_PER_IP_PER_HOUR: 20,
    FAILED_VALIDATIONS_PER_IP_PER_HOUR: 100,
    STATE_TAMPERING_PER_HOUR: 3
  };

  // IPごとのイベント追跡
  private ipEvents: Map<string, RedirectSecurityEvent[]> = new Map();

  // ドメインごとの攻撃試行追跡
  private domainAttempts: Map<string, number> = new Map();

  // アラート送信履歴
  private alertHistory: Map<string, number> = new Map();

  private constructor() {
    this.startCleanupJob();
    this.startAnalysisJob();
  }

  static getInstance(): RedirectSecurityMonitor {
    if (!this.instance) {
      this.instance = new RedirectSecurityMonitor();
    }
    return this.instance;
  }

  /**
   * リダイレクトセキュリティイベントの記録
   */
  async logSecurityEvent(event: RedirectSecurityEvent): Promise<void> {
    // メモリに保存
    this.events.push(event);

    // イベント数制限
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    // IP別追跡
    if (event.ipAddress) {
      if (!this.ipEvents.has(event.ipAddress)) {
        this.ipEvents.set(event.ipAddress, []);
      }
      this.ipEvents.get(event.ipAddress)!.push(event);
    }

    // ドメイン攻撃追跡
    const targetDomain = this.extractDomainFromUrl(event.originalUrl);
    if (targetDomain) {
      this.domainAttempts.set(
        targetDomain,
        (this.domainAttempts.get(targetDomain) || 0) + 1
      );
    }

    // データベースに永続化
    await this.persistToDatabase(event);

    // 脅威分析とアラート
    await this.analyzeThreatAndAlert(event);
  }

  /**
   * データベースへの永続化
   */
  private async persistToDatabase(event: RedirectSecurityEvent): Promise<void> {
    try {
      const serviceClient = supabaseManager.getServiceClient();
    if (!serviceClient) {
      return NextResponse.json(
        { error: 'Service client not available' },
        { status: 500 }
      );
    }

      await serviceClient.from('security_violations_log').insert({
        timestamp: event.timestamp.toISOString(),
        type: 'REDIRECT_SECURITY_VIOLATION',
        severity: event.severity,
        original_url: event.originalUrl,
        sanitized_url: event.sanitizedUrl,
        threat: event.threat,
        code: event.code,
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        user_id: event.userId,
        session_id: event.sessionId,
        request_id: event.requestId,
        details: {
          event_type: event.type
        }
      });
    } catch (error) {
      console.error('Failed to persist redirect security event:', error);
      // データベース書き込み失敗はログのみ
    }
  }

  /**
   * 脅威分析とアラート
   */
  private async analyzeThreatAndAlert(event: RedirectSecurityEvent): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    // 重大度別のアラート
    if (event.severity === 'CRITICAL') {
      await this.sendAlert({
        level: 'CRITICAL',
        type: 'IMMEDIATE_THREAT',
        message: `Critical redirect security threat detected: ${event.type}`,
        details: {
          event,
          timestamp: new Date().toISOString()
        }
      });
    }

    // IP別の攻撃パターン検出
    if (event.ipAddress) {
      const ipEvents = this.getRecentEventsForIp(event.ipAddress, oneHourAgo);

      // State改ざん検出
      const tamperingCount = ipEvents.filter(e => e.type === 'STATE_TAMPERING').length;
      if (tamperingCount >= RedirectSecurityMonitor.ALERT_THRESHOLDS.STATE_TAMPERING_PER_HOUR) {
        await this.sendAlert({
          level: 'HIGH',
          type: 'STATE_TAMPERING_ATTACK',
          message: `OAuth state tampering detected from IP ${event.ipAddress}`,
          details: {
            ip: event.ipAddress,
            attempts: tamperingCount,
            timeWindow: '1 hour'
          }
        });
      }

      // Open Redirect攻撃の急増
      const recentRedirects = ipEvents.filter(
        e => e.type === 'OPEN_REDIRECT' && e.timestamp.getTime() > oneMinuteAgo
      ).length;

      if (recentRedirects >= RedirectSecurityMonitor.ALERT_THRESHOLDS.OPEN_REDIRECT_ATTEMPTS_PER_MINUTE) {
        await this.sendAlert({
          level: 'HIGH',
          type: 'OPEN_REDIRECT_SPIKE',
          message: `Rapid open redirect attempts from IP ${event.ipAddress}`,
          details: {
            ip: event.ipAddress,
            attempts: recentRedirects,
            timeWindow: '1 minute'
          }
        });
      }
    }

    // ドメイン別の攻撃パターン
    const trends = await this.analyzeRedirectTrends();
    if (trends.xssAttempts > RedirectSecurityMonitor.ALERT_THRESHOLDS.XSS_ATTEMPTS_PER_HOUR) {
      await this.sendAlert({
        level: 'MEDIUM',
        type: 'XSS_URL_ATTACK',
        message: 'Elevated XSS URL injection attempts detected',
        details: {
          attempts: trends.xssAttempts,
          timeWindow: '1 hour'
        }
      });
    }
  }

  /**
   * リダイレクト攻撃トレンドの分析
   */
  async analyzeRedirectTrends(): Promise<SecurityTrends> {
    const now = Date.now();
    const oneHourAgo = now - this.WINDOW_SIZE_MS;
    const oneMinuteAgo = now - 60000;

    const recentEvents = this.events.filter(
      e => e.timestamp.getTime() > oneHourAgo
    );

    // 脅威タイプ別の集計
    const threatCounts = new Map<string, number>();
    recentEvents.forEach(event => {
      if (event.threat) {
        threatCounts.set(event.threat, (threatCounts.get(event.threat) || 0) + 1);
      }
    });

    // トップ脅威の抽出
    const topThreats = Array.from(threatCounts.entries())
      .map(([threat, count]) => ({ threat, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      openRedirectAttempts: recentEvents.filter(e =>
        e.type === 'OPEN_REDIRECT' && e.timestamp.getTime() > oneMinuteAgo
      ).length,
      xssAttempts: recentEvents.filter(e => e.type === 'XSS_URL').length,
      pathTraversalAttempts: recentEvents.filter(e => e.type === 'PATH_TRAVERSAL').length,
      stateTamperingAttempts: recentEvents.filter(e => e.type === 'STATE_TAMPERING').length,
      totalViolations: recentEvents.length,
      uniqueIps: new Set(recentEvents.map(e => e.ipAddress).filter(Boolean)).size,
      topThreats,
      timeWindow: {
        start: new Date(oneHourAgo),
        end: new Date(now)
      }
    };
  }

  /**
   * 疑わしいパターンの検出
   */
  async detectSuspiciousPatterns(): Promise<SuspiciousPattern[]> {
    const patterns: SuspiciousPattern[] = [];
    const now = Date.now();
    const oneHourAgo = now - this.WINDOW_SIZE_MS;

    // IPベースの分析
    this.ipEvents.forEach((events, ip) => {
      const recentEvents = events.filter(e => e.timestamp.getTime() > oneHourAgo);

      if (recentEvents.length > RedirectSecurityMonitor.ALERT_THRESHOLDS.FAILED_VALIDATIONS_PER_IP_PER_HOUR) {
        patterns.push({
          type: 'SUSPICIOUS_IP_ACTIVITY',
          ipAddress: ip,
          violationCount: recentEvents.length,
          timeWindow: '1 hour',
          severity: 'HIGH',
          details: {
            eventTypes: [...new Set(recentEvents.map(e => e.type))],
            threats: [...new Set(recentEvents.map(e => e.threat).filter(Boolean))]
          }
        });
      }

      // 同一IPから複数ドメインへの攻撃
      const targetDomains = new Set(
        recentEvents
          .map(e => this.extractDomainFromUrl(e.originalUrl))
          .filter(Boolean)
      );

      if (targetDomains.size > RedirectSecurityMonitor.ALERT_THRESHOLDS.SUSPICIOUS_DOMAINS_PER_IP_PER_HOUR) {
        patterns.push({
          type: 'MULTI_DOMAIN_ATTACK',
          ipAddress: ip,
          attemptCount: targetDomains.size,
          severity: 'MEDIUM',
          details: {
            domains: Array.from(targetDomains)
          }
        });
      }
    });

    // ドメインベースの分析
    this.domainAttempts.forEach((count, domain) => {
      if (count > 10) { // 同一ドメインへの10回以上の攻撃
        patterns.push({
          type: 'TARGETED_DOMAIN_ATTACK',
          targetDomain: domain,
          attemptCount: count,
          severity: count > 50 ? 'HIGH' : 'MEDIUM'
        });
      }
    });

    // 攻撃パターンの組み合わせ検出
    const recentEvents = this.events.filter(e => e.timestamp.getTime() > oneHourAgo);
    const combinedAttacks = recentEvents.filter(e =>
      e.type === 'OPEN_REDIRECT' && e.threat === 'XSS_RISK'
    );

    if (combinedAttacks.length > 5) {
      patterns.push({
        type: 'COMBINED_ATTACK_PATTERN',
        severity: 'HIGH',
        violationCount: combinedAttacks.length,
        details: {
          description: 'Open Redirect combined with XSS attempts'
        }
      });
    }

    return patterns;
  }

  /**
   * 特定IPの最近のイベント取得
   */
  private getRecentEventsForIp(ip: string, since: number): RedirectSecurityEvent[] {
    const events = this.ipEvents.get(ip) || [];
    return events.filter(e => e.timestamp.getTime() > since);
  }

  /**
   * URLからドメインを抽出
   */
  private extractDomainFromUrl(url: string): string | null {
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return new URL(url).hostname;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * アラート送信
   */
  private async sendAlert(alert: SecurityAlert): Promise<void> {
    // レート制限（同じアラートを5分以内に再送しない）
    const alertKey = `${alert.type}:${alert.level}`;
    const lastSent = this.alertHistory.get(alertKey) || 0;
    const now = Date.now();

    if (now - lastSent < 300000) { // 5分
      return;
    }

    this.alertHistory.set(alertKey, now);

    console.error('🚨 REDIRECT SECURITY ALERT:', {
      timestamp: new Date().toISOString(),
      ...alert
    });

    // 本番環境では外部サービスに通知
    if (process.env.NODE_ENV === 'production') {
      try {
        // Webhook通知
        if (process.env.SECURITY_WEBHOOK_URL) {
          await fetch(process.env.SECURITY_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              timestamp: new Date().toISOString(),
              source: 'redirect-monitor',
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
          source: 'redirect_monitor',
          level: alert.level,
          type: alert.type,
          message: alert.message,
          details: alert.details
        });
      } catch (error) {
        console.error('Failed to send redirect security alert:', error);
      }
    }
  }

  /**
   * セキュリティメトリクスの取得
   */
  getSecurityMetrics(): {
    events: number;
    threats: Map<string, number>;
    topIps: Array<{ ip: string; count: number }>;
    trends: SecurityTrends | null;
  } {
    const threatCounts = new Map<string, number>();
    const ipCounts = new Map<string, number>();

    this.events.forEach(event => {
      if (event.threat) {
        threatCounts.set(event.threat, (threatCounts.get(event.threat) || 0) + 1);
      }
      if (event.ipAddress) {
        ipCounts.set(event.ipAddress, (ipCounts.get(event.ipAddress) || 0) + 1);
      }
    });

    const topIps = Array.from(ipCounts.entries())
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      events: this.events.length,
      threats: threatCounts,
      topIps,
      trends: null // 必要に応じてトレンドを計算
    };
  }

  /**
   * クリーンアップジョブ
   */
  private startCleanupJob(): void {
    setInterval(() => {
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

      // アラート履歴のクリーンアップ
      this.alertHistory.forEach((timestamp, key) => {
        if (timestamp < cutoff) {
          this.alertHistory.delete(key);
        }
      });
    }, 600000); // 10分ごと
  }

  /**
   * 定期分析ジョブ
   */
  private startAnalysisJob(): void {
    setInterval(async () => {
      try {
        // トレンド分析
        const trends = await this.analyzeRedirectTrends();

        // 疑わしいパターン検出
        const patterns = await this.detectSuspiciousPatterns();

        // 高リスクパターンがある場合はアラート
        const highRiskPatterns = patterns.filter(p => p.severity === 'HIGH' || p.severity === 'CRITICAL');
        if (highRiskPatterns.length > 0) {
          await this.sendAlert({
            level: 'HIGH',
            type: 'SUSPICIOUS_PATTERNS_DETECTED',
            message: `${highRiskPatterns.length} high-risk patterns detected`,
            details: {
              patterns: highRiskPatterns,
              trends
            }
          });
        }

        // メトリクスログ
        console.log('Redirect Security Metrics:', {
          timestamp: new Date().toISOString(),
          trends,
          suspiciousPatterns: patterns.length,
          activeIps: this.ipEvents.size
        });

      } catch (error) {
        console.error('Analysis job error:', error);
      }
    }, 300000); // 5分ごと
  }
}

// 型定義
interface SecurityAlert {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type: string;
  message: string;
  details: any;
}

// シングルトンインスタンスのエクスポート
export const redirectMonitor = RedirectSecurityMonitor.getInstance();