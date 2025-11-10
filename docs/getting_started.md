# Getting Started Guide

Welcome to X402 Drift! This guide will walk you through setting up and running the blockchain-powered content monetization platform from scratch.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18 or higher)
- **npm** (version 8 or higher) or **yarn**
- **Git** for version control
- **Solana Wallet** (Phantom, Solflare, or compatible wallet)
- **Basic understanding** of React, Node.js, and blockchain concepts

## Installation Guide

### 1. Clone the Repository

```bash
git clone <repository-url>
cd x402-new
```

### 2. Set Up the Backend

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
```

### 3. Set Up the Frontend

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
```

## Configuration

### Backend Configuration

Create a `.env` file in the `backend/` directory:

```bash
cd backend
touch .env
```

Add the following environment variables to your `.env` file:

```env
# Solana Configuration
SOLANA_NETWORK=devnet
MY_WALLET_ADDRESS=<your-solana-wallet-address>
SPL_TOKEN_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# API Configuration
PORT=3001
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Content Directory
ARTICLES_PATH=./articles

# Optional: Production Database
# KV_REST_API_URL=<your-vercel-kv-url>
# KV_REST_API_TOKEN=<your-vercel-kv-token>
```

#### Important Configuration Notes:

**MY_WALLET_ADDRESS**: Replace `<your-solana-wallet-address>` with your actual Solana wallet address. This is where payments will be sent.

**Getting Your Wallet Address**:
1. Install Phantom or Solflare wallet browser extension
2. Create or import your wallet
3. Copy your wallet address (starts with "9...", "7...", etc.)

**SPL_TOKEN_MINT**:
- For devnet: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` (USDC)
- For mainnet: Use the appropriate USDC mint address

### Frontend Configuration

Create a `.env` file in the `frontend/` directory:

```bash
cd frontend
touch .env
```

Add the following environment variable:

```env
VITE_API_URL=http://localhost:3001
```

## Getting Test Tokens

For development on devnet, you'll need test USDC tokens:

1. **Visit a Solana Faucet**:
   - Go to [Solana Devnet Faucet](https://faucet.solana.com/)
   - Enter your wallet address
   - Request SOL for transaction fees

2. **Get Test USDC**:
   - Visit [USDC Devnet Faucet](https://usdcfaucet.com/)
   - Connect your wallet
   - Request test USDC tokens

## Running the Application

### Start the Backend

In your backend terminal:

```bash
npm run dev
```

You should see output similar to:
```
🚀 CMS x402 Backend started successfully!
🔗 API Health Check: http://localhost:3001/api/health
📖 API Documentation:
   • GET /api/articles - List all articles (FREE)
   • GET /api/articles/:id/preview - Article preview (FREE)
   • GET /api/articles/:id - Full article (PAID)
```

### Start the Frontend

In your frontend terminal:

```bash
npm run dev
```

The frontend should open automatically at `http://localhost:5173`

### Verify the Setup

1. **Check Backend Health**: Open `http://localhost:3001/api/health` in your browser
2. **Check Frontend**: Navigate to `http://localhost:5173`
3. **Connect Wallet**: Click the wallet connect button in the top-right corner

## Creating Your First Article

### 1. Create an Article File

Navigate to the backend articles directory:

```bash
cd backend/articles
```

Create a new markdown file, for example `my-first-article.md`:

```markdown
---
title: "My First Premium Article"
author: "Your Name"
date: "2024-01-15"
excerpt: "This is my first article on the X402 platform, exploring blockchain-powered content monetization."
tags: ["blockchain", "content", "monetization"]
price: 0.01
currencySymbol: "$"
currencyName: "USDC"
---

# My First Premium Article

Welcome to my first article on the X402 platform! This article demonstrates how content creators can monetize their work using blockchain technology.

## What Makes This Special?

This platform leverages the Solana blockchain to enable seamless micropayments for content. Readers can access premium articles by paying with USDC tokens, making content monetization direct and efficient.

## The Technology Stack

- **Backend**: Node.js with Express and TypeScript
- **Frontend**: React with Tailwind CSS
- **Blockchain**: Solana with SPL tokens
- **Payment Protocol**: x402 HTTP payments

## Getting Started

To start your own content monetization journey, follow the setup guide in the documentation...

---

Thank you for reading! Consider exploring other articles on the platform.
```

### 2. Verify Article Processing

The backend automatically detects new articles. You can verify this by:

