# Modules Documentation

## Overview

The CMS x402 Backend is organized into several key modules, each with specific responsibilities and well-defined interfaces. This document provides detailed information about each module, including their APIs, dependencies, and usage examples.

## Module Structure

```
backend/
├── app.ts                    # Application module
├── article-service.ts        # Content management module
├── config.ts                 # Configuration module
├── error-handler.ts          # Error handling module
├── logger.ts                 # Logging module
├── paywall.ts                # Payment processing module
├── pricing.ts                # Pricing configuration module
├── rate-limiter.ts           # Rate limiting module
├── storage.ts                # Storage abstraction module
├── types.ts                  # Type definitions module
└── validation.ts             # Input validation module
```

## Core Modules

### 1. Application Module (`app.ts`)

**Purpose**: Main Express application setup and route configuration

**Key Responsibilities**:
- Express application initialization
- Middleware configuration
- Route definition and handler attachment
- Error handling integration
- Server startup and health monitoring

**Main Exports**:
```typescript
export default app; // Express application instance
```

**Configuration**:
```typescript
interface Config {
  splToken: string;           // SPL token mint address
  recipientWallet: string;    // Payment recipient wallet
  articlesPath: string;       // Articles directory path
}
```

**Usage Example**:
```typescript
import app from './app';

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Dependencies**:
- `cors` - Cross-origin resource sharing
- `express` - Web framework
- `dotenv` - Environment variable loading
- `article-service` - Content management
- `paywall` - Payment processing
- `rate-limiter` - API rate limiting
- `logger` - Structured logging

### 2. Article Service Module (`article-service.ts`)

**Purpose**: Markdown-based content management with caching and security

**Key Classes**:
```typescript
class ArticleService {
  constructor(articlesPath?: string)
  async scanArticles(): Promise<Article[]>
  async getArticle(articleId: string): Promise<Article | null>
  async getArticlesList(): Promise<ArticleListItem[]>
  async getArticlePreview(articleId: string): Promise<ArticleListItem | null>
  private createExcerpt(content: string, maxLength?: number): string
  private createPreview(content: string, maxParagraphs?: number): string
  private markdownToHtml(content: string): string
}
```

**Core Interfaces**:
```typescript
interface Article {
  id: string;
  slug: string;
  title: string;
  author: string;
  date: string;
  excerpt: string;
  tags: string[];
  wordCount: number;
  readTime: number;
  filePath: string;
  isPremium: boolean;
  previewContent: string;
  fullContent?: string;
  htmlContent?: string;
  price?: number;
  currencySymbol?: string;
  currencyName?: string;
}

interface ArticleListItem {
  id: string;
  slug: string;
  title: string;
  author: string;
  date: string;
  excerpt: string;
  tags: string[];
  wordCount: number;
  readTime: number;
  isPremium: boolean;
  previewContent?: string;
  price?: number;
  currencySymbol?: string;
  currencyName?: string;
}
```

**Features**:
- **Caching**: In-memory caching with configurable TTL
- **Security**: Path traversal prevention and content sanitization
- **Performance**: Parallel file processing and lazy loading
- **Validation**: File and content validation

**Usage Example**:
```typescript
import ArticleService from './article-service';

const articleService = new ArticleService('./articles');

// Get all articles
const articles = await articleService.getArticlesList();

// Get specific article
const article = await articleService.getArticle('my-article');

