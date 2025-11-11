import cors from 'cors';
import dotenv from 'dotenv';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage';
import { address } from '@solana/kit';
import ArticleService from './article-service';
import { budgetLogger, logger } from './logger';
import { fetchMint } from '@solana-program/token';
import express, { Request, Response } from 'express';
import { errorHandler, asyncHandler } from './error-handler';
import { x402Paywall, budgetPaywall, verifyTransaction, requirePayment, rpc } from './paywall';
import { generalRateLimit, paymentRateLimit, budgetRateLimit, articleRateLimit } from './rate-limiter';
import { pricing, validateDepositAmount, getPricingInfo } from './pricing';

dotenv.config();

interface Config {
  splToken: string;
  recipientWallet: string | undefined;
  articlesPath: string;
}

interface AgentTool {
  id: string;
  description: string;
  endpoint: string;
  cost: number;
}

interface ExtendedRequest extends Request {
  x402_payment_method?: string;
  cms_access_granted?: boolean;
}

interface DepositRequestBody {
  signature: string;
  reference: string;
  payerPubkey: string;
  amount: number;
}

const app = express();
const corsOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'];

app.use(cors({
  origin: corsOrigins,
  exposedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(generalRateLimit);

// Configuration
const CONFIG: Config = {
  splToken: process.env.SPL_TOKEN_MINT || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC devnet
  recipientWallet: process.env.MY_WALLET_ADDRESS,
  articlesPath: process.env.ARTICLES_PATH || path.join(__dirname, "articles"),
};

// Validate required environment variables
if (!CONFIG.recipientWallet || CONFIG.recipientWallet === 'YOUR_RECIPIENT_WALLET_ADDRESS_HERE') {
  logger.warn('MY_WALLET_ADDRESS environment variable not set or using placeholder value');
  logger.warn('Please set your actual Solana wallet address in the .env file to receive payments');
}

if (process.env.NODE_ENV === 'development') {
  logger.info({
    articlesPath: CONFIG.articlesPath,
    splToken: CONFIG.splToken,
    recipientWallet: CONFIG.recipientWallet || 'NOT SET'
  }, 'Development mode enabled - configuration loaded');
}

// Initialize Article Service
const articleService = new ArticleService(CONFIG.articlesPath);

// Agent tools for CMS integration
const agentTools: AgentTool[] = [
  {
    id: "get_all_articles",
    description: "Get a list of all available articles with metadata",
    endpoint: "/api/agent/get-all-articles",
    cost: 0, // Free access
  },
  {
    id: "get_article_preview",
    description: "Get article preview without full content",
    endpoint: "/api/agent/get-article-preview",
    cost: 0, // Free access
  },
  {
    id: "get_article_free",
    description: "Get free article content",
    endpoint: "/api/agent/get-article-free",
    cost: 0, // Free access
  },
  {
    id: "get_article",
    description: "Get full article content (requires payment)",
    endpoint: "/api/agent/get-article",
    cost: pricing.ARTICLE_COST,
  }
];


app.get("/api/agent/tools", (req: Request, res: Response) => {
  res.json(agentTools);
});

// Agent endpoints - these format responses for agent consumption
app.get("/api/agent/get-all-articles", articleRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const articles = await articleService.getArticlesList();

  // Format articles as a readable context for the agent with comprehensive information
  const articlesList = articles.map(article => {
    const statusInfo = article.isPremium
      ? `🔒 **Premium** • ${article.price} ${article.currencyName || 'USDC'}`
      : '✅ **Free**';

    return `**${article.title}**\n*${statusInfo} • ID: ${article.id} • by ${article.author} • ${article.readTime} min read • Published ${article.date}*\n\n${article.excerpt}`;
  }).join('\n\n---\n\n');

  const context = `## Found ${articles.length} articles:\n\n${articlesList}`;

  res.json({
    context,
    articles: articles,
    total: articles.length,
    paymentMethod: "free"
  });
}));

app.get("/api/agent/get-article-preview", articleRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const articleId = req.query.id as string;

  if (!articleId) {
    return res.status(400).json({ error: "Article ID required" });
  }

  const article = await articleService.getArticlePreview(articleId);

  if (!article) {
    return res.status(404).json({ error: "Article not found" });
  }

  const context = `Article Preview: ${article.title}\n\nAuthor: ${article.author}\nRead time: ${article.readTime} minutes\n\n${article.excerpt}\n\n${article.previewContent}`;

  res.json({
    context,
    article,
    paymentMethod: "free"
  });
}));

