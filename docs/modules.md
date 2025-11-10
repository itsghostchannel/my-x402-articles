# Module Documentation

This document provides detailed documentation for each module and component in the X402 Drift platform.

## Backend Modules

### 1. Application Module (`backend/app.ts`)

**Purpose**: Main Express application entry point with API route definitions and middleware configuration.

#### Key Responsibilities
- Application setup and configuration
- API route definitions
- Middleware orchestration (CORS, rate limiting, error handling)
- Payment flow coordination
- Environment variable validation

#### Key Functions

**Constructor and Setup** (`backend/app.ts:42-74`)
```typescript
const app = express();
const corsOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'];

app.use(cors({
  origin: corsOrigins,
  exposedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(generalRateLimit);
```

**Route Definitions** (`backend/app.ts:105-246`)
- `/api/agent/tools` - Agent tool enumeration
- `/api/articles` - Article listing and access
- `/api/budget/:pubkey` - Budget management
- `/api/pricing` - Pricing information
- `/api/health` - Health check endpoint

**Payment Middleware Chain** (`backend/app.ts:129-149`)
```typescript
app.get(
  "/api/articles/:id",
  articleRateLimit,                          // 0. Rate limit first
  budgetPaywall({ amount: pricing.ARTICLE_COST, splToken: CONFIG.splToken }), // 1. Check budget first
  x402Paywall({ amount: pricing.ARTICLE_COST, splToken: CONFIG.splToken, recipientWallet: CONFIG.recipientWallet! }),  // 2. Fallback to 402
  requirePayment,                            // 3. Ensure payment was made
  asyncHandler(async (req: ExtendedRequest, res: Response) => {
    // Article access logic
  })
);
```

#### Configuration
- **SPL Token**: USDC on Solana devnet/mainnet
- **Articles Path**: Configurable directory for markdown files
- **CORS Origins**: Configurable allowed frontend domains
- **Rate Limiting**: Multiple tiered rate limiters

#### Dependencies
- Express.js framework
- Solana Web3.js for blockchain integration
- Custom middleware modules

---

### 2. Payment Module (`backend/paywall.ts`)

**Purpose**: Core x402 payment protocol implementation with Solana blockchain integration.

#### Key Responsibilities
- Transaction verification on Solana blockchain
- Budget-based access control
- x402 payment challenge generation
- Payment processing orchestration

#### Core Functions

**Transaction Verification** (`backend/paywall.ts:60-188`)
```typescript
export async function verifyTransaction(
  signature: string,
  reference: string,
  requiredAmount: number,
  splTokenMint: string,
  recipientWallet: string
): Promise<VerificationResult>
```

Verifies Solana transactions by:
1. Validating transaction signature
2. Checking reference memo matches
3. Verifying token transfer amount
4. Confirming recipient wallet
5. Preventing replay attacks

**Budget Paywall Middleware** (`backend/paywall.ts:193-251`)
```typescript
export const budgetPaywall = ({ amount, splToken }: BudgetPaywallOptions) =>
  async (req: ExtendedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Check user's pre-paid budget before processing payment
    // Automatically deduct if sufficient funds available
  }
```

**x402 Paywall Middleware** (`backend/paywall.ts:256-352`)
```typescript
export function x402Paywall({ amount, splToken, recipientWallet }: X402PaywallOptions) {
  return async (req: ExtendedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Generate 402 payment challenge when budget insufficient
    // Verify payment transactions when provided
  }
}
```

#### Payment Flow Logic

1. **Budget Check**: First attempts to use user's pre-paid budget
2. **Payment Challenge**: Generates invoice with unique reference if budget insufficient
3. **Transaction Verification**: Validates on-chain transaction details
4. **Access Grant**: Provides content access after successful verification

#### Security Features
- **Replay Protection**: Reference-based transaction tracking
- **Amount Validation**: Precise token amount verification
- **Memo Verification**: Reference matching in transaction memos
- **Address Validation**: Solana address format verification

#### Dependencies
- `@solana/kit` for Solana RPC interaction
- `@solana-program/token` for token operations
- Custom storage for reference tracking
- Validation utilities

---

