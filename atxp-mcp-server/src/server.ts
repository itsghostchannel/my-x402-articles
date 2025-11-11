import 'dotenv/config';
import { z } from 'zod';
import { BigNumber } from 'bignumber.js';
import { atxpExpress } from '@atxp/express';
import ArticleService from './article-service.js';
import express, { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { requirePayment, ChainPaymentDestination } from '@atxp/server';
import logger, { apiLogger, mcpLogger } from './logger.js';
import {
  ArticleListResponse,
  ArticleResponse,
  ArticlePreviewResponse,
  PricingConfig
} from './types.js';


// Initialize pricing configuration
// These serve as defaults when individual articles don't specify their own pricing
const pricingConfig: PricingConfig = {
  ARTICLE_COST: parseFloat(process.env.DEFAULT_ARTICLE_COST || '0.00'),
  CURRENCY_SYMBOL: process.env.DEFAULT_CURRENCY_SYMBOL || '$',
  CURRENCY_NAME: process.env.DEFAULT_CURRENCY_NAME || 'USDC'
};

// Initialize article service
const articleService = new ArticleService('./articles', pricingConfig);

const getServer = () => {
  const server = new McpServer({
    name: 'atxp-article-mcp-server',
    version: '1.0.0',
  });

  // Tool: get_all_articles
  // Returns metadata for all articles without requiring payment
  server.tool(
    "get_all_articles",
    "Get metadata for all available articles including titles, authors, dates, and pricing information.",
    {},
    async () => {
      try {
        const articles = await articleService.getArticlesList();
        const response: ArticleListResponse = {
          articles,
          total: articles.length
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        mcpLogger.error({
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }, 'Error in get_all_articles');
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: 'Failed to retrieve articles',
                message: error instanceof Error ? error.message : 'Unknown error'
              }, null, 2),
            },
          ],
        };
      }
    }
  );

  // Tool: get_article_preview
  // Returns a preview of the specified article without requiring payment
  server.tool(
    "get_article_preview",
    "Get a preview (first few paragraphs) of a specified article without requiring payment.",
    {
      article_id: z.string().describe("The ID of the article to preview"),
    },
    async ({ article_id }) => {
      try {
        const article = await articleService.getArticlePreview(article_id);

        if (!article) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: 'Article not found',
                  article_id
                }, null, 2),
              },
            ],
          };
        }

        const response: ArticlePreviewResponse = { article };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        mcpLogger.error({
          error: error instanceof Error ? error.message : String(error),
          article_id,
          stack: error instanceof Error ? error.stack : undefined
        }, 'Error in get_article_preview');
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: 'Failed to retrieve article preview',
                article_id,
                message: error instanceof Error ? error.message : 'Unknown error'
              }, null, 2),
            },
          ],
        };
      }
    }
  );

  // Tool: get_article_free
  // Returns free articles or free sections of articles without payment
  server.tool(
    "get_article_free",
    "Get free articles or free sections of articles without requiring payment.",
    {
      article_id: z.string().describe("The ID of the article to retrieve"),
    },
    async ({ article_id }) => {
      try {
        const article = await articleService.getArticle(article_id);

        if (!article) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: 'Article not found',
                  article_id
                }, null, 2),
              },
            ],
          };
        }

        // For demo purposes, we'll return the preview as free content
        // In a real implementation, you might have some truly free articles
        const freeContent = {
          id: article.id,
          title: article.title,
          author: article.author,
          date: article.date,
          excerpt: article.excerpt,
          tags: article.tags,
          previewContent: article.previewContent,
          isPremium: article.isPremium,
          message: article.isPremium
            ? "This is a free preview. Full content requires payment."
            : "Full article content (free article)"
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(freeContent, null, 2),
            },
          ],
        };
      } catch (error) {
        mcpLogger.error({
          error: error instanceof Error ? error.message : String(error),
          article_id,
          stack: error instanceof Error ? error.stack : undefined
        }, 'Error in get_article_free');
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: 'Failed to retrieve free article content',
                article_id,
                message: error instanceof Error ? error.message : 'Unknown error'
              }, null, 2),
            },
          ],
        };
      }
    }
  );

  // Tool: get_article
  // Returns full content of specified article (requires payment for premium articles)
  server.tool(
    "get_article",
    "Get the full content of a specified article. Payment is required for premium articles.",
    {
      article_id: z.string().describe("The ID of the article to retrieve"),
    },
    async ({ article_id }) => {
      try {
        const article = await articleService.getArticle(article_id);

        if (!article) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: 'Article not found',
                  article_id
                }, null, 2),
              },
            ],
          };
        }

        // Check if payment is required
        if (article.isPremium) {
          // Require payment before accessing premium content
          const price = BigNumber(article.price || pricingConfig.ARTICLE_COST);

          mcpLogger.info({
            articleId: article_id,
            articleTitle: article.title,
            price: price.toString(),
            currency: pricingConfig.CURRENCY_NAME,
            x402PaymentStandard: x402PaymentStandard,
            x402Network: x402Network
          }, `💳 Requiring x402 payment for premium article: ${article.title}`);

          await requirePayment({price});

          mcpLogger.info({
            articleId: article_id
          }, `✅ x402 payment verified for article: ${article.title}`);
        }

        const response: ArticleResponse = {
          article: {
            ...article,
            fullContent: article.fullContent,
            htmlContent: article.htmlContent
          },
          requiresPayment: article.isPremium,
          price: article.price,
          currencySymbol: article.currencySymbol,
          currencyName: article.currencyName
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        mcpLogger.error({
          error: error instanceof Error ? error.message : String(error),
          article_id,
          stack: error instanceof Error ? error.stack : undefined
        }, 'Error in get_article');
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: 'Failed to retrieve article',
                article_id,
                message: error instanceof Error ? error.message : 'Unknown error'
              }, null, 2),
            },
          ],
        };
      }
    }
  );

  return server;
}