app.get("/api/agent/get-article-free", articleRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const articleId = req.query.id as string;

  if (!articleId) {
    return res.status(400).json({ error: "Article ID required" });
  }

  const article = await articleService.getArticle(articleId);

  if (!article) {
    return res.status(404).json({ error: "Article not found" });
  }

  const context = `Free Article: ${article.title}\n\nAuthor: ${article.author}\nRead time: ${article.readTime} minutes\n\n${article.previewContent}`;

  res.json({
    context,
    article,
    paymentMethod: "free"
  });
}));

app.get(
  "/api/agent/get-article",
  articleRateLimit,                          // 0. Rate limit first
  budgetPaywall({ amount: pricing.ARTICLE_COST, splToken: CONFIG.splToken }), // 1. Check budget first
  x402Paywall({ amount: pricing.ARTICLE_COST, splToken: CONFIG.splToken, recipientWallet: CONFIG.recipientWallet! }),  // 2. Fallback to 402
  requirePayment,                            // 3. Ensure payment was made
  asyncHandler(async (req: ExtendedRequest, res: Response) => {
    const articleId = req.query.id as string;

    if (!articleId) {
      return res.status(400).json({ error: "Article ID required" });
    }

    const article = await articleService.getArticle(articleId);

    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    // Format the article content similar to get_all_articles with better structure
    const statusInfo = article.isPremium
      ? `🔒 **Premium Article** • ${article.price} ${article.currencyName || 'USDC'}`
      : '✅ **Free Article**';

    const tagsInfo = article.tags.length > 0
      ? `**Tags:** ${article.tags.map(tag => `#${tag}`).join(' ')}`
      : '';

    const context = `# ${article.title}

${statusInfo}

**Author:** ${article.author}
**Read time:** ${article.readTime} minutes
**Published:** ${article.date}
${tagsInfo ? `${tagsInfo}\n` : ''}

---

${article.excerpt}

---

## Full Content

${article.fullContent}`;

    res.json({
      context,
      article,
      paymentMethod: req.x402_payment_method || "unknown"
    });
  })
);

app.get("/api/articles", articleRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const articles = await articleService.getArticlesList();
  res.json({
    articles,
    total: articles.length,
    timestamp: new Date().toISOString()
  });
}));

app.get("/api/articles/:id/preview", articleRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const article = await articleService.getArticlePreview(id);

  if (!article) {
    return res.status(404).json({ error: "Article not found" });
  }

  res.json(article);
}));

app.get(
  "/api/articles/:id",
  articleRateLimit,                          // 0. Rate limit first
  budgetPaywall({ amount: pricing.ARTICLE_COST, splToken: CONFIG.splToken }), // 1. Check budget first
  x402Paywall({ amount: pricing.ARTICLE_COST, splToken: CONFIG.splToken, recipientWallet: CONFIG.recipientWallet! }),  // 2. Fallback to 402
  requirePayment,                            // 3. Ensure payment was made
  asyncHandler(async (req: ExtendedRequest, res: Response) => {
    const { id } = req.params;
    const article = await articleService.getArticle(id);

    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    res.json({
      ...article,
      paymentMethod: req.x402_payment_method || "unknown",
      accessTimestamp: new Date().toISOString()
    });
  })
);

app.get("/api/budget/:pubkey", budgetRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const { pubkey } = req.params;
  const currentBudget = await storage.getBudget(pubkey);

  const mintAccount = await fetchMint(rpc, address(CONFIG.splToken));
  const budgetInTokens = Number(currentBudget) / Math.pow(10, mintAccount.data.decimals);

  res.json({
    pubkey,
    currentBudget: budgetInTokens,
    currency: "USDC"
  });
}));

app.get("/api/budget/:pubkey/balances", budgetRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const { pubkey } = req.params;
  const budgetBalances = await storage.getAllBudgetBalances(pubkey);

  // Transform the data to include normalized amounts
  const balancesWithTokenInfo = budgetBalances.map(balance => {
    const normalizedAmount = Number(balance.amount) / Math.pow(10, balance.decimal);

    return {
      walletAddress: balance.wallet_address,
      solanaCluster: balance.solana_cluster,
      amount: normalizedAmount,
      decimal: balance.decimal,
      tokenSymbol: balance.token_symbol,
      tokenMintAddress: balance.token_mint_address,
      createdAt: new Date(balance.created_at * 1000).toISOString()
    };
  });

  res.json({
    walletAddress: pubkey,
    budgetBalances: balancesWithTokenInfo,
    total: balancesWithTokenInfo.length,
    timestamp: new Date().toISOString()
  });
}));