### 3. Article Service Module (`backend/article-service.ts`)

**Purpose**: Content management system for markdown articles with security-focused processing.

#### Key Responsibilities
- Markdown file scanning and parsing
- Frontmatter metadata extraction
- Content caching with TTL-based invalidation
- Security validation and sanitization
- Preview and full content separation

#### Core Class: ArticleService

**Constructor** (`backend/article-service.ts:53-64`)
```typescript
constructor(articlesPath?: string) {
  this.articlesPath = articlesPath || config.articlesPath;
  this.cache = new Map();
  this.lastScan = null;
  this.CACHE_TTL = config.cacheTtl;

  // Configure marked for security and performance
  marked.setOptions({
    gfm: true,                 // Enable GitHub Flavored Markdown
    breaks: false              // Don't convert line breaks to <br>
  });
}
```

**Article Scanning** (`backend/article-service.ts:66-149`)
```typescript
async scanArticles(): Promise<Article[]>
```

Features:
- Parallel file processing for performance
- Security validation for all content
- Automatic cache management
- File system traversal protection

**Article Retrieval** (`backend/article-service.ts:151-201`)
```typescript
async getArticle(articleId: string): Promise<Article | null>
```

Returns article with:
- Metadata from frontmatter
- Full markdown content
- Processed HTML content
- Pricing information

**Content Processing** (`backend/article-service.ts:203-277`)
- Excerpt generation with configurable length
- Preview content creation (first N paragraphs)
- Secure markdown-to-HTML conversion
- Fallback HTML escaping for security

#### Security Features

**File Path Validation** (`backend/article-service.ts:85-87`)
```typescript
if (!validateFilePath(sanitizedFile, this.articlesPath)) {
  throw new Error(`Invalid file path: ${sanitizedFile}`);
}
```

**Content Sanitization** (`backend/article-service.ts:90-94`)
```typescript
const validation = validateMarkdownContent(fileContent);
if (!validation.isValid) {
  throw new Error('Invalid content detected in markdown file');
}
```

#### Article Structure

**Frontmatter Schema**:
```yaml
---
title: "Article Title"
author: "Author Name"
date: "2024-01-15"
excerpt: "Brief article description"
tags: ["tag1", "tag2"]
price: 0.01
currencySymbol: "$"
currencyName: "USDC"
---
```

#### Dependencies
- `marked` for markdown processing
- `gray-matter` for frontmatter parsing
- File system APIs for content access
- Validation utilities

---

### 4. Storage Module (`backend/storage.ts`)

**Purpose**: Data persistence abstraction layer supporting multiple storage backends.

#### Key Responsibilities
- User budget management
- Transaction reference tracking
- Storage backend abstraction
- Key-value operations with TTL support

#### Storage Interface

**Core Operations**:
```typescript
interface Storage {
  initialize(): Promise<void>;
  getBudget(pubkey: string): Promise<string>;
  setBudget(pubkey: string, amount: string): Promise<void>;
  addReference(key: string, options?: { ex?: number }): Promise<void>;
  hasReference(key: string): Promise<boolean>;
}
```

**Budget Management**:
- Store user budgets as string amounts
- Atomic operations for budget updates
- Precision preservation for token amounts

**Reference Tracking**:
- Prevent transaction replay attacks
- Configurable TTL for reference cleanup
- Efficient existence checking

#### Supported Backends

**SQLite Storage** (Development):
- Local file-based database
- Embedded in backend process
- Zero external dependencies

**Vercel KV Storage** (Production):
- Distributed key-value store
- Global edge locations
- Automatic failover

#### Dependencies
- Database drivers (SQLite, Vercel KV)
- Configuration management
- Error handling utilities

---

### 5. Validation Module (`backend/validation.ts`)

**Purpose**: Comprehensive input validation for security and data integrity.

#### Validation Functions

**Solana Address Validation**:
```typescript
export function validateSolanaAddress(address: string): boolean
```
- Base58 format validation
- Length validation
- Character set validation

**Transaction Signature Validation**:
```typescript
export function validateTransactionSignature(signature: string): boolean
```
- Base58 format checking
- Signature length validation
- Character set validation

