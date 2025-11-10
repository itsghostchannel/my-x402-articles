# Architecture Documentation

## System Overview

The CMS x402 Backend is a modular, TypeScript-based Node.js application that combines traditional content management with modern blockchain payment processing. The architecture follows a layered approach with clear separation of concerns, making it maintainable and extensible.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Applications                     │
│  (Web Frontend, Mobile Apps, AI Agents, External Services)     │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Express.js API Layer                       │
│  • Route Handlers • Middleware • Request/Response Processing   │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                         │
│  • Article Service • Payment Processing • Budget Management    │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                         │
│  • Storage • Logging • Validation • Rate Limiting • Config     │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                       External Services                         │
│  • Solana Blockchain • Vercel KV • File System • NTP Time      │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Application Layer (`app.ts`)

**Responsibilities**:
- Express application setup and configuration
- Route definition and middleware composition
- Error handling and request lifecycle management
- CORS configuration and security headers

**Key Features**:
- Modular middleware pipeline for payment processing
- Configuration-driven setup
- Comprehensive error handling
- Health check and monitoring endpoints

```typescript
// Payment middleware pipeline example
app.get("/api/articles/:id",
  articleRateLimit,                          // Rate limiting
  budgetPaywall(options),                    // Check budget first
  x402Paywall(options),                      // Fallback to x402
  requirePayment,                            // Ensure payment
  asyncHandler(getArticleHandler)            // Final handler
);
```

### 2. Content Management (`article-service.ts`)

**Responsibilities**:
- Markdown article processing and caching
- File system operations with security validation
- Content transformation (markdown → HTML)
- Metadata extraction and validation

**Architecture Pattern**: Service Layer with Caching

**Key Components**:
- **File Scanner**: Recursive directory scanning with validation
- **Content Parser**: Front-matter extraction and markdown processing
- **Cache Manager**: In-memory caching with TTL for performance
- **Security Layer**: Path traversal prevention and content sanitization

```typescript
class ArticleService {
  private cache: Map<string, Article>;
  private lastScan: number | null;
  private readonly CACHE_TTL: number;

  async scanArticles(): Promise<Article[]>
  async getArticle(articleId: string): Promise<Article | null>
  private createExcerpt(content: string): string
  private markdownToHtml(content: string): string
}
```

### 3. Payment Processing (`paywall.ts`)

**Responsibilities**:
- x402 protocol implementation
- Solana transaction verification
- Budget management integration
- Payment method abstraction

**Architecture Pattern**: Middleware Chain with State Machine

**Payment Flow**:
1. **Budget Check**: Verify pre-paid budget availability
2. **Transaction Verification**: Validate on-chain payment
3. **Access Grant**: Grant content access upon successful payment
4. **Replay Prevention**: Track used transaction references

**Key Components**:
- **Transaction Verifier**: Solana transaction validation
- **Budget Manager**: Pre-paid budget operations
- **Reference Tracker**: Prevent replay attacks
- **Payment Router**: Route to appropriate payment method

```typescript
// Payment middleware chain
export const budgetPaywall = (options) => async (req, res, next) => {
  // Check budget first, fast path for returning users
}

export const x402Paywall = (options) => async (req, res, next) => {
  // Fallback to on-chain payment verification
}

export const requirePayment = (req, res, next) => {
  // Final gatekeeper ensuring payment was made
}
```

### 4. Storage Abstraction (`storage.ts`)

**Responsibilities**:
- Data persistence abstraction
- Multi-provider support (Vercel KV, in-memory)
- Budget and reference management
- Cache coherence

**Architecture Pattern**: Repository Pattern with Provider Strategy

**Storage Providers**:
- **Vercel KV**: Production Redis-compatible storage
- **In-Memory**: Development fallback with SQLite persistence
- **Future**: Database expansion points (PostgreSQL, etc.)

```typescript
interface StorageProvider {
  get(key: string): Promise<any>
  set(key: string, value: any, options?: any): Promise<void>
  has(key: string): Promise<boolean>
  del(key: string): Promise<void>
}

class Storage {
  private provider: StorageProvider;

  async getBudget(pubkey: string): Promise<string>
  async setBudget(pubkey: string, amount: string): Promise<void>
  async addReference(refKey: string, options: any): Promise<void>
  async hasReference(refKey: string): Promise<boolean>
}
```

### 5. Validation Framework (`validation.ts`)

**Responsibilities**:
- Input sanitization and validation
- Security constraint enforcement
- Business rule validation
- Type safety enforcement

**Architecture Pattern**: Validator Chain with Error Composition

**Validation Categories**:
- **Address Validation**: Solana address format validation
- **Transaction Validation**: Signature and reference validation
- **File Validation**: Path security and content validation
- **Business Validation**: Amount limits and pricing rules

```typescript
// Validation examples
export function validateSolanaAddress(address: string): boolean
export function validateTransactionSignature(signature: string): boolean
export function validateFilePath(fileName: string, basePath: string): boolean
export function validateMarkdownContent(content: string): ValidationResult
```

## Data Flow

### Article Access Flow

```
Client Request
     │
     ▼
Rate Limiting Check
     │
     ▼
Budget Check (x402-payer-pubkey header)
     │
     ├─ Success → Budget Deduction → Content Access
     │
     └─ Insufficient → Transaction Verification
                         │
                         ├─ Success → Reference Tracking → Content Access
                         │
                         └─ Failed → 402 Payment Required
```

### Budget Deposit Flow

```
Client Submit Transaction
     │
     ▼
Rate Limiting Check
     │
     ▼
Input Validation
     │
     ▼
Transaction Verification
     │
     ├─ Success → Budget Update → Reference Tracking
     │
     └─ Failed → Error Response
```

