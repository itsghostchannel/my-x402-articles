import { validateCorsOrigins } from './validation';
export interface AppConfig {
  port: number;
  nodeEnv: string;
  solanaNetwork: string;
  articlesPath: string;
  corsOrigins: string[];
  logLevel: string;
  cacheTtl: number;
  memoProgramId: string;
  paymentDescription: string;
}

export function getConfig(): AppConfig {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  const nodeEnv = process.env.NODE_ENV || 'development';
  const solanaNetwork = process.env.SOLANA_NETWORK || 'devnet';
  const articlesPath = process.env.ARTICLES_PATH || './articles';
  const corsOriginsRaw = process.env.CORS_ORIGINS || 'http://localhost:3000';
  const logLevel = process.env.LOG_LEVEL || (nodeEnv === 'production' ? 'info' : 'debug');
  const cacheTtl = process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL, 10) : 300000; // 5 minutes

  return {
    port,
    nodeEnv,
    solanaNetwork,
    articlesPath,
    corsOrigins: validateCorsOrigins(corsOriginsRaw),
    logLevel,
    cacheTtl,
    memoProgramId: process.env.MEMO_PROGRAM_ID || "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
    paymentDescription: process.env.PAYMENT_DESCRIPTION || "My X402 Articles"
  };
}

export const config = getConfig();

export function getSolanaRpcUrl(): string {
  return `https://api.${config.solanaNetwork}.solana.com`;
}

export function isDevelopment(): boolean {
  return config.nodeEnv === 'development';
}

export function isProduction(): boolean {
  return config.nodeEnv === 'production';
}

export function isTest(): boolean {
  return config.nodeEnv === 'test';
}