**Reference Validation**:
```typescript
export function validateReference(reference: string): boolean
```
- UUID format validation
- Version validation
- String format checking

**File Path Validation**:
```typescript
export function validateFilePath(fileName: string, basePath: string): boolean
```
- Directory traversal protection
- Path normalization
- Base path validation

**Content Validation**:
```typescript
export function validateMarkdownContent(content: string): ValidationResult
```
- Malicious content detection
- Script injection prevention
- Content sanitization

#### Security Features
- **XSS Prevention**: HTML/script tag detection
- **Path Traversal Protection**: File system access control
- **Injection Prevention**: Malicious content filtering
- **Format Validation**: Strict data type checking

---

### 6. Rate Limiting Module (`backend/rate-limiter.ts`)

**Purpose**: Multi-tiered API rate limiting for performance and security.

#### Rate Limiters

**General Rate Limiter**:
```typescript
export const generalRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests from this IP'
});
```

**Payment Rate Limiter**:
```typescript
export const paymentRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // 10 payment operations per minute
  message: 'Too many payment attempts'
});
```

**Article Rate Limiter**:
```typescript
export const articleRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 50, // 50 article requests per minute
  message: 'Too many article requests'
});
```

**Budget Rate Limiter**:
```typescript
export const budgetRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // 30 budget operations per minute
  message: 'Too many budget operations'
});
```

#### Features
- **IP-based limiting**: Prevents abuse from single sources
- **Endpoint-specific limits**: Tailored limits for different operations
- **Configurable windows**: Adjustable time windows
- **Custom messages**: User-friendly error responses

---

### 7. Error Handling Module (`backend/error-handler.ts`)

**Purpose**: Centralized error processing with consistent responses and logging.

#### Error Handler Function
```typescript
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Error classification and response generation
}
```

#### Error Types

**Validation Errors**:
- Input validation failures
- Malformed requests
- Invalid parameters

**Payment Errors**:
- Transaction verification failures
- Insufficient payments
- Invalid signatures

**Content Errors**:
- Article not found
- File system errors
- Content parsing failures

**System Errors**:
- Database connection issues
- External service failures
- Unexpected exceptions

#### Response Format
```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "uuid"
}
```

---

### 8. Logger Module (`backend/logger.ts`)

**Purpose**: Structured logging with multiple log levels and component separation.

#### Logger Instances

**Main Logger**:
```typescript
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname'
    }
  }
});
```

**Specialized Loggers**:
- `paymentLogger`: Payment transaction logging
- `budgetLogger`: Budget operation logging
- `articleLogger`: Article processing logging

#### Log Levels
- `error`: Critical errors requiring attention
- `warn`: Warning conditions
- `info`: General information
- `debug`: Detailed debugging information

#### Features
- **Structured Logging**: JSON format for parsing
- **Contextual Information**: Request/user context included
- **Performance Tracking**: Operation timing
- **Security Auditing**: Payment transaction logs

---

## Frontend Modules

### 1. Application Component (`frontend/src/App.jsx`)

**Purpose**: Root React component with provider setup and error boundaries.

#### Key Responsibilities
- Wallet provider configuration
- Error boundary implementation
- Application layout structure
- Provider orchestration

#### Component Structure

**Provider Hierarchy** (`frontend/src/App.jsx:55-85`):
```jsx
<ErrorBoundary>
  <ConnectionProvider endpoint={endpoint}>
    <WalletProvider wallets={wallets}>
      <WalletModalProvider>
        <X402Provider>
          <AppContent />
        </X402Provider>
      </WalletModalProvider>
    </WalletProvider>
  </ConnectionProvider>
</ErrorBoundary>
```

**Error Boundary** (`frontend/src/App.jsx:12-48`):
- Catches wallet initialization errors
- Provides recovery UI
- Logs errors for debugging

#### Configuration
- **Solana Network**: Configurable devnet/mainnet
- **Wallet Support**: Multi-wallet compatibility
- **CORS Setup**: Proper cross-origin handling

#### Dependencies
- `@solana/wallet-adapter-react` for wallet integration
- `@solana/wallet-adapter-react-ui` for UI components
- `@solana/web3.js` for Solana connection