// Get article preview
const preview = await articleService.getArticlePreview('my-article');
```

**Dependencies**:
- `marked` - Markdown processing
- `gray-matter` - Front-matter extraction
- `config` - Application configuration
- `logger` - Article-specific logging
- `validation` - Input validation
- `pricing` - Pricing information
- `fs/promises` - File system operations

### 3. Payment Processing Module (`paywall.ts`)

**Purpose**: x402 protocol implementation with budget management

**Main Exports**:
```typescript
export const rpc; // Solana RPC instance
export async function initializeStorage(): Promise<void>
export async function verifyTransaction(
  signature: string,
  reference: string,
  requiredAmount: number,
  splTokenMint: string,
  recipientWallet: string
): Promise<VerificationResult>
export const budgetPaywall: (options: BudgetPaywallOptions) => MiddlewareFunction
export const x402Paywall: (options: X402PaywallOptions) => MiddlewareFunction
export const requirePayment: MiddlewareFunction
```

**Key Interfaces**:
```typescript
interface VerificationResult {
  success: boolean;
  error?: string;
  amountReceived?: number;
  amountReceivedSmallestUnit?: bigint;
}

interface Invoice {
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

interface BudgetPaywallOptions {
  amount: number;
  splToken: string;
}

interface X402PaywallOptions extends BudgetPaywallOptions {
  recipientWallet: string;
}
```

**Middleware Chain**:
```typescript
// Usage in app.ts
app.get("/api/articles/:id",
  articleRateLimit,                          // 1. Rate limit first
  budgetPaywall({ amount, splToken }),       // 2. Check budget first
  x402Paywall({ amount, splToken, recipientWallet }), // 3. Fallback to 402
  requirePayment,                            // 4. Ensure payment was made
  asyncHandler(async (req, res) => {         // 5. Final handler
    // Access granted, serve content
  })
);
```

**Dependencies**:
- `@solana/kit` - Solana utilities
- `@solana-program/token` - Token program interactions
- `crypto` - UUID generation
- `logger` - Payment-specific logging
- `storage` - Budget and reference storage
- `validation` - Input validation
- `config` - Configuration management

### 4. Storage Module (`storage.ts`)

**Purpose**: Data persistence abstraction with multiple provider support

**Key Classes**:
```typescript
class Storage {
  async initialize(): Promise<void>
  async getBudget(pubkey: string): Promise<string>
  async setBudget(pubkey: string, amount: string): Promise<void>
  async addReference(refKey: string, options: ReferenceOptions): Promise<void>
  async hasReference(refKey: string): Promise<boolean>
  async delReference(refKey: string): Promise<void>
  private getProvider(): StorageProvider
}
```

**Provider Interface**:
```typescript
interface StorageProvider {
  get(key: string): Promise<any>
  set(key: string, value: any, options?: any): Promise<void>
  has(key: string): Promise<boolean>
  del(key: string): Promise<void>
  disconnect?(): Promise<void>
}
```

**Storage Providers**:
1. **VercelKVProvider**: Production Redis-compatible storage
2. **MemoryProvider**: Development fallback with SQLite persistence

**Usage Example**:
```typescript
import { storage } from './storage';

// Initialize storage
await storage.initialize();

// Budget operations
const budget = await storage.getBudget('wallet-address');
await storage.setBudget('wallet-address', '1000000'); // In smallest units

// Reference tracking
const hasReference = await storage.hasReference('ref_uuid');
await storage.addReference('ref_uuid', { ex: 300 }); // 5 minutes
```

**Dependencies**:
- `@vercel/kv` - Vercel KV storage (optional)
- `sqlite3` - Local SQLite database
- `config` - Configuration management
- `logger` - Storage operation logging

### 5. Validation Module (`validation.ts`)

**Purpose**: Comprehensive input validation and sanitization

**Main Functions**:
```typescript
// Address validation
export function validateSolanaAddress(address: string): boolean

// Transaction validation
export function validateTransactionSignature(signature: string): boolean
export function validateReference(reference: string): boolean

// File validation
export function validateFilePath(fileName: string, basePath: string): boolean
export function sanitizeFileName(fileName: string): string

// Content validation
export function validateMarkdownContent(content: string): ValidationResult
export function validateArticleId(articleId: string): boolean

// Configuration validation
export function validateCorsOrigins(origins: string): string[]
export function validateDepositAmount(amount: number): ValidationResult
```

**Validation Result Interface**:
```typescript
interface ValidationResult {
  isValid: boolean;
  sanitized?: string;
  error?: string;
}
```

**Usage Example**:
```typescript
import {
  validateSolanaAddress,
  validateTransactionSignature,
  validateMarkdownContent
} from './validation';

// Validate wallet address
if (!validateSolanaAddress(walletAddress)) {
  throw new Error('Invalid wallet address');
}

// Validate transaction signature
if (!validateTransactionSignature(signature)) {
  throw new Error('Invalid transaction signature');
}

// Validate markdown content
const validation = validateMarkdownContent(markdownContent);
if (!validation.isValid) {
  throw new Error(`Invalid content: ${validation.error}`);
}
const sanitizedContent = validation.sanitized;
```

**Dependencies**:
- No external dependencies
- Uses Node.js built-in crypto and path modules

### 6. Configuration Module (`config.ts`)

**Purpose**: Centralized configuration management with validation

**Main Functions**:
```typescript
export function getConfig(): AppConfig
export function getSolanaRpcUrl(): string
export function isDevelopment(): boolean
export function isProduction(): boolean
export function isTest(): boolean
```

**Configuration Interface**:
```typescript
interface AppConfig {
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
```

**Environment Variables**:
```typescript
// Environment variable mappings
const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  solanaNetwork: process.env.SOLANA_NETWORK || 'devnet',
  articlesPath: process.env.ARTICLES_PATH || './articles',
  corsOrigins: validateCorsOrigins(process.env.CORS_ORIGINS || 'http://localhost:3000'),
  logLevel: process.env.LOG_LEVEL || (nodeEnv === 'production' ? 'info' : 'debug'),
  cacheTtl: process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL, 10) : 300000,
  memoProgramId: process.env.MEMO_PROGRAM_ID || "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
  paymentDescription: process.env.PAYMENT_DESCRIPTION || "My X402 Articles"
};
```

**Dependencies**:
- `validation` - CORS origins validation

### 7. Logger Module (`logger.ts`)

**Purpose**: Structured logging with multiple categories and levels

**Main Exports**:
```typescript
export const logger: pino.Logger;           // General logger
export const paymentLogger: pino.Logger;     // Payment operations
export const budgetLogger: pino.Logger;      // Budget operations
export const articleLogger: pino.Logger;     // Article processing
export const serverLogger: pino.Logger;      // Server operations
```

**Configuration**:
```typescript
// Logger configuration with environment-based settings
const loggerConfig = {
  level: config.logLevel,
  transport: isDevelopment() ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname'
    }
  } : undefined
};
```

**Usage Example**:
```typescript
import { logger, paymentLogger, budgetLogger } from './logger';