## Security Architecture

### Multi-Layer Security

1. **Network Layer**:
   - CORS configuration
   - Rate limiting per endpoint type
   - Request size limits

2. **Application Layer**:
   - Input validation and sanitization
   - Path traversal prevention
   - Content security policies

3. **Business Logic Layer**:
   - Transaction verification
   - Replay attack prevention
   - Budget enforcement

4. **Data Layer**:
   - Secure storage patterns
   - Reference isolation
   - Audit logging

### Threat Mitigation

| Threat | Mitigation Strategy |
|--------|-------------------|
| Path Traversal | File path validation and sandboxing |
| Replay Attacks | Reference tracking with expiration |
| Rate Limiting Bypass | Multiple rate limiters by endpoint type |
| Invalid Transactions | Comprehensive Solana transaction validation |
| Data Injection | Input sanitization and type validation |
| DoS Attacks | Rate limiting and request size limits |

## Performance Architecture

### Caching Strategy

1. **Article Cache**: In-memory caching with TTL (5 minutes default)
2. **File System Cache**: OS-level file system caching
3. **Budget Cache**: Fast budget lookups with provider optimization
4. **Reference Cache**: Short-term reference tracking

### Optimization Techniques

- **Parallel Processing**: Concurrent article scanning and processing
- **Lazy Loading**: Load full article content only when needed
- **Streaming**: Process large markdown files efficiently
- **Connection Pooling**: Optimize external service connections

### Monitoring and Observability

```typescript
// Structured logging with context
paymentLogger.info({
  signature, reference, amount, splToken, recipient
}, "Payment verification successful");

budgetLogger.debug({
  payer: pubkey, requiredAmount, availableBudget
}, "Budget paywall: Insufficient budget");
```

## Configuration Architecture

### Environment-Driven Configuration

```typescript
interface AppConfig {
  port: number;
  nodeEnv: string;
  solanaNetwork: 'devnet' | 'mainnet';
  articlesPath: string;
  corsOrigins: string[];
  logLevel: string;
  cacheTtl: number;
  memoProgramId: string;
  paymentDescription: string;
}
```

### Configuration Hierarchy

1. **Environment Variables**: Primary configuration source
2. **Default Values**: Fallback for development
3. **Validation**: Runtime configuration validation
4. **Type Safety**: TypeScript compile-time guarantees

## Deployment Architecture

### Development Environment

```
Developer Machine
├── Node.js Runtime
├── TypeScript Compiler
├── In-Memory Storage
├── Local File System
└── Solana Devnet
```

### Production Environment

```
Production Server
├── Node.js Runtime
├── Compiled JavaScript
├── Vercel KV / Redis
├── Persistent File Storage
├── Load Balancer
├── CDN
└── Solana Mainnet
```

### Scalability Considerations

- **Horizontal Scaling**: Stateless design enables multiple instances
- **Database Scaling**: Pluggable storage providers
- **Rate Limiting**: Distributed rate limiting with Redis
- **Caching**: External cache providers (Redis) for shared state

## Integration Patterns

### x402 Protocol Integration

The system implements the x402 protocol for blockchain-based payments:

```typescript
interface Invoice {
  protocol: "x402";
  recipientWallet: string;
  amount: number;
  token: string;
  reference: string;
  metadata: {
    service: string;
    description: string;
  };
}
```

### AI Agent Integration

Structured agent tool integration:

```typescript
interface AgentTool {
  id: string;
  description: string;
  endpoint: string;
  cost: number;
}
```

### Frontend Integration

RESTful API design enables seamless frontend integration:

- **Progressive Enhancement**: Free content available without payment
- **Graceful Degradation**: Content accessible with alternative payment methods
- **Real-time Updates**: Budget and payment status updates

## Error Handling Architecture

### Centralized Error Handling

```typescript
class ErrorHandler {
  handle(error: Error, req: Request, res: Response): void
  logError(error: Error, context: any): void
  sanitizeError(error: Error): SafeError
}
```

### Error Categories

1. **Validation Errors**: Input validation failures (400)
2. **Authentication Errors**: Payment verification failures (401)
3. **Authorization Errors**: Insufficient permissions (402)
4. **Not Found Errors**: Resource not found (404)
5. **Rate Limit Errors**: Too many requests (429)
6. **Server Errors**: Unexpected failures (500)

## Future Architecture Considerations

### Microservices Migration Path

The current monolithic architecture can be migrated to microservices:

1. **Content Service**: Article management and processing
2. **Payment Service**: Transaction verification and budget management
3. **User Service**: User profile and preferences
4. **Analytics Service**: Usage tracking and insights

### Event-Driven Architecture

Future enhancements could include:

- **Event Sourcing**: Audit trail for all operations
- **Message Queues**: Asynchronous payment processing
- **Event Notifications**: Real-time updates to clients
- **Webhooks**: External system integration

### Database Evolution

Storage abstraction enables smooth database migration:

- **Current**: Vercel KV / In-memory SQLite
- **Future**: PostgreSQL / MongoDB
- **Hybrid**: Multi-provider for different data types

## Testing Architecture

### Test Pyramid

1. **Unit Tests**: Individual function and class testing
2. **Integration Tests**: Service and API endpoint testing
3. **End-to-End Tests**: Complete user journey testing
4. **Performance Tests**: Load and stress testing

### Mock Strategy

- **Blockchain Mocking**: Solana devnet for realistic testing
- **Storage Mocking**: In-memory storage for unit tests
- **External Service Mocking**: API mocking for integration tests

---

*This architecture documentation provides a comprehensive overview of the system design, implementation patterns, and future considerations. For specific implementation details, refer to the inline code documentation and type definitions.*