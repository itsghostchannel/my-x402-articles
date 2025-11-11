import * as path from 'path';
import { marked } from 'marked';
import matter from 'gray-matter';
import { config } from './config';
import { promises as fs } from 'fs';
import { articleLogger } from './logger';
import { validateFilePath, sanitizeFileName, validateMarkdownContent, validateArticleId } from './validation';
import { ArticleServiceError, ArticleProcessingError, ArticleScanningError, ArticleReadingError } from './types';
import { pricing } from './pricing';

interface Article {
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

interface ArticleListItem {
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
  price?: number;
  currencySymbol?: string;
  currencyName?: string;
  previewContent?: string;
}

class ArticleService {
  private articlesPath: string;
  private cache: Map<string, Article>;
  private lastScan: number | null;
  private readonly CACHE_TTL: number;

  constructor(articlesPath?: string) {
    this.articlesPath = articlesPath || config.articlesPath;
    this.cache = new Map();
    this.lastScan = null;
    this.CACHE_TTL = config.cacheTtl;

    // Configure marked for security and performance
    marked.setOptions({
      gfm: true,                 // Enable GitHub Flavored Markdown
      breaks: false              // Don't convert line breaks to <br>
    });
  }

  async scanArticles(): Promise<Article[]> {
    const now = Date.now();
    if (this.lastScan && (now - this.lastScan) < this.CACHE_TTL) {
      return Array.from(this.cache.values());
    }

    try {
      const files = await fs.readdir(this.articlesPath);
      const markdownFiles = files.filter((file: string) =>
        file.endsWith('.md') && validateFilePath(file, this.articlesPath)
      );

      // Process files in parallel for better performance
      const articlePromises = markdownFiles.map(async (file) => {
        try {
          const sanitizedFile = sanitizeFileName(file);
          const filePath = path.join(this.articlesPath, sanitizedFile);

          // Validate file path to prevent directory traversal
          if (!validateFilePath(sanitizedFile, this.articlesPath)) {
            throw new Error(`Invalid file path: ${sanitizedFile}`);
          }

          const fileContent = await fs.readFile(filePath, 'utf-8');
          const validation = validateMarkdownContent(fileContent);

          if (!validation.isValid) {
            throw new Error('Invalid content detected in markdown file');
          }

          const { data, content } = matter(validation.sanitized);
          const words = content.split(/\s+/);

          const article: Article = {
            id: sanitizedFile.replace('.md', ''),
            slug: sanitizedFile.replace('.md', ''),
            title: data.title || 'Untitled',
            author: data.author || 'Unknown',
            date: data.date || new Date().toISOString().split('T')[0],
            excerpt: data.excerpt || this.createExcerpt(content),
            tags: data.tags || [],
            wordCount: words.length,
            readTime: Math.ceil(words.length / 200), // 200 WPM
            filePath: filePath,
            isPremium: true, // All articles require payment for full content
            previewContent: this.createPreview(content),
            // Add pricing information
            price: data.price || pricing.ARTICLE_COST,
            currencySymbol: data.currencySymbol || pricing.CURRENCY_SYMBOL,
            currencyName: data.currencyName || pricing.CURRENCY_NAME
          };

          this.cache.set(article.id, article);
          return article;
        } catch (error) {
          const errorContext: ArticleProcessingError = {
            error: error instanceof Error ? error.message : String(error),
            file,
            stack: error instanceof Error ? error.stack : undefined
          };
          articleLogger.error(errorContext, `Error processing article`);
          throw new ArticleServiceError(`Failed to process article: ${file}`, errorContext);
        }
      });

      const articleResults = await Promise.allSettled(articlePromises);
      const articles = articleResults
        .filter((result): result is PromiseFulfilledResult<Article> => result.status === 'fulfilled')
        .map(result => result.value);

      articles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      this.lastScan = now;
      return articles;
    } catch (error) {
      const errorContext: ArticleScanningError = {
        error: error instanceof Error ? error.message : String(error),
        articlesPath: this.articlesPath,
        stack: error instanceof Error ? error.stack : undefined
      };
      articleLogger.error(errorContext, 'Error scanning articles directory');
      throw new ArticleServiceError('Failed to scan articles directory', errorContext);
    }
  }