// General logging
logger.info({ component: 'server', port: 3001 }, 'Server started');

// Payment logging
paymentLogger.info({
  signature, reference, amount, recipient
}, 'Payment verification successful');

// Budget logging
budgetLogger.debug({
  payer: pubkey, requiredAmount, availableBudget
}, 'Budget check - insufficient funds');
```

**Dependencies**:
- `pino` - High-performance JSON logger
- `pino-pretty` - Development pretty printing
- `config` - Configuration management

### 8. Error Handler Module (`error-handler.ts`)

**Purpose**: Centralized error handling and response formatting

**Main Exports**:
```typescript
export const errorHandler: ErrorRequestHandler
export function asyncHandler(fn: Function): Function
```

**Error Classes**:
```typescript
// Custom error types from types.ts
export class PaymentVerificationError extends Error
export class BudgetOperationError extends Error
export class ArticleServiceError extends Error
export class ValidationError extends Error
```

**Usage Example**:
```typescript
import { errorHandler, asyncHandler } from './error-handler';

// In route handlers
app.get('/api/articles/:id', asyncHandler(async (req, res) => {
  // This will automatically catch errors and send appropriate responses
  const article = await articleService.getArticle(req.params.id);
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }
  res.json(article);
}));

// Error handling middleware
app.use(errorHandler);
```

**Dependencies**:
- `logger` - Error logging
- `types` - Error type definitions

### 9. Rate Limiter Module (`rate-limiter.ts`)

**Purpose**: API rate limiting with different strategies per endpoint type

**Main Exports**:
```typescript
export const generalRateLimit: RateLimitRequestHandler
export const paymentRateLimit: RateLimitRequestHandler
export const budgetRateLimit: RateLimitRequestHandler
export const articleRateLimit: RateLimitRequestHandler
```

**Rate Limit Configuration**:
```typescript
// Different limits for different endpoint types
const limits = {
  general: { max: 200, windowMs: 15 * 60 * 1000 },     // 200 requests per 15 minutes
  payment: { max: 10, windowMs: 15 * 60 * 1000 },      // 10 requests per 15 minutes
  budget: { max: 30, windowMs: 15 * 60 * 1000 },       // 30 requests per 15 minutes
  article: { max: 50, windowMs: 15 * 60 * 1000 }       // 50 requests per 15 minutes
};
```

**Usage Example**:
```typescript
import {
  generalRateLimit,
  paymentRateLimit,
  budgetRateLimit,
  articleRateLimit
} from './rate-limiter';

