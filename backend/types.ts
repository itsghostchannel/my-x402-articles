export interface SolanaTransactionResponse {
  transaction: {
    message: {
      instructions: Array<{
        programId?: string;
        program?: string;
        parsed?: any;
        info?: any;
      }>;
    };
  };
  meta?: {
    err?: any;
    preTokenBalances?: Array<{
      owner: string;
      mint: string;
      uiTokenAmount?: {
        amount: string;
      };
    }>;
    postTokenBalances?: Array<{
      owner: string;
      mint: string;
      uiTokenAmount?: {
        amount: string;
      };
    }>;
  };
}

export interface KVClient {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any, options?: any) => Promise<void>;
}

export interface ParsedInstruction {
  programId?: string;
  program?: string;
  parsed?: string | { info?: { memo?: string } };
}

export interface MemoInstruction {
  programId: string;
  parsed?: string | { info?: { memo?: string } };
}

export interface TransactionVerificationContext {
  signature: string;
  reference: string;
  expectedAmount: number;
  splToken: string;
  recipientWallet: string;
}

export interface BudgetOperationContext {
  payer: string;
  amountDeducted?: string;
  remainingBudget?: string;
  requiredAmount?: string;
  availableBudget?: string;
  error?: string;
  amount?: string;
}

export interface PaymentVerificationLog {
  error: string;
  signature: string;
  reference: string;
  expectedAmount: number;
  splToken: string;
}

export interface ArticleProcessingError {
  error: string;
  file: string;
  stack?: string;
}

export interface ArticleScanningError {
  error: string;
  articlesPath: string;
  stack?: string;
}

export interface ArticleReadingError {
  error: string;
  articleId: string;
  filePath: string;
  stack?: string;
}

export interface APIErrorContext {
  error: string;
  stack?: string;
  url?: string;
  method?: string;
}

export interface BudgetDepositError {
  error: string;
  requestContext: {
    signature?: string;
    reference?: string;
    payer?: string;
    amount?: number;
  };
  stack?: string;
}

export interface ServerStartupConfig {
  port: number;
  environment: string;
  articlesPath: string;
  splToken: string;
  recipientWallet: string | null;
}

export interface TransactionMetadata {
  preBalance: string;
  postBalance: string;
  amountReceived: string;
  amountRequired: string;
}

export interface PaymentValidationContext {
  signature: string;
  reference: string;
  amount: number;
  splToken: string;
  recipient: string;
  generatedReference?: string;
}

// Environment types
export interface EnvironmentConfig {
  NODE_ENV?: string;
  PORT?: string;
  SPL_TOKEN_MINT?: string;
  MY_WALLET_ADDRESS?: string;
  ARTICLES_PATH?: string;
  KV_REST_API_URL?: string;
  KV_REST_API_TOKEN?: string;
  CORS_ORIGINS?: string;
  SOLANA_NETWORK?: string;
}

// Error classes
export class PaymentVerificationError extends Error {
  constructor(
    message: string,
    public readonly context: TransactionVerificationContext
  ) {
    super(message);
    this.name = 'PaymentVerificationError';
  }
}

export class BudgetOperationError extends Error {
  constructor(
    message: string,
    public readonly context: BudgetOperationContext
  ) {
    super(message);
    this.name = 'BudgetOperationError';
  }
}

export class ArticleServiceError extends Error {
  constructor(
    message: string,
    public readonly context: ArticleProcessingError | ArticleScanningError | ArticleReadingError
  ) {
    super(message);
    this.name = 'ArticleServiceError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Paywall and payment types
export interface VerificationResult {
  success: boolean;
  error?: string;
  amountReceived?: number;
  amountReceivedSmallestUnit?: bigint;
}

export interface Invoice {
  protocol: string;
  recipientWallet: string;
  amount: number;
  token: string;
  reference: string;
  metadata: {
    service: string;
    description: string;
  };
}

export interface BudgetPaywallOptions {
  amount: number;
  splToken: string;
}

export interface X402PaywallOptions extends BudgetPaywallOptions {
  recipientWallet: string;
}