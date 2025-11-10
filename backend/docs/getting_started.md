# Getting Started Guide

Welcome to the CMS x402 Backend! This comprehensive guide will help you set up, configure, and run the system from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Running the Application](#running-the-application)
5. [Adding Content](#adding-content)
6. [Testing Payments](#testing-payments)
7. [Integration Examples](#integration-examples)
8. [Troubleshooting](#troubleshooting)
9. [Next Steps](#next-steps)

## Prerequisites

### System Requirements

- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher (or yarn 1.22+)
- **Git**: For version control
- **Text Editor**: VS Code recommended (with TypeScript support)

### Optional Tools

- **Solana CLI**: For blockchain development and testing
- **Phantom Wallet**: Browser wallet for testing payments
- **Postman**: For API testing
- **SQLite Browser**: For local database inspection

### Platform Support

- **macOS**: Fully supported
- **Linux**: Fully supported
- **Windows**: Supported with WSL2 recommended

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd x402-new/backend
```

### 2. Install Dependencies

```bash
# Using npm (recommended)
npm install

# Or using yarn
yarn install
```

### 3. Verify Installation

```bash
# Check TypeScript compilation
npm run build

# Verify dependencies
npm list --depth=0
```

### 4. Set Up Environment

```bash
# Copy environment template
cp .env.example .env
```

## Configuration

### 1. Basic Configuration

Edit the `.env` file with your settings:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Solana Blockchain Configuration
SOLANA_NETWORK=devnet

# Token Configuration (Devnet USDC)
SPL_TOKEN_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# IMPORTANT: Set your actual wallet address
MY_WALLET_ADDRESS=YOUR_RECIPIENT_WALLET_ADDRESS_HERE

# Content Configuration
ARTICLES_PATH=./articles

# Development Settings
LOG_LEVEL=info
DEBUG=cms:*

# Security Settings
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 2. Set Up Solana Wallet

#### Get a Solana Wallet

1. **Install Phantom Wallet** (browser extension)
   - Visit [phantom.app](https://phantom.app/)
   - Install the browser extension
   - Create a new wallet or import existing one

2. **Get Your Wallet Address**
   - Open Phantom wallet
   - Copy your public key (address)
   - It should look like: `11111111111111111111111111111112`

#### Configure Wallet Address

```env
# Replace with your actual wallet address
MY_WALLET_ADDRESS=11111111111111111111111111111112
```

⚠️ **Critical**: You must set a real wallet address to receive payments. Test addresses will not work for actual transactions.

### 3. (Optional) Configure Production Storage

For development, the system uses in-memory storage. For production, configure Vercel KV:

```env
# Production Storage (Vercel KV)
KV_REST_API_URL=https://your-kv-url.vercel.app
KV_REST_API_TOKEN=your-kv-token
```

### 4. Advanced Configuration

Customize additional settings as needed:

```env
# Payment Configuration
DEFAULT_ARTICLE_COST=0.10
BUDGET_DEPOSIT_MINIMUM=0.50
BUDGET_DEPOSIT_MAXIMUM=1000.00
PAYMENT_DESCRIPTION=CMS Article Access

# Currency Configuration
CURRENCY_SYMBOL=$
CURRENCY_NAME=USDC

# Rate Limiting
RATE_LIMIT_GENERAL_MAX=200
RATE_LIMIT_PAYMENT_MAX=10
RATE_LIMIT_BUDGET_MAX=30
RATE_LIMIT_ARTICLE_MAX=50

# Cache Configuration
CACHE_TTL=300000
BUDGET_TTL=300000
```

## Running the Application

### 1. Development Mode

Start the development server with hot reload:

```bash
npm run dev
```

You should see output like:
```
🚀 CMS x402 Backend started successfully!
{
  "port": 3001,
  "environment": "development",
  "articlesPath": "./articles",
  "splToken": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  "recipientWallet": "11111111111111111111111111111112"
}
🔗 API Health Check: http://localhost:3001/api/health
📖 API Documentation:
   • GET /api/articles - List all articles (FREE)
   • GET /api/articles/:id/preview - Article preview (FREE)
   • GET /api/articles/:id - Full article (PAID)
```

### 2. Production Mode

Compile TypeScript and run production server:

```bash
# Build the application
npm run build

# Start production server
npm start
```

### 3. Verify Installation

Test that the server is running correctly:

```bash
# Health check
curl http://localhost:3001/api/health

# Expected response:
# {
#   "status": "healthy",
#   "service": "CMS x402 Backend",
#   "timestamp": "2024-01-01T00:00:00.000Z",
#   "config": {
#     "network": "devnet",
#     "token": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
#     "articlesPath": "./articles"
#   }
# }
```

## Adding Content

### 1. Create Articles Directory

```bash
# Create directory if it doesn't exist
mkdir -p articles
```

### 2. Create Your First Article

Create a file `articles/my-first-article.md`:

```markdown
---
title: "My First Premium Article"
author: "Your Name"
date: "2024-01-01"
excerpt: "A comprehensive guide to getting started with our premium content platform."
tags: ["tutorial", "getting-started", "premium"]
price: 0.10
currencySymbol: "$"
currencyName: "USDC"
---

# My First Premium Article

Welcome to this premium article where we explore advanced topics in content management systems.

## Introduction

This article demonstrates the power of combining traditional content management with modern blockchain payments.

## Key Features

### Decentralized Payments

Our system uses the Solana blockchain to process payments instantly and securely.

### Budget Management

Users can pre-fund their accounts for seamless content access without per-article payment friction.

### Content Quality

Premium content ensures high-quality, well-researched articles that provide real value.

## Getting Started

To access premium content like this article, users need:

1. A Solana wallet (like Phantom)
2. USDC tokens on devnet for testing
3. Understanding of the x402 payment protocol

## Advanced Topics

### Payment Flow

The payment process involves several steps:

1. **Budget Check**: System checks if user has pre-paid budget
2. **Transaction Verification**: If no budget, verify on-chain payment
3. **Access Grant**: Grant immediate access upon successful payment
4. **Content Delivery**: Serve premium content instantly

### Security Considerations

Our system implements multiple security layers:

- Transaction replay prevention
- Input validation and sanitization
- Rate limiting per endpoint type
- Secure file access patterns

## Conclusion

This article has introduced you to the fundamentals of our premium content platform. In future articles, we'll explore more advanced topics including API integration, custom payment flows, and content monetization strategies.

---

*Thank you for reading! Your support enables us to continue creating high-quality content.*
```

### 3. Create Additional Articles

Create more articles to test the system:

`articles/blockchain-basics.md`:
```markdown
---
title: "Blockchain Basics for Content Creators"
author: "Tech Writer"
date: "2024-01-02"
excerpt: "Understanding blockchain technology and its applications in content management."
tags: ["blockchain", "cryptocurrency", "content"]
---

# Blockchain Basics for Content Creators

Blockchain technology is revolutionizing how content creators monetize their work...

[Rest of article content]
```

### 4. Test Article Loading

```bash
# List all articles
curl http://localhost:3001/api/articles

# Get article preview
curl http://localhost:3001/api/articles/my-first-article/preview

# Try to get full article (should require payment)
curl http://localhost:3001/api/articles/my-first-article
```

## Testing Payments

### 1. Get Test USDC Tokens

#### Using Solana CLI

```bash
# Install Solana CLI (if not already installed)
sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"

# Configure for devnet
solana config set --url devnet

# Get your wallet address
solana address

# Request test USDC (if available through faucet)
solana airdrop 2
```

#### Using Discord Faucet

1. Join the [Solana Discord](https://discord.gg/solana)
2. Visit the `#devnet-faucet` channel
3. Type `!faucet your-wallet-address`
4. Request SOL for transaction fees

#### Using Web Faucet

Visit [solfa.io](https://solfa.io/) for devnet SOL faucet.

### 2. Set Up Phantom Wallet

1. **Install Phantom Wallet** browser extension
2. **Create/Import Wallet**
3. **Switch to Devnet**:
   - Click the Phantom icon
   - Click the network selector (top left)
   - Select "Devnet"
4. **Get Test Tokens**:
   - Use devnet faucet to get SOL for fees
   - Find USDC faucet for devnet tokens

### 3. Test Budget Deposit

#### Step 1: Check Current Budget

```bash
# Replace with your actual wallet address
curl http://localhost:3001/api/budget/11111111111111111111111111111112
```

#### Step 2: Make a Deposit Transaction

You'll need to create a Solana transaction that:
1. Transfers USDC tokens to your configured recipient wallet
2. Includes a UUID reference in the transaction memo
3. Uses the correct token mint address

#### Step 3: Confirm the Deposit

```bash
# Confirm the deposit (replace with actual transaction data)
curl -X POST http://localhost:3001/api/budget/deposit/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "signature": "5j7s8...",
    "reference": "550e8400-e29b-41d4-a716-446655440000",
    "payerPubkey": "11111111111111111111111111111112",
    "amount": 1.00
  }'
```

### 4. Test Article Access with Budget

```bash
# Access article using budget
curl -H "x402-payer-pubkey: 11111111111111111111111111111112" \
     http://localhost:3001/api/articles/my-first-article
```

## Integration Examples

### 1. JavaScript/Node.js Integration

```javascript
// Example: Node.js client
const axios = require('axios');

class CMSClient {
  constructor(baseURL = 'http://localhost:3001') {
    this.baseURL = baseURL;
  }

  async getArticles() {
    const response = await axios.get(`${this.baseURL}/api/articles`);
    return response.data.articles;
  }

  async getArticlePreview(articleId) {
    const response = await axios.get(`${this.baseURL}/api/articles/${articleId}/preview`);
    return response.data;
  }

  async getArticleWithBudget(articleId, payerPubkey) {
    const response = await axios.get(`${this.baseURL}/api/articles/${articleId}`, {
      headers: {
        'x402-payer-pubkey': payerPubkey
      }
    });
    return response.data;
  }

  async checkBudget(pubkey) {
    const response = await axios.get(`${this.baseURL}/api/budget/${pubkey}`);
    return response.data;
  }

  async confirmBudgetDeposit(signature, reference, payerPubkey, amount) {
    const response = await axios.post(`${this.baseURL}/api/budget/deposit/confirm`, {
      signature,
      reference,
      payerPubkey,
      amount
    });
    return response.data;
  }
}

// Usage example
const client = new CMSClient();

async function example() {
  // Get articles list
  const articles = await client.getArticles();
  console.log('Available articles:', articles);

  // Get article preview
  const preview = await client.getArticlePreview('my-first-article');
  console.log('Article preview:', preview);

  // Check budget
  const budget = await client.checkBudget('11111111111111111111111111111112');
  console.log('Current budget:', budget);

  // Access premium content (if budget available)
  if (budget.currentBudget > 0) {
    const article = await client.getArticleWithBudget('my-first-article', '11111111111111111111111111111112');
    console.log('Full article:', article);
  }
}

example().catch(console.error);
```

### 2. Python Integration

```python
import requests
import json

class CMSClient:
    def __init__(self, base_url='http://localhost:3001'):
        self.base_url = base_url

    def get_articles(self):
        response = requests.get(f'{self.base_url}/api/articles')
        return response.json()['articles']

    def get_article_preview(self, article_id):
        response = requests.get(f'{self.base_url}/api/articles/{article_id}/preview')
        return response.json()

    def get_article_with_budget(self, article_id, payer_pubkey):
        headers = {'x402-payer-pubkey': payer_pubkey}
        response = requests.get(f'{self.base_url}/api/articles/{article_id}', headers=headers)
        return response.json()

    def check_budget(self, pubkey):
        response = requests.get(f'{self.base_url}/api/budget/{pubkey}')
        return response.json()

    def confirm_budget_deposit(self, signature, reference, payer_pubkey, amount):
        data = {
            'signature': signature,
            'reference': reference,
            'payerPubkey': payer_pubkey,
            'amount': amount
        }
        response = requests.post(f'{self.base_url}/api/budget/deposit/confirm', json=data)
        return response.json()

# Usage example
client = CMSClient()

# Get articles
articles = client.get_articles()
print(f"Found {len(articles)} articles")

# Check budget
budget = client.check_budget('11111111111111111111111111111112')
print(f"Current budget: {budget['currentBudget']} {budget['currency']}")
```

### 3. Frontend Integration (React Example)

```jsx
import React, { useState, useEffect } from 'react';

function ArticleReader() {
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [budget, setBudget] = useState(0);
  const [walletAddress, setWalletAddress] = useState('');

  // Load articles on component mount
  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/articles');
      const data = await response.json();
      setArticles(data.articles);
    } catch (error) {
      console.error('Error loading articles:', error);
    }
  };

  const checkBudget = async (pubkey) => {
    try {
      const response = await fetch(`http://localhost:3001/api/budget/${pubkey}`);
      const data = await response.json();
      setBudget(data.currentBudget);
    } catch (error) {
      console.error('Error checking budget:', error);
    }
  };

  const loadArticle = async (articleId) => {
    try {
      const headers = walletAddress ? { 'x402-payer-pubkey': walletAddress } : {};
      const response = await fetch(`http://localhost:3001/api/articles/${articleId}`, { headers });

      if (response.status === 402) {
        const invoice = await response.json();
        console.log('Payment required:', invoice);
        // Handle payment flow here
        return;
      }

      const article = await response.json();
      setSelectedArticle(article);
    } catch (error) {
      console.error('Error loading article:', error);
    }
  };

  return (
    <div>
      <h1>CMS Article Reader</h1>

      {/* Wallet Connection */}
      <div>
        <input
          type="text"
          placeholder="Enter your wallet address"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
        />
        <button onClick={() => checkBudget(walletAddress)}>Check Budget</button>
        {budget > 0 && <p>Current Budget: ${budget} USDC</p>}
      </div>

      {/* Articles List */}
      <div>
        <h2>Available Articles</h2>
        {articles.map(article => (
          <div key={article.id}>
            <h3>{article.title}</h3>
            <p>{article.excerpt}</p>
            <button onClick={() => loadArticle(article.id)}>
              Read Article {article.isPremium ? '(Premium)' : '(Free)'}
            </button>
          </div>
        ))}
      </div>

      {/* Article Content */}
      {selectedArticle && (
        <div>
          <h2>{selectedArticle.title}</h2>
          <div dangerouslySetInnerHTML={{ __html: selectedArticle.htmlContent }} />
        </div>
      )}
    </div>
  );
}

export default ArticleReader;
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Wallet Address Not Set

**Error**: `MY_WALLET_ADDRESS environment variable not set or using placeholder value`

**Solution**:
```env
# Set your actual wallet address in .env
MY_WALLET_ADDRESS=11111111111111111111111111111112
```

#### 2. Articles Not Found

**Error**: `404 Article not found`

**Solutions**:
- Verify `ARTICLES_PATH` is correct in `.env`
- Check that markdown files exist in the articles directory
- Ensure files have valid front matter metadata
- Verify file names contain only valid characters

#### 3. Transaction Verification Fails

**Error**: `Payment verification failed: Invalid transaction signature`

**Solutions**:
- Ensure you're using devnet tokens for devnet configuration
- Verify transaction is confirmed on blockchain
- Check that reference memo matches exactly
- Validate recipient wallet address is correct

#### 4. CORS Errors

**Error**: `CORS policy error` in browser

**Solution**:
```env
# Update CORS origins in .env
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://your-frontend-domain.com
```

#### 5. Rate Limiting

**Error**: `429 Too many requests`

**Solutions**:
- Wait for rate limit to reset (15 minutes)
- Increase rate limits in configuration for development
- Implement proper request throttling in client

#### 6. Memory Issues

**Error**: `JavaScript heap out of memory`

**Solutions**:
- Reduce `CACHE_TTL` configuration
- Limit number of articles processed at once
- Increase Node.js memory limit: `node --max-old-space-size=4096`

### Debug Mode

Enable detailed logging for troubleshooting:

```env
# Enable debug logging
DEBUG=cms:*
LOG_LEVEL=debug
NODE_ENV=development
```

### Health Checks

Regularly check system health:

```bash
# Overall health
curl http://localhost:3001/api/health

# Pricing information
curl http://localhost:3001/api/pricing

# Agent tools availability
curl http://localhost:3001/api/agent/tools
```

## Next Steps

### 1. Production Deployment

- Configure production environment variables
- Set up Vercel KV or Redis for storage
- Configure proper CORS origins
- Set up monitoring and logging
- Configure SSL/TLS certificates

### 2. Advanced Features

- Custom pricing tiers
- Subscription models
- Content analytics
- User authentication
- Content recommendations
- Multi-language support

### 3. Integration Options

- Frontend frameworks (React, Vue, Angular)
- Mobile applications (React Native, Flutter)
- Headless CMS integration
- E-commerce platforms
- Learning management systems

### 4. Scaling Considerations

- Load balancing with multiple instances
- CDN integration for content delivery
- Database optimization
- Caching strategies
- Monitoring and alerting

### 5. Security Enhancements

- Content Security Policy (CSP)
- Additional input validation
- Rate limiting per user
- Audit logging
- Security monitoring

## Additional Resources

### Documentation

- [API Reference](./api_reference.md)
- [Architecture Documentation](./architecture.md)
- [Modules Documentation](./modules.md)

### External Resources

- [Solana Documentation](https://docs.solana.com/)
- [x402 Protocol](https://x402.org/)
- [Express.js Guide](https://expressjs.com/en/guide/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Community

- [Solana Discord](https://discord.gg/solana)
- [GitHub Repository](https://github.com/your-repo)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/solana)

---

Congratulations! You've successfully set up and configured the CMS x402 Backend. You're now ready to explore the world of blockchain-powered content management. If you encounter any issues or have questions, refer to the troubleshooting section or reach out to the community for support.

Happy building! 🚀