// Apply to routes
app.use(generalRateLimit);
app.post('/api/budget/deposit/confirm', paymentRateLimit, handler);
app.get('/api/budget/:pubkey', budgetRateLimit, handler);
app.get('/api/articles', articleRateLimit, handler);
```

**Dependencies**:
- `express-rate-limit` - Rate limiting middleware
- `config` - Configuration management

### 10. Pricing Module (`pricing.ts`)

**Purpose**: Centralized pricing configuration and validation

**Main Exports**:
```typescript
export const pricing: PricingConfig
export function validateDepositAmount(amount: number): ValidationResult
export function getPricingInfo(): PricingInfo
```

**Pricing Configuration**:
```typescript
interface PricingConfig {
  ARTICLE_COST: number;             // 0.10 USDC per article
  CURRENCY_SYMBOL: string;          // '$'
  CURRENCY_NAME: string;            // 'USDC'
  BUDGET_DEPOSIT_MINIMUM: number;   // 0.50 USDC minimum
  BUDGET_DEPOSIT_MAXIMUM: number;   // 1000.00 USDC maximum
}
```

**Usage Example**:
```typescript
import { pricing, validateDepositAmount, getPricingInfo } from './pricing';

// Get pricing info
const pricingInfo = getPricingInfo();
console.log(`Article cost: ${pricingInfo.articleCost} ${pricingInfo.currencyName}`);

// Validate deposit amount
const validation = validateDepositAmount(amount);
if (!validation.isValid) {
  throw new Error(validation.error);
}

// Use pricing constants
const articleCost = pricing.ARTICLE_COST;
```

**Dependencies**:
- `types` - Validation result interface

### 11. Types Module (`types.ts`)

**Purpose**: Centralized TypeScript type definitions and error classes

**Key Type Categories**:

**Solana Types**:
```typescript
interface SolanaTransactionResponse
interface ParsedInstruction
interface MemoInstruction
```

**Payment Types**:
```typescript
interface VerificationResult
interface Invoice
interface BudgetPaywallOptions
interface X402PaywallOptions
```

**Error Types**:
```typescript
interface TransactionVerificationContext
interface BudgetOperationContext
interface PaymentValidationContext