app.post("/api/budget/deposit/confirm", paymentRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const { signature, reference, payerPubkey, amount }: DepositRequestBody = req.body;

  if (!signature || !reference || !payerPubkey || !amount) {
    return res.status(400).json({
      error: "Incomplete request (signature, reference, payerPubkey, amount required)"
    });
  }

  if (!CONFIG.recipientWallet) {
    return res.status(500).json({ error: "Recipient wallet not configured" });
  }

  const amountValidation = validateDepositAmount(amount);
  if (!amountValidation.isValid) {
    return res.status(400).json({ error: amountValidation.error });
  }

  const refKey = `ref_${reference}`;
  if (await storage.hasReference(refKey)) {
    return res.status(401).json({ error: "This budget deposit has already been claimed" });
  }

  const verification = await verifyTransaction(
    signature,
    reference,
    amount,
    CONFIG.splToken,
    CONFIG.recipientWallet!
  );

  const MINT_ADDRESS = address(CONFIG.splToken);
  const mintAccount = await fetchMint(rpc, MINT_ADDRESS);
  const claimedAmountSmallestUnit = BigInt(Math.floor(amount * Math.pow(10, mintAccount.data.decimals)));

  if (verification.success && verification.amountReceivedSmallestUnit === claimedAmountSmallestUnit) {
    try {
      // Use new SQLite functionality for top-up processing
      // Generate new memo format: TOPUP-UUIDv3
      const newMemoValue = `TOPUP-${uuidv4()}`;

      await storage.processTopUp({
        signatureId: signature,
        from: payerPubkey,
        to: CONFIG.recipientWallet!,
        solanaCluster: process.env.SOLANA_NETWORK === 'mainnet-beta' ? 'mainnet-beta' : 'devnet',
        amount: Number(verification.amountReceivedSmallestUnit),
        decimal: mintAccount.data.decimals,
        tokenSymbol: 'USDC',
        tokenMintAddress: CONFIG.splToken,
        memoValue: newMemoValue
      });

      // Add reference to prevent replay attacks
      await storage.addReference(refKey, { ex: 3600 });

      // Get updated budget
      const currentBudget = await storage.getBudget(payerPubkey);
      const newBudget = BigInt(currentBudget);

      budgetLogger.info({
        payer: payerPubkey,
        depositAmount: amount,
        totalBudget: newBudget.toString()
      }, "Budget deposit successful via SQLite");

      res.json({
        success: true,
        newBudget: Number(newBudget) / Math.pow(10, mintAccount.data.decimals),
        depositAmount: amount
      });
    } catch (sqliteError: any) {
      budgetLogger.warn({
        error: sqliteError.message,
        payer: payerPubkey,
        amount
      }, "SQLite top-up processing failed, falling back to legacy method");

      // Fallback to legacy method
      const currentBudget = BigInt(await storage.getBudget(payerPubkey));
      const depositAmount = verification.amountReceivedSmallestUnit!;
      const newBudget = currentBudget + depositAmount;

      await storage.setBudget(payerPubkey, newBudget.toString());
      await storage.addReference(refKey, { ex: 3600 });

      res.json({
        success: true,
        newBudget: Number(newBudget) / Math.pow(10, mintAccount.data.decimals),
        depositAmount: amount
      });
    }
  } else {
    let errorMsg = verification.error || "Unknown verification error";
    // Only check amount mismatch if verification succeeded but had wrong amount
    if (verification.success && typeof verification.amountReceivedSmallestUnit !== 'undefined') {
      if (verification.amountReceivedSmallestUnit !== claimedAmountSmallestUnit) {
        errorMsg = `Deposit amount mismatch. Received: ${verification.amountReceivedSmallestUnit}, Claimed: ${claimedAmountSmallestUnit}`;
      }
    } else if (!verification.success) {
      // If verification failed completely, use the error message from verification
      errorMsg = verification.error || "Transaction verification failed";
    }
    res.status(401).json({ error: `Budget deposit verification failed: ${errorMsg}` });
  }
}));

app.get("/api/pricing", (req: Request, res: Response) => {
  res.json({
    pricing: getPricingInfo(),
    timestamp: new Date().toISOString()
  });
});

// API endpoints for User Cockpit
app.get("/api/transfers", articleRateLimit, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { wallet, limit = 50, offset = 0 } = req.query;

    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({ error: "Wallet address required" });
    }

    const transfers = await storage.getTransfersByWallet(wallet, Number(limit));

    res.json({
      transfers,
      total: transfers.length,
      wallet,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: `Failed to fetch transfers: ${error.message}` });
  }
}));

