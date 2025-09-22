import { createClient } from '@supabase/supabase-js';

interface SecurityEvent {
  type: 'AUTH_FAILURE' | 'RATE_LIMIT' | 'SUSPICIOUS_ACTIVITY' | 'API_KEY_INVALID' | 'SQL_INJECTION_ATTEMPT' | 'XSS_ATTEMPT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

interface AlertThreshold {
  eventType: string;
  maxCount: number;
  timeWindowMs: number;
  severity: string;
}

class SecurityMonitor {
  private static instance: SecurityMonitor;
  private eventStore: Map<string, SecurityEvent[]> = new Map();
  private alertThresholds: AlertThreshold[] = [
    {
      eventType: 'AUTH_FAILURE',
      maxCount: 5,
      timeWindowMs: 300000, // 5分
      severity: 'HIGH',
    },
    {
      eventType: 'RATE_LIMIT',
      maxCount: 10,
      timeWindowMs: 60000, // 1分
      severity: 'MEDIUM',
    },
    {
      eventType: 'SQL_INJECTION_ATTEMPT',
      maxCount: 1,
      timeWindowMs: 3600000, // 1時間
      severity: 'CRITICAL',
    },
    {
      eventType: 'XSS_ATTEMPT',
      maxCount: 3,
      timeWindowMs: 600000, // 10分
      severity: 'HIGH',
    },
  ];

  private constructor() {
    // 定期的に古いイベントをクリーンアップ
    setInterval(() => this.cleanupOldEvents(), 300000); // 5分ごと
  }

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  async logEvent(event: SecurityEvent, supabase?: any): Promise<void> {
    // イベントをメモリストアに追加
    const key = `${event.type}-${event.ipAddress || 'unknown'}`;
    const events = this.eventStore.get(key) || [];
    events.push(event);
    this.eventStore.set(key, events);

    // しきい値チェック
    this.checkThresholds(event);

    // データベースに記録
    if (supabase) {
      try {
        await supabase
          .from('security_events')
          .insert({
            event_type: event.type,
            severity: event.severity,
            details: event.details,
            ip_address: event.ipAddress,
            user_agent: event.userAgent,
            timestamp: event.timestamp.toISOString(),
          });
      } catch (error) {
        console.error('Failed to log security event to database:', error);
      }
    }

    // 重大なイベントの場合は即座にアラート
    if (event.severity === 'CRITICAL') {
      await this.sendAlert(event);
    }
  }

  private checkThresholds(event: SecurityEvent): void {
    const threshold = this.alertThresholds.find(t => t.eventType === event.type);
    if (!threshold) return;

    const key = `${event.type}-${event.ipAddress || 'unknown'}`;
    const events = this.eventStore.get(key) || [];
    const now = Date.now();

    // 時間枠内のイベントをフィルタリング
    const recentEvents = events.filter(e =>
      now - e.timestamp.getTime() < threshold.timeWindowMs
    );

    // しきい値を超えた場合
    if (recentEvents.length >= threshold.maxCount) {
      this.sendAlert({
        ...event,
        severity: threshold.severity as SecurityEvent['severity'],
        details: {
          ...event.details,
          threshold_exceeded: true,
          event_count: recentEvents.length,
          time_window_minutes: threshold.timeWindowMs / 60000,
        },
      });
    }
  }

  private async sendAlert(event: SecurityEvent): Promise<void> {
    // アラート送信のロジック
    console.warn('SECURITY ALERT:', {
      type: event.type,
      severity: event.severity,
      timestamp: event.timestamp,
      details: event.details,
    });

    // メール通知やSlack通知などを実装可能
    if (process.env.ALERT_WEBHOOK_URL) {
      try {
        await fetch(process.env.ALERT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `Security Alert: ${event.type}`,
            severity: event.severity,
            details: event.details,
          }),
        });
      } catch (error) {
        console.error('Failed to send alert:', error);
      }
    }
  }

  private cleanupOldEvents(): void {
    const now = Date.now();
    const maxAge = 86400000; // 24時間

    for (const [key, events] of this.eventStore.entries()) {
      const recentEvents = events.filter(e =>
        now - e.timestamp.getTime() < maxAge
      );

      if (recentEvents.length === 0) {
        this.eventStore.delete(key);
      } else {
        this.eventStore.set(key, recentEvents);
      }
    }
  }

  // 統計情報の取得
  getStatistics(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    criticalEvents: number;
    recentAlerts: SecurityEvent[];
  } {
    const stats = {
      totalEvents: 0,
      eventsByType: {} as Record<string, number>,
      criticalEvents: 0,
      recentAlerts: [] as SecurityEvent[],
    };

    const oneHourAgo = Date.now() - 3600000;

    for (const events of this.eventStore.values()) {
      for (const event of events) {
        stats.totalEvents++;

        if (!stats.eventsByType[event.type]) {
          stats.eventsByType[event.type] = 0;
        }
        stats.eventsByType[event.type]++;

        if (event.severity === 'CRITICAL') {
          stats.criticalEvents++;
        }

        if (event.timestamp.getTime() > oneHourAgo) {
          stats.recentAlerts.push(event);
        }
      }
    }

    return stats;
  }

  // IPアドレスのブロックリスト管理
  private blockedIPs: Set<string> = new Set();

  blockIP(ipAddress: string): void {
    this.blockedIPs.add(ipAddress);
  }

  unblockIP(ipAddress: string): void {
    this.blockedIPs.delete(ipAddress);
  }

  isIPBlocked(ipAddress: string): boolean {
    return this.blockedIPs.has(ipAddress);
  }

  // 自動ブロック機能
  async autoBlockSuspiciousIP(ipAddress: string, reason: string): Promise<void> {
    const key = `SUSPICIOUS-${ipAddress}`;
    const events = this.eventStore.get(key) || [];

    // 過去1時間に5回以上の不審な活動があった場合自動ブロック
    const oneHourAgo = Date.now() - 3600000;
    const recentSuspiciousEvents = events.filter(e =>
      e.timestamp.getTime() > oneHourAgo &&
      (e.severity === 'HIGH' || e.severity === 'CRITICAL')
    );

    if (recentSuspiciousEvents.length >= 5) {
      this.blockIP(ipAddress);
      await this.logEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        details: {
          action: 'AUTO_BLOCKED',
          reason,
          event_count: recentSuspiciousEvents.length,
        },
        ipAddress,
        timestamp: new Date(),
      });
    }
  }
}

export default SecurityMonitor.getInstance();
export { SecurityMonitor, SecurityEvent, AlertThreshold };