---

### 2. X402 Payment Provider (`frontend/src/x402.jsx`)

**Purpose**: React context provider for x402 payment functionality.

#### Core Functions

**Payment Execution** (`frontend/src/x402.jsx:22-96`):
```javascript
const executePayment = useCallback(
  async (invoice, memo) => {
    // Build Solana transaction
    // Create token transfer instruction
    // Add memo instruction for reference
    // Sign and send transaction
    // Wait for confirmation
  },
  [connection, publicKey, sendTransaction]
)
```

**402 Fetch Wrapper** (`frontend/src/x402.jsx:98-139`):
```javascript
const fetchWith402 = useCallback(
  async (url, options = {}) => {
    // Try with budget first
    // Handle 402 payment challenge
    // Execute payment if required
    // Retry with payment proof
  },
  [publicKey, executePayment]
)
```

**Budget Management** (`frontend/src/x402.jsx:143-192`):
```javascript
const depositBudget = useCallback(
  async (invoiceUrl, amount) => {
    // Get 402 invoice for deposit
    // Create deposit transaction
    // Confirm deposit with backend
  },
  [publicKey, executePayment, API_BASE]
)
```

#### Payment Flow
1. **Budget Check**: Automatic budget usage when available
2. **Payment Challenge**: Handles 402 responses
3. **Transaction Creation**: Builds Solana transactions
4. **Verification**: Confirms transaction success

#### Features
- **Automatic Budget Usage**: Seamless payment with pre-paid funds
- **Transaction Optimization**: Efficient Solana transaction building
- **Error Handling**: Wallet error detection and user feedback
- **Retry Logic**: Automatic retry for failed transactions

---

### 3. Articles Component (`frontend/src/Articles.jsx`)

**Purpose**: Article browsing, display, and payment integration component.

#### State Management
```javascript
const [freeArticles, setFreeArticles] = useState([]);
const [premiumArticles, setPremiumArticles] = useState([]);
const [selectedArticle, setSelectedArticle] = useState(null);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);
const [activeTab, setActiveTab] = useState('premium');
```

#### Key Functions

**Article Fetching** (`frontend/src/Articles.jsx:37-59`):
```javascript
const fetchArticles = async () => {
  // Fetch all articles from API
  // Separate free and premium articles
  // Update component state
}
```

**Article Access** (`frontend/src/Articles.jsx:61-97`):
```javascript
const handleArticleClick = async (article) => {
  // Check article type (free/premium)
  // Verify wallet connection for premium
  // Use x402 fetch wrapper for payment
  // Handle success/error states
}
```

**Content Formatting** (`frontend/src/Articles.jsx:99-119`):
```javascript
const formatMarkdown = (text) => {
  // Convert markdown to HTML
  // Handle headers and formatting
  // Sanitize content for display
}
```

#### UI Components

**Article List** (`frontend/src/Articles.jsx:121-168`):
- Tabbed interface for free/premium
- Article cards with metadata
- Loading and error states
- Responsive design

**Article Modal** (`frontend/src/Articles.jsx:219-289`):
- Full-screen article display
- Rich content rendering
- Metadata presentation
- Close functionality

#### Features
- **Responsive Design**: Mobile-first layout
- **Loading States**: User feedback during operations
- **Error Handling**: Graceful error display
- **Content Caching**: Optimized performance

---

### 4. Agent Component (`frontend/src/AgentComponent.jsx`)

**Purpose**: AI-powered assistant for content discovery and user guidance.

#### Core Functionality

**Tool Integration** (`frontend/src/AgentComponent.jsx:62-107`):
```javascript
const handleSend = async () => {
  // Analyze user prompt
  // Select appropriate tool
  // Execute x402 payment for paid tools
  // Format and display response
}
```

**Budget Management** (`frontend/src/AgentComponent.jsx:109-147`):
```javascript
const handleTopUp = async () => {
  // Validate deposit amount
  // Execute budget deposit
  // Update user interface
  // Display confirmation
}
```

#### Tool System

