# API Reference Documentation

## Overview

The CMS x402 Backend provides a RESTful API for content management with integrated Solana blockchain payments. All endpoints follow REST conventions and return JSON responses.

## Base URL

```
Development: http://localhost:3001
Production: https://your-domain.com
```

## Authentication

The API uses x402 payment protocol for authentication to paid content. Free endpoints require no authentication, while paid content requires either:

1. **Budget Authentication**: `x402-payer-pubkey` header with pre-paid budget
2. **Transaction Authentication**: `Authorization: x402 <signature>` header with `reference` query parameter

## Response Format

All responses follow this structure:

```json
{
  "data": {},           // Response data (varies by endpoint)
  "timestamp": "2024-01-01T00:00:00.000Z",  // ISO timestamp
  "error": null         // Error object (only on errors)
}
```

Error responses:
```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Core Endpoints

### Health Check

#### GET /api/health

Check service status and configuration.

**Access Level**: Free
**Rate Limit**: General limits apply

**Response**:
```json
{
  "status": "healthy",
  "service": "CMS x402 Backend",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "config": {
    "network": "devnet",
    "token": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    "articlesPath": "./articles"
  }
}
```

---

## Articles

### GET /api/articles

List all available articles with metadata.

**Access Level**: Free
**Rate Limit**: Article-specific limits

**Query Parameters**:
- None

**Response**:
```json
{
  "articles": [
    {
      "id": "article-slug",
      "slug": "article-slug",
      "title": "Article Title",
      "author": "Author Name",
      "date": "2024-01-01",
      "excerpt": "Brief article description...",
      "tags": ["tag1", "tag2"],
      "wordCount": 1500,
      "readTime": 8,
      "isPremium": true,
      "price": 0.10,
      "currencySymbol": "$",
      "currencyName": "USDC"
    }
  ],
  "total": 1,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /api/articles/:id/preview

Get article preview with limited content.

**Access Level**: Free
**Rate Limit**: Article-specific limits

**Path Parameters**:
- `id` (string): Article identifier/slug

**Response**:
```json
{
  "id": "article-slug",
  "slug": "article-slug",
  "title": "Article Title",
  "author": "Author Name",
  "date": "2024-01-01",
  "excerpt": "Brief article description...",
  "tags": ["tag1", "tag2"],
  "wordCount": 1500,
  "readTime": 8,
  "previewContent": "First few paragraphs of article...",
  "isPremium": true,
  "price": 0.10,
  "currencySymbol": "$",
  "currencyName": "USDC"
}
```

### GET /api/articles/:id

Get full article content (requires payment).

**Access Level**: Paid
**Rate Limit**: Article-specific limits

**Authentication Methods**:
1. **Budget**: `x402-payer-pubkey: <wallet_address>` header
2. **Transaction**: `Authorization: x402 <signature>` header + `reference` query

**Path Parameters**:
- `id` (string): Article identifier/slug

**Query Parameters**:
- `reference` (string, optional): UUID reference for transaction verification

**Headers**:
- `x402-payer-pubkey` (string, optional): Wallet public key for budget usage
- `Authorization` (string, optional): `x402 <transaction_signature>`

**Success Response**:
```json
{
  "id": "article-slug",
  "slug": "article-slug",
  "title": "Article Title",
  "author": "Author Name",
  "date": "2024-01-01",
  "excerpt": "Brief article description...",
  "tags": ["tag1", "tag2"],
  "wordCount": 1500,
  "readTime": 8,
  "filePath": "/path/to/article.md",
  "isPremium": true,
  "previewContent": "First few paragraphs...",
  "fullContent": "Complete article content in markdown...",
  "htmlContent": "<p>Complete article content in HTML...</p>",
  "price": 0.10,
  "currencySymbol": "$",
  "currencyName": "USDC",
  "paymentMethod": "budget",
  "accessTimestamp": "2024-01-01T00:00:00.000Z"
}
```

**Payment Required Response (402)**:
```json
{
  "protocol": "x402",
  "recipientWallet": "YOUR_RECIPIENT_WALLET_ADDRESS",
  "amount": 0.10,
  "token": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  "reference": "550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "service": "CMS Article Access",
    "description": "Access premium article content for 0.1 USDC"
  }
}
```

---

## Budget Management

### GET /api/budget/:pubkey

Check current budget for a wallet address.

**Access Level**: Free
**Rate Limit**: Budget-specific limits

**Path Parameters**:
- `pubkey` (string): Solana wallet public key

**Response**:
```json
{
  "pubkey": "11111111111111111111111111111112",
  "currentBudget": 5.25,
  "currency": "USDC"
}
```

### POST /api/budget/deposit/confirm

Confirm and process a budget deposit transaction.

**Access Level**: Free
**Rate Limit**: Payment-specific limits

**Request Body**:
```json
{
  "signature": "5j7s8...",
  "reference": "550e8400-e29b-41d4-a716-446655440000",
  "payerPubkey": "11111111111111111111111111111112",
  "amount": 10.00
}
```

**Fields**:
- `signature` (string): Transaction signature
- `reference` (string): UUID reference from transaction memo
- `payerPubkey` (string): Payer's wallet public key
- `amount` (number): Deposit amount in tokens

**Success Response**:
```json
{
  "success": true,
  "newBudget": 10.00,
  "depositAmount": 10.00
}
```

**Error Response**:
```json
{
  "error": "Budget deposit verification failed: Invalid transaction signature"
}
```

---

## Pricing

### GET /api/pricing

Get current pricing configuration.

**Access Level**: Free
**Rate Limit**: General limits apply

**Response**:
```json
{
  "pricing": {
    "articleCost": 0.10,
    "currencySymbol": "$",
    "currencyName": "USDC",
    "budgetDepositMinimum": 0.50,
    "budgetDepositMaximum": 1000.00
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Agent Tools Integration

### GET /api/agent/tools

Get available tools for AI agent integration.

**Access Level**: Free
**Rate Limit**: General limits apply

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
    "cost": 0.10
  }
]
```

---

## Rate Limiting

The API implements multiple rate limiters:

### Rate Limit Categories

1. **General Rate Limit**: Applies to all requests
   - Window: 15 minutes
   - Max requests: 200

2. **Payment Rate Limit**: Payment processing endpoints
   - Window: 15 minutes
   - Max requests: 10

3. **Budget Rate Limit**: Budget management endpoints
   - Window: 15 minutes
   - Max requests: 30

4. **Article Rate Limit**: Article-related endpoints
   - Window: 15 minutes
   - Max requests: 50

### Rate Limit Headers

All responses include rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Rate Limit Exceeded Response (429):

```json
{
  "error": "Too many requests",
  "retryAfter": 60,
  "limit": 100,
  "remaining": 0,
  "reset": 1640995200
}
```

---

## Error Handling

### Error Response Format

All errors return consistent structure:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "details": {}  // Additional error context (optional)
}
```

### Common Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid input data |
| 401 | PAYMENT_VERIFICATION_FAILED | Transaction verification failed |
| 401 | INSUFFICIENT_BUDGET | Budget insufficient for access |
| 401 | REPLAY_ATTACK | Transaction already used |
| 402 | PAYMENT_REQUIRED | Payment required for access |
| 404 | ARTICLE_NOT_FOUND | Article does not exist |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_SERVER_ERROR | Unexpected server error |

### Specific Error Examples

**Article Not Found (404)**:
```json
{
  "error": "Article not found",
  "code": "ARTICLE_NOT_FOUND",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Invalid Payment (401)**:
```json
{
  "error": "Invalid payment: Incorrect token amount. Received: 100000, Required: 1000000",
  "code": "PAYMENT_VERIFICATION_FAILED",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Validation Error (400)**:
```json
{
  "error": "Invalid transaction signature format",
  "code": "VALIDATION_ERROR",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "field": "signature"
}
```

---

## Examples

### JavaScript/Node.js

```javascript
// Get articles list
const response = await fetch('http://localhost:3001/api/articles');
const { articles } = await response.json();

// Get article with budget authentication
const articleResponse = await fetch('http://localhost:3001/api/articles/my-article', {
  headers: {
    'x402-payer-pubkey': '11111111111111111111111111111112'
  }
});
```

### Python

```python
import requests

# Get articles list
response = requests.get('http://localhost:3001/api/articles')
articles = response.json()['articles']

# Check budget
budget_response = requests.get('http://localhost:3001/api/budget/11111111111111111111111111111112')
budget_data = budget_response.json()
```

### curl

```bash
# Health check
curl http://localhost:3001/api/health

# Get articles
curl http://localhost:3001/api/articles

# Get article with budget
curl -H "x402-payer-pubkey: 11111111111111111111111111111112" \
     http://localhost:3001/api/articles/my-article

# Confirm budget deposit
curl -X POST http://localhost:3001/api/budget/deposit/confirm \
     -H "Content-Type: application/json" \
     -d '{
       "signature": "5j7s8...",
       "reference": "550e8400-e29b-41d4-a716-446655440000",
       "payerPubkey": "11111111111111111111111111111112",
       "amount": 10.00
     }'
```

---

## SDKs and Libraries

While no official SDKs are provided, the API is designed to work with standard HTTP clients. The payment verification logic can be implemented using the Solana Web3.js libraries.

For x402 payment integration, refer to the [x402 protocol documentation](https://x402.org) for implementation details.

---

## WebSocket Support

Current version does not support WebSocket connections. Real-time updates can be implemented through polling or webhooks in future versions.

---

## API Versioning

Current API version: **v1**

Version is specified in the URL path: `/api/v1/...`

Future versions will maintain backward compatibility where possible. Deprecation notices will be provided in advance.

---

## Testing

For testing with mock payments, use the Solana devnet and test USDC tokens. The system includes comprehensive validation to prevent mainnet-testnet cross-contamination.

---

*Last updated: January 2024*