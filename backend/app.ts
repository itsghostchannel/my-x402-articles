import cors from 'cors';
import dotenv from 'dotenv';
import * as path from 'path';
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
    endpoint: "/api/articles",
    cost: 0, // Free access
  },
  {
    id: "get_article_preview",
    description: "Get article preview without full content",
    endpoint: "/api/articles/:id/preview",
    cost: 0, // Free access
  },
  {
    id: "get_article_free",
    description: "Get free article content",
    endpoint: "/api/articles/:id/free",
    cost: 0, // Free access
  },
  {
    id: "get_article",
    description: "Get full article content (requires payment)",
    endpoint: "/api/articles/:id",
    cost: pricing.ARTICLE_COST,
  }
];


app.get("/api/agent/tools", (req: Request, res: Response) => {
  res.json(agentTools);
});

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
    const currentBudget = BigInt(await storage.getBudget(payerPubkey));
    const depositAmount = verification.amountReceivedSmallestUnit!;
    const newBudget = currentBudget + depositAmount;

    await storage.setBudget(payerPubkey, newBudget.toString());
    await storage.addReference(refKey, { ex: 3600 });

    budgetLogger.info({
      payer: payerPubkey,
      depositAmount: amount,
      totalBudget: newBudget.toString()
    }, "Budget deposit successful");

    res.json({
      success: true,
      newBudget: Number(newBudget) / Math.pow(10, mintAccount.data.decimals),
      depositAmount: amount
    });
  } else {
    let errorMsg = verification.error;
    if (verification.amountReceivedSmallestUnit !== claimedAmountSmallestUnit) {
      errorMsg = `Deposit amount mismatch. Received: ${verification.amountReceivedSmallestUnit}, Claimed: ${claimedAmountSmallestUnit}`;
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
}

export default app;