export class PaymentVerificationError extends Error
export class BudgetOperationError extends Error
export class ArticleServiceError extends Error
export class ValidationError extends Error
```

**Configuration Types**:
```typescript
interface EnvironmentConfig
interface AppConfig
interface ServerStartupConfig
```

## Module Dependencies

### Dependency Graph

```
app.ts
├── article-service.ts
│   ├── config.ts
│   ├── logger.ts
│   ├── validation.ts
│   ├── pricing.ts
│   └── types.ts
├── paywall.ts
│   ├── logger.ts
│   ├── types.ts
│   ├── storage.ts
│   ├── validation.ts
│   ├── config.ts
│   └── pricing.ts
├── rate-limiter.ts
│   └── config.ts
├── storage.ts
│   ├── config.ts
│   └── logger.ts
├── error-handler.ts
│   ├── logger.ts
│   └── types.ts
├── config.ts
│   └── validation.ts
├── logger.ts
│   └── config.ts
├── validation.ts
└── types.ts
```

## Module Communication Patterns

### 1. Service Layer Pattern

Modules communicate through well-defined interfaces:

```typescript
// Article service uses storage
class ArticleService {
  async getArticle(id: string): Promise<Article | null> {
    // Uses validation module
    if (!validateArticleId(id)) return null;

    // Uses logger module
    articleLogger.debug({ articleId: id }, 'Fetching article');

    // Uses file system (no storage dependency)
    const content = await fs.readFile(filePath);

    return parseArticle(content);
  }
}
```

### 2. Middleware Chain Pattern

Payment processing uses middleware composition:

```typescript
// Multiple modules work together in middleware chain
app.get('/api/articles/:id',
  rateLimiter.articleRateLimit,    // Rate limiting
  paywall.budgetPaywall,           // Budget check
  paywall.x402Paywall,             // Payment verification
  paywall.requirePayment,          // Access verification
  asyncHandler(handler)            // Route handler
);
```

### 3. Event-Based Logging

Modules emit structured logs for cross-module communication:

```typescript
// Payment module logs budget operations
budgetLogger.info({
  payer, depositAmount, totalBudget
}, "Budget deposit successful");

// Storage module can be monitored through logs
```

## Module Testing Strategies

### 1. Unit Testing

Each module can be tested independently:

```typescript
// Example: Testing validation module
import { validateSolanaAddress } from './validation';

describe('validateSolanaAddress', () => {
  it('should return true for valid addresses', () => {
    expect(validateSolanaAddress('11111111111111111111111111111112')).toBe(true);
  });

  it('should return false for invalid addresses', () => {
    expect(validateSolanaAddress('invalid')).toBe(false);
  });
});
```

### 2. Integration Testing

Test module interactions:

```typescript
// Example: Testing article service with file system
describe('ArticleService Integration', () => {
  let service: ArticleService;
  let testArticlesDir: string;

  beforeEach(() => {
    testArticlesDir = createTestArticlesDirectory();
    service = new ArticleService(testArticlesDir);
  });

  it('should scan and parse articles correctly', async () => {
    const articles = await service.scanArticles();
    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe('Test Article');
  });
});
```

### 3. Mock Testing

Mock external dependencies:

```typescript
// Example: Testing payment module with mocked blockchain
import { verifyTransaction } from './paywall';

jest.mock('@solana/kit');

describe('verifyTransaction', () => {
  it('should verify valid transactions', async () => {
    mockRpc.getTransaction.mockResolvedValue(mockTransaction);

    const result = await verifyTransaction(signature, reference, amount, token, recipient);
    expect(result.success).toBe(true);
  });
});
```

## Module Evolution Guidelines

### 1. Adding New Modules

1. Define clear interfaces in `types.ts`
2. Implement comprehensive logging
3. Add validation for all inputs
4. Include error handling
5. Write unit tests
6. Update module documentation

### 2. Modifying Existing Modules

1. Maintain backward compatibility
2. Update type definitions
3. Add deprecation warnings if needed
4. Update tests
5. Update documentation

### 3. Module Decomposition

When modules become too large:

1. Identify cohesive sub-components
2. Extract to separate modules
3. Define clear interfaces
4. Update dependency injection
5. Refactor tests

This modular architecture ensures maintainability, testability, and extensibility while keeping clear separation of concerns and well-defined interfaces between components.

---

*For specific API details and usage examples, refer to the individual module documentation and inline code comments.*