**Available Tools**:
- `get_all_articles`: List all articles (Free)
- `get_article_preview`: Article preview (Free)
- `get_article_free`: Free article access (Free)
- `get_article`: Full article access (Paid)

#### UI Features
- **Chat Interface**: Conversational interaction
- **Message Types**: Different styling for agent, user, errors
- **Tool Discovery**: Automatic tool selection based on prompts
- **Budget Top-up**: Integrated budget management

---

### 5. X402 Hook (`frontend/src/useX402.js`)

**Purpose**: Custom React hook for accessing x402 payment context.

#### Hook Interface
```javascript
const { fetchWith402, depositBudget, API_BASE, isWalletError, publicKey } = useX402();
```

#### Returned Values
- `fetchWith402`: Payment-aware fetch function
- `depositBudget`: Budget deposit function
- `API_BASE`: Base API URL
- `isWalletError`: Wallet error detection function
- `publicKey`: Current wallet public key

#### Usage Example
```javascript
function MyComponent() {
  const { fetchWith402, publicKey } = useX402();

  const getPremiumContent = async () => {
    if (!publicKey) {
      alert('Please connect your wallet');
      return;
    }

    try {
      const content = await fetchWith402('/api/premium-content');
      setContent(content);
    } catch (error) {
      setError(error.message);
    }
  };
}
```

---

## Configuration Modules

### 1. Backend Config (`backend/config.ts`)

**Purpose**: Centralized configuration management with environment variable handling.

#### Configuration Schema
```typescript
interface Config {
  port: number;
  nodeEnv: string;
  articlesPath: string;
  splToken: string;
  recipientWallet: string;
  corsOrigins: string[];
  solanaNetwork: string;
  cacheTtl: number;
  memoProgramId: string;
  paymentDescription: string;
}
```

#### Environment Variables
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 3001)
- `ARTICLES_PATH`: Articles directory path
- `SPL_TOKEN_MINT`: SPL token mint address
- `MY_WALLET_ADDRESS`: Recipient wallet address
- `CORS_ORIGINS`: Allowed CORS origins

### 2. Pricing Module (`backend/pricing.ts`)

**Purpose**: Payment pricing configuration and validation.

#### Pricing Configuration
```typescript
export const pricing = {
  ARTICLE_COST: 0.01,           // Cost per article in USDC
  CURRENCY_SYMBOL: '$',         // Display currency symbol
  CURRENCY_NAME: 'USDC',        // Currency name
  MIN_DEPOSIT: 0.01,            // Minimum deposit amount
  MAX_DEPOSIT: 1000,           // Maximum deposit amount
};
```

#### Validation Functions
- Deposit amount range validation
- Pricing consistency checks
- Currency format validation

---

## Type Definitions

### Backend Types (`backend/types.ts`)

**Purpose**: Comprehensive TypeScript type definitions for the entire system.

#### Key Type Categories

**Payment Types**:
- `VerificationResult`: Transaction verification outcome
- `Invoice`: x402 payment invoice structure
- `BudgetOperationContext`: Budget operation metadata

**Content Types**:
- `Article`: Article data structure
- `ArticleListItem`: List view article representation
- `ArticleProcessingError`: Article processing error context

**API Types**:
- `APIErrorContext`: API error metadata
- `EnvironmentConfig`: Environment variable types

**Error Classes**:
- `PaymentVerificationError`: Payment-specific errors
- `BudgetOperationError`: Budget operation errors
- `ArticleServiceError`: Article service errors
- `ValidationError`: Input validation errors

---

## Security Considerations

### Input Validation
- All user inputs validated through validation module
- File system access controlled and sandboxed
- Transaction parameters strictly validated

### Payment Security
- On-chain transaction verification
- Replay attack prevention through reference tracking
- Amount validation with decimal precision
- Wallet address format validation

### Content Security
- Markdown content sanitization
- XSS prevention in content rendering
- File system traversal protection
- Content injection prevention

### Rate Limiting
- Multi-tiered rate limiting strategy
- IP-based request throttling
- Endpoint-specific limits
- Abuse prevention mechanisms

This modular architecture provides a robust, secure, and scalable foundation for blockchain-powered content monetization while maintaining code organization and maintainability.