/**
 * Commercial Pricing Plans Configuration
 * XBRL Financial Data API - 2,980円/月プラン
 */

export interface PricingPlan {
  id: string;
  name: string;
  displayName: string;
  price: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  features: {
    apiCalls: {
      perMinute: number;
      perHour: number;
      perDay: number;
      perMonth: number;
    };
    dataAccess: {
      companies: number | 'unlimited';
      documentsPerCompany: number | 'unlimited';
      historicalYears: number;
      realTimeUpdates: boolean;
    };
    support: {
      type: 'community' | 'email' | 'priority' | 'dedicated';
      responseTime: string;
      sla: boolean;
    };
    advanced: {
      bulkExport: boolean;
      apiAnalytics: boolean;
      webhooks: boolean;
      customIntegration: boolean;
      whiteLabeling: boolean;
    };
  };
  limits: {
    maxApiKeys: number;
    maxTeamMembers: number;
    dataRetention: number; // days
    concurrentRequests: number;
  };
}

export const PRICING_PLANS: Record<string, PricingPlan> = {
  free: {
    id: 'free',
    name: 'free',
    displayName: 'Free Trial',
    price: {
      monthly: 0,
      yearly: 0,
      currency: 'JPY',
    },
    features: {
      apiCalls: {
        perMinute: 10,
        perHour: 100,
        perDay: 500,
        perMonth: 10000,
      },
      dataAccess: {
        companies: 10,
        documentsPerCompany: 5,
        historicalYears: 1,
        realTimeUpdates: false,
      },
      support: {
        type: 'community',
        responseTime: 'Best effort',
        sla: false,
      },
      advanced: {
        bulkExport: false,
        apiAnalytics: false,
        webhooks: false,
        customIntegration: false,
        whiteLabeling: false,
      },
    },
    limits: {
      maxApiKeys: 1,
      maxTeamMembers: 1,
      dataRetention: 7,
      concurrentRequests: 2,
    },
  },

  standard: {
    id: 'standard',
    name: 'standard',
    displayName: 'Standard',
    price: {
      monthly: 2980,
      yearly: 29800, // 2ヶ月分お得
      currency: 'JPY',
    },
    features: {
      apiCalls: {
        perMinute: 60,
        perHour: 1000,
        perDay: 10000,
        perMonth: 100000,
      },
      dataAccess: {
        companies: 1000,
        documentsPerCompany: 'unlimited',
        historicalYears: 5,
        realTimeUpdates: true,
      },
      support: {
        type: 'email',
        responseTime: '24 hours',
        sla: false,
      },
      advanced: {
        bulkExport: true,
        apiAnalytics: true,
        webhooks: false,
        customIntegration: false,
        whiteLabeling: false,
      },
    },
    limits: {
      maxApiKeys: 5,
      maxTeamMembers: 3,
      dataRetention: 90,
      concurrentRequests: 10,
    },
  },

  pro: {
    id: 'pro',
    name: 'pro',
    displayName: 'Professional',
    price: {
      monthly: 9800,
      yearly: 98000, // 2ヶ月分お得
      currency: 'JPY',
    },
    features: {
      apiCalls: {
        perMinute: 300,
        perHour: 5000,
        perDay: 50000,
        perMonth: 500000,
      },
      dataAccess: {
        companies: 'unlimited',
        documentsPerCompany: 'unlimited',
        historicalYears: 10,
        realTimeUpdates: true,
      },
      support: {
        type: 'priority',
        responseTime: '4 hours',
        sla: true,
      },
      advanced: {
        bulkExport: true,
        apiAnalytics: true,
        webhooks: true,
        customIntegration: true,
        whiteLabeling: false,
      },
    },
    limits: {
      maxApiKeys: 20,
      maxTeamMembers: 10,
      dataRetention: 365,
      concurrentRequests: 50,
    },
  },

  enterprise: {
    id: 'enterprise',
    name: 'enterprise',
    displayName: 'Enterprise',
    price: {
      monthly: 50000,
      yearly: 500000, // 2ヶ月分お得
      currency: 'JPY',
    },
    features: {
      apiCalls: {
        perMinute: 1000,
        perHour: 20000,
        perDay: 200000,
        perMonth: 2000000,
      },
      dataAccess: {
        companies: 'unlimited',
        documentsPerCompany: 'unlimited',
        historicalYears: 20,
        realTimeUpdates: true,
      },
      support: {
        type: 'dedicated',
        responseTime: '1 hour',
        sla: true,
      },
      advanced: {
        bulkExport: true,
        apiAnalytics: true,
        webhooks: true,
        customIntegration: true,
        whiteLabeling: true,
      },
    },
    limits: {
      maxApiKeys: 100,
      maxTeamMembers: 'unlimited' as any,
      dataRetention: 'unlimited' as any,
      concurrentRequests: 200,
    },
  },
};

/**
 * Get pricing plan by ID
 */
export function getPricingPlan(planId: string): PricingPlan {
  return PRICING_PLANS[planId] || PRICING_PLANS.free;
}

/**
 * Check if feature is available for plan
 */
export function isFeatureAvailable(
  planId: string,
  feature: string
): boolean {
  const plan = getPricingPlan(planId);

  switch (feature) {
    case 'bulkExport':
      return plan.features.advanced.bulkExport;
    case 'webhooks':
      return plan.features.advanced.webhooks;
    case 'apiAnalytics':
      return plan.features.advanced.apiAnalytics;
    case 'customIntegration':
      return plan.features.advanced.customIntegration;
    case 'whiteLabeling':
      return plan.features.advanced.whiteLabeling;
    case 'realTimeUpdates':
      return plan.features.dataAccess.realTimeUpdates;
    default:
      return false;
  }
}

/**
 * Check rate limit for plan
 */
export function getRateLimit(
  planId: string,
  period: 'perMinute' | 'perHour' | 'perDay' | 'perMonth'
): number {
  const plan = getPricingPlan(planId);
  return plan.features.apiCalls[period];
}

/**
 * Format price for display
 */
export function formatPrice(price: number, currency: string = 'JPY'): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(price);
}

/**
 * Calculate discount for yearly billing
 */
export function calculateYearlyDiscount(plan: PricingPlan): {
  amount: number;
  percentage: number;
} {
  const monthlyTotal = plan.price.monthly * 12;
  const yearlyPrice = plan.price.yearly;
  const discount = monthlyTotal - yearlyPrice;
  const percentage = (discount / monthlyTotal) * 100;

  return {
    amount: discount,
    percentage: Math.round(percentage),
  };
}