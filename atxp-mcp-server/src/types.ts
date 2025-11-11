// Article and MCP server types

export interface Article {
  id: string;
  slug: string;
  title: string;
  author: string;
  date: string;
  excerpt: string;
  tags: string[];
  wordCount: number;
  readTime: number;
  filePath: string;
  isPremium: boolean;
  previewContent: string;
  fullContent?: string;
  htmlContent?: string;
  price?: number;
  currencySymbol?: string;
  currencyName?: string;
}

export interface ArticleListItem {
  id: string;
  slug: string;
  title: string;
  author: string;
  date: string;
  excerpt: string;
  tags: string[];
  wordCount: number;
  readTime: number;
  isPremium: boolean;
  previewContent?: string;
  price?: number;
  currencySymbol?: string;
  currencyName?: string;
}

export interface ArticleProcessingError {
  error: string;
  file: string;
  stack?: string;
}

export interface ArticleScanningError {
  error: string;
  articlesPath: string;
  stack?: string;
}

export interface ArticleReadingError {
  error: string;
  articleId: string;
  filePath: string;
  stack?: string;
}

export interface PricingConfig {
  ARTICLE_COST: number;
  CURRENCY_SYMBOL: string;
  CURRENCY_NAME: string;
}

// Error classes
export class ArticleServiceError extends Error {
  constructor(
    message: string,
    public readonly context: ArticleProcessingError | ArticleScanningError | ArticleReadingError
  ) {
    super(message);
    this.name = 'ArticleServiceError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// MCP Tool response types
export interface ArticleListResponse {
  articles: ArticleListItem[];
  total: number;
}

export interface ArticleResponse {
  article: Article | null;
  requiresPayment?: boolean;
  price?: number;
  currencySymbol?: string;
  currencyName?: string;
}

export interface ArticlePreviewResponse {
  article: ArticleListItem | null;
}