app.get("/api/creator/stats", articleRateLimit, asyncHandler(async (req: Request, res: Response) => {
  try {
    if (!CONFIG.recipientWallet) {
      return res.status(500).json({ error: "Creator wallet not configured" });
    }

    // Get creator transfers
    const creatorTransfers = await storage.getTransfersByWallet(CONFIG.recipientWallet, 100);

    // Get all articles
    const articles = await articleService.getArticlesList();

    // Calculate earnings by token type
    const earningsByToken: any = {};
    let totalEarnings = 0;

    creatorTransfers.forEach((transfer: any) => {
      const key = `${transfer.token_symbol}-${transfer.solana_cluster}`;
      if (!earningsByToken[key]) {
        earningsByToken[key] = {
          tokenSymbol: transfer.token_symbol,
          tokenMintAddress: transfer.token_mint_address,
          cluster: transfer.solana_cluster,
          amount: 0,
          decimal: transfer.decimal,
          count: 0
        };
      }
      earningsByToken[key].amount += transfer.amount;
      earningsByToken[key].count += 1;
      totalEarnings += transfer.amount / Math.pow(10, transfer.decimal);
    });

    res.json({
      creatorWallet: CONFIG.recipientWallet,
      totalArticles: articles.length,
      totalTransfers: creatorTransfers.length,
      totalEarnings,
      earningsByToken: Object.values(earningsByToken),
      recentTransfers: creatorTransfers.slice(0, 10),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: `Failed to fetch creator stats: ${error.message}` });
  }
}));

app.get("/api/user/stats", articleRateLimit, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { wallet } = req.query;

    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({ error: "Wallet address required" });
    }

    // Get user transfers
    const userTransfers = await storage.getTransfersByWallet(wallet, 100);

    // Get current budget
    const currentBudget = await storage.getBudget(wallet);

    // Calculate spending by token type
    const spendingByToken: any = {};
    let totalSpent = 0;
    let totalTopUp = 0;

    userTransfers.forEach((transfer: any) => {
      // Group only by token symbol, ignoring cluster to consolidate spending
      const normalizedTokenSymbol = transfer.token_symbol?.trim().toUpperCase();
      if (!spendingByToken[normalizedTokenSymbol]) {
        spendingByToken[normalizedTokenSymbol] = {
          tokenSymbol: normalizedTokenSymbol,
          tokenMintAddress: transfer.token_mint_address,
          cluster: transfer.solana_cluster, // Keep cluster info for display
          spent: 0,
          topUp: 0,
          decimal: transfer.decimal,
          articlePayments: 0,
          oneTimePayments: 0
        };
      }

      const normalizedAmount = transfer.amount / Math.pow(10, transfer.decimal);

      if (transfer.type_tx === 'top-up') {
        spendingByToken[normalizedTokenSymbol].topUp += normalizedAmount;
        totalTopUp += normalizedAmount;
      } else if (transfer.type_tx === 'article') {
        spendingByToken[normalizedTokenSymbol].spent += normalizedAmount;
        spendingByToken[normalizedTokenSymbol].articlePayments += 1;
        totalSpent += normalizedAmount;
      } else if (transfer.type_tx === 'article-one-time') {
        spendingByToken[normalizedTokenSymbol].spent += normalizedAmount;
        spendingByToken[normalizedTokenSymbol].oneTimePayments += 1;
        totalSpent += normalizedAmount;
      }
    });

    res.json({
      userWallet: wallet,
      currentBudget,
      totalTransfers: userTransfers.length,
      totalSpent,
      totalTopUp,
      spendingByToken: Object.values(spendingByToken),
      recentTransfers: userTransfers.slice(0, 10),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: `Failed to fetch user stats: ${error.message}` });
  }
}));

app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "CMS x402 Backend",
    timestamp: new Date().toISOString(),
    config: {
      network: "devnet",
      token: CONFIG.splToken,
      articlesPath: CONFIG.articlesPath
    }
  });
});

app.use(errorHandler);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  // Initialize storage before starting the server
  storage.initialize().then(() => {
    app.listen(PORT, () => {
    logger.info({
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      articlesPath: CONFIG.articlesPath,
      splToken: CONFIG.splToken,
      recipientWallet: CONFIG.recipientWallet || null
    }, '🚀 CMS x402 Backend started successfully!');

    if (!CONFIG.recipientWallet) {
      logger.warn('⚠️ WARNING: No recipient wallet configured! Set MY_WALLET_ADDRESS in your .env file to receive payments');
    }

    logger.info(`🔗 API Health Check: http://localhost:${PORT}/api/health`);
    logger.info('📖 API Documentation:');
    logger.info('   • GET /api/articles - List all articles (FREE)');
    logger.info('   • GET /api/articles/:id/preview - Article preview (FREE)');
    logger.info('   • GET /api/articles/:id - Full article (PAID)');
    });
  }).catch((error) => {
    logger.error({ error: error.message }, 'Failed to initialize storage');
    process.exit(1);
  });
}

export default app;