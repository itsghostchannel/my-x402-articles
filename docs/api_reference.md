# API Reference

This document provides comprehensive documentation for all available API endpoints in the X402 Drift platform.

## Base URL

```
Development: http://localhost:3001
Production: https://your-api-domain.com
```

## Authentication

The API uses the x402 payment protocol for accessing premium content. Two types of authentication are supported:

### 1. Budget-Based Authentication

Include your wallet public key in the request headers:

```http
x402-Payer-Pubkey: <your-solana-wallet-public-key>
```

### 2. Transaction-Based Authentication

For individual payments, include the transaction signature:

```http
Authorization: x402 <transaction-signature>
```

## Response Format

All API responses follow this structure:

### Success Response
```json
{
  "data": {}, // Response data
  "timestamp": "2024-01-15T10:30:00.000Z",
  "success": true
}
```

### Error Response
```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Core Endpoints

### Health Check

#### GET /api/health

Check the health status of the backend service.

**Endpoint**: `GET /api/health`

**Authentication**: None required

**Response**:
```json
{
  "status": "healthy",
  "service": "CMS x402 Backend",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "config": {
    "network": "devnet",
    "token": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "articlesPath": "/app/backend/articles"
  }
}
```

**Example Request**:
```bash
curl -X GET http://localhost:3001/api/health
```

---

## Articles API

### GET /api/articles

Get a list of all available articles with metadata.

**Endpoint**: `GET /api/articles`

**Authentication**: None required

**Rate Limiting**: 100 requests per minute

**Response**:
```json
{
  "articles": [
    {
      "id": "my-first-article",
      "slug": "my-first-article",
      "title": "My First Premium Article",
      "author": "John Doe",
      "date": "2024-01-15",
      "excerpt": "This is my first article on the X402 platform...",
      "tags": ["blockchain", "content", "monetization"],
      "wordCount": 250,
      "readTime": 2,
      "isPremium": true,
      "price": 0.01,
      "currencySymbol": "$",
      "currencyName": "USDC"
    }
  ],
  "total": 1,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Example Request**:
```bash
curl -X GET http://localhost:3001/api/articles
```

---

### GET /api/articles/:id/preview

Get article preview without full content.

**Endpoint**: `GET /api/articles/:id/preview`

**Parameters**:
- `id` (string, required): Article identifier (slug)

**Authentication**: None required

**Rate Limiting**: 100 requests per minute

**Response**:
```json
{
  "id": "my-first-article",
  "slug": "my-first-article",
  "title": "My First Premium Article",
  "author": "John Doe",
  "date": "2024-01-15",
  "excerpt": "This is my first article on the X402 platform...",
  "tags": ["blockchain", "content", "monetization"],
  "wordCount": 250,
  "readTime": 2,
  "isPremium": true,
  "previewContent": "Welcome to my first article on the X402 platform!",
  "price": 0.01,
  "currencySymbol": "$",
  "currencyName": "USDC"
}
```

**Example Request**:
```bash
curl -X GET http://localhost:3001/api/articles/my-first-article/preview
```

**Error Response (404)**:
```json
{
  "error": "Article not found"
}
```

---

### GET /api/articles/:id

Get full article content (requires payment).

**Endpoint**: `GET /api/articles/:id`

**Parameters**:
- `id` (string, required): Article identifier (slug)

**Authentication**: Required (Budget or Transaction)

**Payment Flow**:
1. First, attempt with budget authentication
2. If insufficient budget, receives 402 response with invoice
3. Complete payment and retry with transaction authentication

**Rate Limiting**: 50 requests per minute

**Success Response**:
```json
{
  "id": "my-first-article",
  "slug": "my-first-article",
  "title": "My First Premium Article",
  "author": "John Doe",
  "date": "2024-01-15",
  "excerpt": "This is my first article on the X402 platform...",
  "tags": ["blockchain", "content", "monetization"],
  "wordCount": 250,
  "readTime": 2,
  "isPremium": true,
  "fullContent": "# My First Premium Article\n\nWelcome to my first article...",
  "htmlContent": "<h1>My First Premium Article</h1><p>Welcome to my first article...</p>",
  "price": 0.01,
  "currencySymbol": "$",
  "currencyName": "USDC",
  "paymentMethod": "budget",
  "accessTimestamp": "2024-01-15T10:30:00.000Z"
}
```

**Payment Required Response (402)**:
```json
{
  "protocol": "x402",
  "recipientWallet": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "amount": 0.01,
  "token": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "reference": "123e4567-e89b-12d3-a456-426614174000",
  "metadata": {
    "service": "X402 Content Access",
    "description": "Access premium article content for 0.01 EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  }
}
```

**Example Request (with budget)**:
```bash
curl -X GET http://localhost:3001/api/articles/my-first-article \
  -H "x402-Payer-Pubkey: 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
```

**Example Request (after payment)**:
```bash
curl -X GET "http://localhost:3001/api/articles/my-first-article?reference=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: x402 5j7s83k2hJ4K8L3M9N2Q7R6T1Y4U8I3O2P1A9S6D"
```

---

## Budget Management API

### GET /api/budget/:pubkey

Get current budget information for a wallet.

**Endpoint**: `GET /api/budget/:pubkey`

**Parameters**:
- `pubkey` (string, required): Solana wallet public key

**Authentication**: None required

**Rate Limiting**: 30 requests per minute

**Response**:
```json
{
  "pubkey": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "currentBudget": 0.05,
  "currency": "USDC"
}
```

**Example Request**:
```bash
curl -X GET http://localhost:3001/api/budget/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM
```

---

### POST /api/budget/deposit/confirm

Confirm a budget deposit transaction.

**Endpoint**: `POST /api/budget/deposit/confirm`

**Authentication**: None required (transaction is the authentication)

**Rate Limiting**: 10 requests per minute

**Request Body**:
```json
{
  "signature": "5j7s83k2hJ4K8L3M9N2Q7R6T1Y4U8I3O2P1A9S6D",
  "reference": "DEPOSIT-123e4567-e89b-12d3-a456-426614174000",
  "payerPubkey": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "amount": 0.05
}
```

**Response**:
```json
{
  "success": true,
  "newBudget": 0.05,
  "depositAmount": 0.05
}
```

**Error Response (400)** - Incomplete request:
```json
{
  "error": "Incomplete request (signature, reference, payerPubkey, amount required)"
}
```

**Error Response (401)** - Transaction verification failed:
```json
{
  "error": "Budget deposit verification failed: Invalid transaction signature"
}
```

**Error Response (401)** - Already claimed:
```json
{
  "error": "This budget deposit has already been claimed"
}
```

**Example Request**:
```bash
curl -X POST http://localhost:3001/api/budget/deposit/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "signature": "5j7s83k2hJ4K8L3M9N2Q7R6T1Y4U8I3O2P1A9S6D",
    "reference": "DEPOSIT-123e4567-e89b-12d3-a456-426614174000",
    "payerPubkey": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    "amount": 0.05
  }'
```

---

## Pricing API

### GET /api/pricing

Get current pricing information.

**Endpoint**: `GET /api/pricing`

**Authentication**: None required

**Rate Limiting**: 60 requests per minute

**Response**:
```json
{
  "pricing": {
    "ARTICLE_COST": 0.01,
    "CURRENCY_SYMBOL": "$",
    "CURRENCY_NAME": "USDC",
    "MIN_DEPOSIT": 0.01,
    "MAX_DEPOSIT": 1000
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Example Request**:
```bash
curl -X GET http://localhost:3001/api/pricing
```

---

## Agent Tools API

### GET /api/agent/tools

Get list of available agent tools for the AI assistant.

**Endpoint**: `GET /api/agent/tools`

**Authentication**: None required

**Rate Limiting**: 30 requests per minute

**Response**:
```json
[
  {
    "id": "get_all_articles",
    "description": "Get a list of all available articles with metadata",
    "endpoint": "/api/articles",
    "cost": 0
  },
  {
    "id": "get_article_preview",
    "description": "Get article preview without full content",
    "endpoint": "/api/articles/:id/preview",
    "cost": 0
  },
  {
    "id": "get_article_free",
    "description": "Get free article content",
    "endpoint": "/api/articles/:id/free",
    "cost": 0
  },
  {
    "id": "get_article",
    "description": "Get full article content (requires payment)",
    "endpoint": "/api/articles/:id",
    "cost": 0.01
  }
]
```

**Example Request**:
```bash
curl -X GET http://localhost:3001/api/agent/tools
```

---

## Error Codes

### Standard HTTP Status Codes

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication failed or payment required
- `402 Payment Required`: Payment required for access
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Custom Error Codes

#### Payment Errors

**INVALID_SIGNATURE**
```json
{
  "error": "Invalid transaction signature format",
  "code": "INVALID_SIGNATURE"
}
```

**INSUFFICIENT_PAYMENT**
```json
{
  "error": "Incorrect token amount. Received: 100, Required: 1000",
  "code": "INSUFFICIENT_PAYMENT"
}
```

**TRANSACTION_FAILED**
```json
{
  "error": "Transaction failed or not found",
  "code": "TRANSACTION_FAILED"
}
```

**REPLAY_ATTACK**
```json
{
  "error": "Payment already claimed (replay attack)",
  "code": "REPLAY_ATTACK"
}
```

#### Budget Errors

**BUDGET_INSUFFICIENT**
```json
{
  "error": "Insufficient budget for this operation",
  "code": "BUDGET_INSUFFICIENT"
}
```

**INVALID_AMOUNT**
```json
{
  "error": "Deposit amount must be between 0.01 and 1000",
  "code": "INVALID_AMOUNT"
}
```

#### Content Errors

**ARTICLE_NOT_FOUND**
```json
{
  "error": "Article not found",
  "code": "ARTICLE_NOT_FOUND"
}
```

**INVALID_CONTENT**
```json
{
  "error": "Invalid content detected in markdown file",
  "code": "INVALID_CONTENT"
}
```

---

## Rate Limiting

The API implements multiple rate limiting strategies:

### Rate Limits by Endpoint

- **General API**: 100 requests/minute
- **Article Access**: 50 requests/minute
- **Payment Operations**: 10 requests/minute
- **Budget Operations**: 30 requests/minute

### Rate Limit Headers

Responses include rate limiting headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1705317000
```

### Rate Limit Exceeded Response

```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

---

## Payment Protocol Details

### x402 Payment Flow

1. **Initial Request**: Client requests premium content
2. **Budget Check**: Server checks if user has sufficient budget
3. **402 Response**: If budget insufficient, returns payment invoice
4. **Payment**: Client creates and signs Solana transaction
5. **Verification**: Server verifies transaction on-chain
6. **Access Granted**: Server provides content access

### Transaction Requirements

**Required Transaction Details**:
- **Token Transfer**: SPL token transfer to recipient wallet
- **Amount**: Exact amount specified in invoice
- **Memo**: Reference UUID for tracking
- **Recipient**: Configured recipient wallet address

**Memo Program ID**: `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`

### Transaction Structure

```json
{
  "instructions": [
    {
      "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      "keys": [...],
      "data": "..."
    },
    {
      "programId": "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
      "data": "<reference-uuid>"
    }
  ]
}
```

---

## SDK and Integration

### JavaScript/TypeScript Example

```typescript
interface X402Client {
  baseURL: string;

  // Get articles
  getArticles(): Promise<Article[]>;
  getArticlePreview(id: string): Promise<ArticlePreview>;

  // Get paid content
  async getArticle(id: string, walletPublicKey: string): Promise<Article> {
    // Try with budget first
    try {
      const response = await fetch(`${this.baseURL}/api/articles/${id}`, {
        headers: {
          'x402-Payer-Pubkey': walletPublicKey
        }
      });

      if (response.ok) return response.json();
      if (response.status === 402) return this.handlePayment(response, id);

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      throw new Error(`Failed to get article: ${error.message}`);
    }
  }

  // Handle payment flow
  private async handlePayment(response: Response, articleId: string): Promise<Article> {
    const invoice = await response.json();

    // Create and sign transaction using wallet
    const signature = await this.createPaymentTransaction(invoice);

    // Retry with payment proof
    const finalResponse = await fetch(
      `${this.baseURL}/api/articles/${articleId}?reference=${invoice.reference}`,
      {
        headers: {
          'Authorization': `x402 ${signature}`
        }
      }
    );

    if (!finalResponse.ok) {
      throw new Error('Payment verification failed');
    }

    return finalResponse.json();
  }
}
```

### React Hook Example

```typescript
function useX402Payment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purchaseArticle = async (articleId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Implementation using wallet adapters
      const article = await purchaseWith402(articleId);
      return article;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { purchaseArticle, loading, error };
}
```

---

## Testing

### Testing with cURL

```bash
# Test health check
curl -X GET http://localhost:3001/api/health

# Test article list
curl -X GET http://localhost:3001/api/articles

# Test article preview
curl -X GET http://localhost:3001/api/articles/my-article/preview

# Test budget endpoint
curl -X GET http://localhost:3001/api/budget/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM

# Test pricing
curl -X GET http://localhost:3001/api/pricing

# Test agent tools
curl -X GET http://localhost:3001/api/agent/tools
```

### Testing Payments

To test the payment flow, you'll need:

1. A Solana wallet with test USDC tokens
2. The ability to sign transactions
3. A way to handle the 402 payment flow

See the [Getting Started Guide](./getting_started.md) for complete testing instructions.

---

## Support

For API support:

1. Check the [Getting Started Guide](./getting_started.md)
2. Review the [Architecture Documentation](./architecture.md)
3. Search existing GitHub issues
4. Create a new issue with detailed information about your use case

---

This API provides a comprehensive foundation for building blockchain-powered content monetization applications with the x402 payment protocol.