  async getArticle(articleId: string): Promise<Article | null> {
    // Validate article ID
    if (!validateArticleId(articleId)) {
      articleLogger.warn({ articleId }, 'Invalid article ID format');
      return null;
    }

    // First try cache
    if (this.cache.has(articleId)) {
      const cachedArticle = this.cache.get(articleId)!;
      try {
        const fileContent = await fs.readFile(cachedArticle.filePath, 'utf-8');
        const validation = validateMarkdownContent(fileContent);

        if (!validation.isValid) {
          throw new Error('Invalid content detected in cached article file');
        }

        const { content } = matter(validation.sanitized);

        return {
          ...cachedArticle,
          fullContent: content,
          htmlContent: this.markdownToHtml(content)
        };
      } catch (error) {
        const errorContext: ArticleReadingError = {
          error: error instanceof Error ? error.message : String(error),
          articleId,
          filePath: cachedArticle.filePath,
          stack: error instanceof Error ? error.stack : undefined
        };
        articleLogger.error(errorContext, 'Error reading article file');
        return null;
      }
    }

    // If not in cache, scan and try again
    try {
      await this.scanArticles();
    } catch (error) {
      articleLogger.error({ error: error instanceof Error ? error.message : String(error), articleId }, 'Failed to scan articles for getArticle');
      return null;
    }

    if (this.cache.has(articleId)) {
      return this.getArticle(articleId);
    }

    return null;
  }

  createExcerpt(content: string, maxLength: number = 150): string {
    const text = content.replace(/^#+\s+/gm, '').replace(/\*\*/g, '').replace(/\*/g, '');
    const plainText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    return plainText.length > maxLength
      ? plainText.substring(0, maxLength) + '...'
      : plainText;
  }

  createPreview(content: string, maxParagraphs: number = 2): string {
    const paragraphs = content.split('\n\n').filter(p => p.trim() && !p.startsWith('#'));
    return paragraphs.slice(0, maxParagraphs).join('\n\n');
  }

  markdownToHtml(content: string): string {
    try {
      // Use marked for proper markdown parsing with security considerations
      const html = marked.parse(content);
      return typeof html === 'string' ? html : String(html);
    } catch (error) {
      articleLogger.error({
        error: error instanceof Error ? error.message : String(error),
        contentLength: content.length
      }, 'Error parsing markdown content');

      // Fallback to basic HTML escaping if marked fails
      return content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\n/g, '<br>');
    }
  }

  async getArticlesList(): Promise<ArticleListItem[]> {
    const articles = await this.scanArticles();
    return articles.map(article => ({
      id: article.id,
      slug: article.slug,
      title: article.title,
      author: article.author,
      date: article.date,
      excerpt: article.excerpt,
      tags: article.tags,
      wordCount: article.wordCount,
      readTime: article.readTime,
      isPremium: article.isPremium,
      price: article.price,
      currencySymbol: article.currencySymbol,
      currencyName: article.currencyName
    }));
  }

  async getArticlePreview(articleId: string): Promise<ArticleListItem | null> {
    const article = await this.getArticle(articleId);
    if (!article) return null;

    return {
      id: article.id,
      slug: article.slug,
      title: article.title,
      author: article.author,
      date: article.date,
      excerpt: article.excerpt,
      tags: article.tags,
      wordCount: article.wordCount,
      readTime: article.readTime,
      previewContent: article.previewContent,
      isPremium: article.isPremium,
      price: article.price,
      currencySymbol: article.currencySymbol,
      currencyName: article.currencyName
    } as ArticleListItem;
  }
}

export default ArticleService;