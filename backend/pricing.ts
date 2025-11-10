export interface PricingConfig {
  ARTICLE_COST: number;
  BUDGET_DEPOSIT_MINIMUM: number;
  BUDGET_DEPOSIT_MAXIMUM: number;

  RATE_LIMITS: {
    GENERAL: { max: number; windowMs: number };
    PAYMENT: { max: number; windowMs: number };
    BUDGET: { max: number; windowMs: number };
    ARTICLE: { max: number; windowMs: number };
  };

  CACHE_TTL: number;
  BUDGET_TTL: number;

  PAYMENT_DESCRIPTION: string;
  CURRENCY_SYMBOL: string;
  CURRENCY_NAME: string;
}

export function getPricingConfig(): PricingConfig {
  return {
    ARTICLE_COST: parseFloat(process.env.DEFAULT_ARTICLE_COST || '0.10'),
    BUDGET_DEPOSIT_MINIMUM: parseFloat(process.env.BUDGET_DEPOSIT_MINIMUM || '0.50'),
    BUDGET_DEPOSIT_MAXIMUM: parseFloat(process.env.BUDGET_DEPOSIT_MAXIMUM || '1000.00'),

    RATE_LIMITS: {
      GENERAL: {
        max: parseInt(process.env.RATE_LIMIT_GENERAL_MAX || '200'),
        windowMs: parseInt(process.env.RATE_LIMIT_GENERAL_WINDOW || '900000') // 15 minutes
      },
      PAYMENT: {
        max: parseInt(process.env.RATE_LIMIT_PAYMENT_MAX || '10'),
        windowMs: parseInt(process.env.RATE_LIMIT_PAYMENT_WINDOW || '900000') // 15 minutes
      },
      BUDGET: {
        max: parseInt(process.env.RATE_LIMIT_BUDGET_MAX || '30'),
        windowMs: parseInt(process.env.RATE_LIMIT_BUDGET_WINDOW || '900000') // 15 minutes
      },
      ARTICLE: {
        max: parseInt(process.env.RATE_LIMIT_ARTICLE_MAX || '50'),
        windowMs: parseInt(process.env.RATE_LIMIT_ARTICLE_WINDOW || '900000') // 15 minutes
      }
    },

    // Cache settings
    CACHE_TTL: parseInt(process.env.CACHE_TTL || '300000'), // 5 minutes
    BUDGET_TTL: parseInt(process.env.BUDGET_TTL || '300000'), // 5 minutes

    // Payment processing
    PAYMENT_DESCRIPTION: process.env.PAYMENT_DESCRIPTION || 'CMS Article Access',
    CURRENCY_SYMBOL: process.env.CURRENCY_SYMBOL || '$',
    CURRENCY_NAME: process.env.CURRENCY_NAME || 'USDC'
  };
}

export const pricing = getPricingConfig();
export function formatPrice(amount: number): string {
  return `${pricing.CURRENCY_SYMBOL}${amount.toFixed(2)}`;
}

export function formatPriceWithCurrency(amount: number): string {
  return `${amount.toFixed(2)} ${pricing.CURRENCY_NAME}`;
}

export function validateDepositAmount(amount: number): { isValid: boolean; error?: string } {
  if (amount < pricing.BUDGET_DEPOSIT_MINIMUM) {
    return {
      isValid: false,
      error: `Minimum deposit amount is ${formatPrice(pricing.BUDGET_DEPOSIT_MINIMUM)}`
    };
  }

  if (amount > pricing.BUDGET_DEPOSIT_MAXIMUM) {
    return {
      isValid: false,
      error: `Maximum deposit amount is ${formatPrice(pricing.BUDGET_DEPOSIT_MAXIMUM)}`
    };
  }

  return { isValid: true };
}

export function calculateBulkArticleCost(articleCount: number): number {
  return pricing.ARTICLE_COST * articleCount;
}

export function getPricingInfo() {
  return {
    articleCost: pricing.ARTICLE_COST,
    currency: {
      symbol: pricing.CURRENCY_SYMBOL,
      name: pricing.CURRENCY_NAME
    },
    deposit: {
      minimum: pricing.BUDGET_DEPOSIT_MINIMUM,
      maximum: pricing.BUDGET_DEPOSIT_MAXIMUM
    },
    formatted: {
      articleCost: formatPrice(pricing.ARTICLE_COST),
      minimumDeposit: formatPrice(pricing.BUDGET_DEPOSIT_MINIMUM),
      maximumDeposit: formatPrice(pricing.BUDGET_DEPOSIT_MAXIMUM)
    }
  };
}