1. Visiting `http://localhost:3001/api/articles`
2. You should see your new article in the list

## Testing the Payment System

### 1. Test Free Content

1. Navigate to the frontend
2. Click on any article in the "Free Articles" tab
3. The article should open immediately without payment

### 2. Test Premium Content

1. Navigate to the "Premium Articles" tab
2. Click on a premium article (marked with "PREMIUM" badge)
3. Connect your wallet if not already connected
4. Approve the payment transaction
5. The article should open after payment confirmation

### 3. Test Budget System

1. Use the "Articles Agent" component
2. Enter a deposit amount (e.g., 0.01 USDC)
3. Click "Top-up" to add funds to your budget
4. Access premium articles without individual payments

## Common Setup Issues

### Backend Issues

**Port Already in Use**:
```bash
Error: listen EADDRINUSE :::3001
```
- Solution: Change the PORT in your `.env` file or kill the process using the port

**Wallet Address Not Set**:
```bash
WARNING: No recipient wallet configured!
```
- Solution: Set `MY_WALLET_ADDRESS` in your `.env` file

**CORS Issues**:
- Solution: Ensure `CORS_ORIGINS` includes your frontend URL

### Frontend Issues

**API Connection Failed**:
- Solution: Verify `VITE_API_URL` matches your backend URL
- Check that the backend is running on the correct port

**Wallet Connection Issues**:
- Solution: Ensure your wallet extension is installed and unlocked
- Try refreshing the page and reconnecting

**Payment Transaction Fails**:
- Solution: Ensure you have sufficient SOL for gas fees
- Verify you have enough USDC tokens for the article price

## Development Workflow

### Making Changes

**Frontend Changes**:
```bash
cd frontend
# Make your changes
npm run dev  # Changes auto-reload
```

**Backend Changes**:
```bash
cd backend
# Make your changes
npm run dev  # Server auto-restarts
```

### Adding New Articles

1. Create new markdown files in `backend/articles/`
2. Add frontmatter metadata
3. The system automatically detects new content
4. Refresh the frontend to see new articles

### Testing Payments

For comprehensive testing:

1. **Test Budget Deposits**: Deposit funds and verify budget updates
2. **Test Individual Payments**: Purchase articles without budget
3. **Test Error Cases**: Insufficient funds, invalid transactions, etc.
4. **Test Wallet Scenarios**: Connect/disconnect, different wallets

## Next Steps

Once you have the basic setup running:

1. **Customize the UI**: Modify the React components to match your brand
2. **Add Your Content**: Create more articles with your own content
3. **Configure Pricing**: Adjust article prices in the frontmatter
4. **Set Up Production**: Deploy to production hosting

## Deployment Preparation

### Production Environment Variables

For production deployment, update your environment variables:

```env
# Production Configuration
NODE_ENV=production
SOLANA_NETWORK=mainnet
CORS_ORIGINS=https://yourdomain.com

# Production URLs
VITE_API_URL=https://your-api-domain.com

# Optional: Production Database
KV_REST_API_URL=your-production-kv-url
KV_REST_API_TOKEN=your-production-kv-token
```

### Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **Wallet Security**: Use a dedicated wallet for receiving payments
3. **API Security**: Use proper CORS origins in production
4. **Rate Limiting**: Configure appropriate rate limits for your traffic

## Troubleshooting

### Check Logs

**Backend Logs**:
```bash
cd backend
npm run dev  # Shows real-time logs
```

**Frontend Logs**: Open browser developer console (F12)

### Common Error Messages

**"Wallet not connected"**:
- Ensure your wallet extension is installed and unlocked
- Click the wallet connect button

**"Invalid transaction signature"**:
- The transaction may have failed or was cancelled
- Try the payment again

**"Insufficient budget"**:
- Deposit more funds using the budget top-up feature
- Or pay per article directly

**"Article not found"**:
- Check if the article file exists in `backend/articles/`
- Verify the filename matches the slug

### Getting Help

If you encounter issues not covered here:

1. Check the [Architecture Documentation](./architecture.md)
2. Review the [API Reference](./api_reference.md)
3. Search existing GitHub issues
4. Create a new issue with detailed error information

## Success! 🎉

Congratulations! You now have a fully functional blockchain-powered content monetization platform running locally. You can:

- Create and manage premium articles
- Receive payments in USDC tokens
- Provide users with seamless payment experiences
- Scale to thousands of users with the built-in architecture

Happy content monetization!