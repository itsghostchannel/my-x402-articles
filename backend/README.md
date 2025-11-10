# CMS x402 Backend

A Node.js/TypeScript Content Management System backend with x402 micro-payment integration for Solana blockchain payments. This system enables paid access to premium content through SPL token payments with budget management capabilities.

## 🚀 Features

- **Content Management**: Markdown-based article system with metadata support
- **x402 Payments**: Solana blockchain integration with SPL token payments
- **Budget System**: Pre-paid budget functionality for seamless content access
- **Security**: Comprehensive validation, rate limiting, and CORS protection
- **Performance**: Caching, parallel processing, and optimized article serving
- **Developer Tools**: RESTful API with comprehensive agent tool integration

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Solana wallet (for receiving payments)
- Git

## 🛠 Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Blockchain**: Solana Web3.js (@solana/kit)
- **Database**: SQLite (in-memory) with Vercel KV support
- **Content**: Markdown processing with gray-matter
- **Security**: Input validation, rate limiting, CORS
- **Logging**: Pino structured logging
- **Development**: ts-node-dev, TypeScript

## 📁 Project Structure

```
backend/
├── app.ts                    # Main Express application
├── article-service.ts        # Article management and processing
├── config.ts                 # Configuration management
├── error-handler.ts          # Centralized error handling
├── logger.ts                 # Structured logging setup
├── paywall.ts                # x402 payment middleware
├── pricing.ts                # Payment pricing configuration
├── rate-limiter.ts           # API rate limiting
├── storage.ts                # Data storage abstraction
├── types.ts                  # TypeScript type definitions
├── validation.ts             # Input validation utilities
├── articles/                 # Markdown article files
├── migrations/               # Database migration files
├── .env.example              # Environment configuration template
└── package.json              # Dependencies and scripts
```

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd backend
npm install
```

### 2. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
# Required: Set your Solana wallet address
MY_WALLET_ADDRESS=YOUR_ACTUAL_SOLANA_WALLET_ADDRESS

# Optional: Customize other settings
PORT=3001
SOLANA_NETWORK=devnet
SPL_TOKEN_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
ARTICLES_PATH=./articles
```

⚠️ **Important**: You must set a real Solana wallet address in `MY_WALLET_ADDRESS` to receive payments.

### 3. Add Content

Create markdown files in the `articles/` directory:

```markdown
---
title: "Your Article Title"
author: "Author Name"
date: "2024-01-01"
excerpt: "Brief article description"
tags: ["tag1", "tag2"]
---

# Your Article Content

Your premium content goes here...
```

### 4. Start Development Server

```bash
npm run dev
```

The server will start at `http://localhost:3001`

### 5. Verify Installation

```bash
curl http://localhost:3001/api/health
```

## 📚 API Documentation

### Core Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| GET | `/api/health` | Service health check | Free |
| GET | `/api/articles` | List all articles with metadata | Free |
| GET | `/api/articles/:id/preview` | Article preview without full content | Free |
| GET | `/api/articles/:id` | Full article content | Paid |
| GET | `/api/pricing` | Current pricing information | Free |
| GET | `/api/budget/:pubkey` | Check budget for wallet | Free |
| POST | `/api/budget/deposit/confirm` | Confirm budget deposit | Free |

### Agent Tools Integration

```bash
GET /api/agent/tools
```

Returns available tools for AI agent integration:
- `get_all_articles` - List articles (Free)
- `get_article_preview` - Article preview (Free)
- `get_article_free` - Free articles (Free)
- `get_article` - Full articles (Paid)

## 💳 Payment System

### Payment Flow

1. **Budget Check**: System first checks user's pre-paid budget
2. **Direct Payment**: If no budget, requires x402 payment transaction
3. **Access Granted**: Upon successful payment, immediate content access

### Supported Tokens

- **Devnet**: USDC (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`)
- **Mainnet**: USDC (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`)

### Payment Methods

1. **Budget System**: Pre-deposit funds for seamless access
2. **x402 Protocol**: Direct transaction verification for single access

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `NODE_ENV` | development | Environment mode |
| `SOLANA_NETWORK` | devnet | Solana network (devnet/mainnet) |
| `SPL_TOKEN_MINT` | Devnet USDC | SPL token mint address |
| `MY_WALLET_ADDRESS` | Required | Recipient wallet address |
| `ARTICLES_PATH` | ./articles | Articles directory path |
| `KV_REST_API_URL` | - | Vercel KV URL (optional) |
| `KV_REST_API_TOKEN` | - | Vercel KV token (optional) |

### Pricing Configuration

```typescript
// pricing.ts
export const pricing = {
  ARTICLE_COST: 0.10,           // Cost per article in USDC
  CURRENCY_SYMBOL: '$',         // Display symbol
  CURRENCY_NAME: 'USDC',        // Currency name
  BUDGET_DEPOSIT_MINIMUM: 0.50, // Minimum deposit
  BUDGET_DEPOSIT_MAXIMUM: 1000.00 // Maximum deposit
};
```

## 🛡 Security Features

- **Input Validation**: Comprehensive validation for all inputs
- **Rate Limiting**: Multiple rate limiters for different endpoint types
- **CORS Protection**: Configurable CORS origins
- **Path Traversal Prevention**: File access validation
- **Content Sanitization**: Markdown content security
- **Replay Attack Prevention**: Transaction reference tracking
- **Error Handling**: Centralized error processing

## 🔍 Monitoring & Logging

### Log Categories

- `payment`: Payment-related operations
- `budget`: Budget system operations
- `article`: Article processing
- `server`: Server operations

### Log Levels

- `error`: Critical errors
- `warn`: Warnings and non-critical issues
- `info`: General information
- `debug`: Detailed debugging

### Health Check

```bash
GET /api/health
```

Returns service status, configuration, and timestamp information.

## 🧪 Development

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Compile TypeScript
npm run start        # Start production server
npm run build:watch  # Watch and compile
```

### Code Quality

- TypeScript for type safety
- Comprehensive error handling
- Structured logging
- Input validation
- Rate limiting

## 📦 Production Deployment

### Environment Setup

1. Set production environment variables
2. Configure proper Solana network (mainnet)
3. Set up Vercel KV or Redis for storage
4. Configure CORS origins for your frontend
5. Set proper log levels

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["npm", "start"]
```

## 🐛 Troubleshooting

### Common Issues

1. **Wallet Not Receiving Payments**
   - Verify `MY_WALLET_ADDRESS` is correctly set
   - Ensure wallet is on correct network (devnet/mainnet)

2. **Transaction Verification Fails**
   - Check token mint address matches network
   - Verify transaction is confirmed
   - Ensure reference memo is correct

3. **Articles Not Loading**
   - Check `ARTICLES_PATH` configuration
   - Verify markdown file format
   - Ensure files have valid front matter

4. **Rate Limiting Issues**
   - Adjust rate limits in configuration
   - Check client IP and request patterns

### Debug Mode

```env
DEBUG=cms:*
LOG_LEVEL=debug
```

## 📄 License

[Your License Here]

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make your changes
4. Add tests if applicable
5. Submit pull request

## 📞 Support

For issues and questions:
- Create GitHub issue
- Check logs for detailed error information
- Verify environment configuration

---

**Built with ❤️ for the Solana ecosystem**