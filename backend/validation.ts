import * as path from 'path';
import { apiLogger } from './logger';

export function validateSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;

  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

export function validateTransactionSignature(signature: string): boolean {
  if (!signature || typeof signature !== 'string') return false;

  // Solana signatures are base58 encoded strings of 87-88 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;
  return base58Regex.test(signature);
}

export function validateReference(reference: string): boolean {
  if (!reference || typeof reference !== 'string') return false;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(reference);
}

export function validateAmount(amount: number): boolean {
  return typeof amount === 'number' && amount > 0 && Number.isFinite(amount);
}

export function validateArticleId(articleId: string): boolean {
  if (!articleId || typeof articleId !== 'string') return false;

  // Article IDs should be alphanumeric with hyphens and underscores, no dangerous characters
  const validIdRegex = /^[a-zA-Z0-9_-]+$/;
  return validIdRegex.test(articleId) && articleId.length <= 100;
}

export function validateFilePath(filePath: string, baseDir: string): boolean {
  if (!filePath || !baseDir) return false;

  try {
    const resolvedPath = path.resolve(baseDir, filePath);
    const resolvedBase = path.resolve(baseDir);
    return resolvedPath.startsWith(resolvedBase);
  } catch {
    return false;
  }
}

export function validateDepositBody(body: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!body) {
    errors.push('Request body is required');
    return { isValid: false, errors };
  }

  // Validate signature
  if (!body.signature) {
    errors.push('Signature is required');
  } else if (!validateTransactionSignature(body.signature)) {
    errors.push('Invalid transaction signature format');
  }

  // Validate reference
  if (!body.reference) {
    errors.push('Reference is required');
  } else if (!validateReference(body.reference)) {
    errors.push('Invalid reference format (must be UUID)');
  }

  // Validate payer pubkey
  if (!body.payerPubkey) {
    errors.push('Payer public key is required');
  } else if (!validateSolanaAddress(body.payerPubkey)) {
    errors.push('Invalid payer public key format');
  }

  // Validate amount
  if (body.amount === undefined) {
    errors.push('Amount is required');
  } else if (!validateAmount(body.amount)) {
    errors.push('Amount must be a positive number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function sanitizeFileName(fileName: string): string {
  if (!fileName) return '';

  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '') // Remove dangerous characters
    .replace(/\.\./g, '.') // Prevent directory traversal
    .slice(0, 255); // Limit length
}

export function validateCorsOrigins(origins: string): string[] {
  if (!origins || typeof origins !== 'string') {
    return ['http://localhost:3000']; // Safe default
  }

  const originList = origins.split(',').map(origin => origin.trim());

  // Validate each origin
  const validOrigins = originList.filter(origin => {
    try {
      new URL(origin);
      return true;
    } catch {
      apiLogger.warn(`Invalid CORS origin: ${origin}`);
      return false;
    }
  });

  return validOrigins.length > 0 ? validOrigins : ['http://localhost:3000'];
}

export function validateMarkdownContent(content: string): { isValid: boolean; sanitized: string } {
  if (typeof content !== 'string') {
    return { isValid: false, sanitized: '' };
  }

  // Size limit check
  if (content.length > 1000000) {
    return { isValid: false, sanitized: '' };
  }

  // Enhanced sanitization for security
  const sanitized = content
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove dangerous HTML tags that might be embedded
    .replace(/<(iframe|object|embed|form|input|button)[^>]*>/gi, '')
    .replace(/<\/(iframe|object|embed|form|input|button)>/gi, '')
    // Remove event handlers on any tags
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\bon\w+\s*=\s*[^"'>\s]*/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: URLs that could execute scripts
    .replace(/data:(?!image\/(gif|png|jpeg|webp))/gi, 'data-blocked:')
    // Remove vbscript: protocol
    .replace(/vbscript:/gi, '')
    // Remove meta refresh tags
    .replace(/<meta[^>]*http-equiv=["']refresh["'][^>]*>/gi, '')
    // Normalize line endings and remove excessive whitespace
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  return { isValid: true, sanitized };
}

export function createValidationMiddleware(validator: (body: any) => { isValid: boolean; errors: string[] }) {
  return (req: any, res: any, next: any) => {
    const validation = validator(req.body);

    if (!validation.isValid) {
      apiLogger.warn({
        errors: validation.errors,
        body: req.body,
        path: req.path
      }, 'Validation failed');

      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }

    next();
  };
}