const app = express();
app.use(express.json());

const destination = new ChainPaymentDestination(
  process.env.PAYMENT_DESTINATION || 'C7qbXtbrWJPJzFvRBYx9snv7Mp1Wr3BxR319hq3kNiyr',
  (process.env.PAYMENT_NETWORK || 'solana') as any
);

// x402 Configuration
const x402PaymentStandard = process.env.X402_PAYMENT_STANDARD || 'atxp-v1';
const x402Network = process.env.X402_NETWORK || 'solana-mainnet';

app.use(atxpExpress({
  paymentDestination: destination,
  payeeName: process.env.PAYEE_NAME || 'ATXP Articles MCP Server',
  allowHttp: true, // Only use in development
  currency: 'USDC',
  server: 'https://auth.atxp.ai'
}));


app.post('/', async (req: Request, res: Response) => {
  const server = getServer();
  try {
    apiLogger.info({
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    }, 'Received MCP POST request');

    const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on('close', () => {
      apiLogger.info('MCP request closed');
      transport.close();
      server.close();
    });
  } catch (error) {
    apiLogger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      method: req.method,
      url: req.url
    }, 'Error handling MCP request');
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

app.get('/', async (req: Request, res: Response) => {
  apiLogger.warn({
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  }, 'Received unsupported GET request');
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});

app.delete('/', async (req: Request, res: Response) => {
  apiLogger.warn({
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  }, 'Received unsupported DELETE request');
  res.writeHead(405).end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed."
    },
    id: null
  }));
});


// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, (error) => {
  if (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      port: PORT
    }, 'Failed to start server');
    process.exit(1);
  }

  logger.info({
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    articlesPath: './articles',
    payeeName: process.env.PAYEE_NAME || 'ATXP Articles MCP Server',
    x402PaymentStandard: x402PaymentStandard,
    x402Network: x402Network,
    paymentDestination: process.env.PAYMENT_DESTINATION,
    paymentNetwork: process.env.PAYMENT_NETWORK
  }, `🚀 ATXP Articles MCP Server started successfully!`);
});

// Handle server shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down server...');
  process.exit(0);
});
