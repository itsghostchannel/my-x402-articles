import { logger, apiLogger } from './logger';
import { Request, Response, NextFunction } from 'express';
import { ValidationError, PaymentVerificationError, BudgetOperationError, ArticleServiceError } from './types';

function sanitizeError(error: Error, isDevelopment: boolean): string {
  if (isDevelopment) {
    return error.message;
  }

  if (error instanceof ValidationError) {
    return 'Invalid input provided';
  }

  if (error instanceof PaymentVerificationError) {
    return 'Payment verification failed';
  }

  if (error instanceof BudgetOperationError) {
    return 'Budget operation failed';
  }

  if (error instanceof ArticleServiceError) {
    return 'Article processing failed';
  }

  return 'An unexpected error occurred';
}

function getErrorContext(error: Error, req: Request) {
  return {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    body: req.method !== 'GET' ? sanitizeRequestBody(req.body) : undefined,
    params: req.params,
    query: req.query,
    errorType: error.constructor.name
  };
}

function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };

  const sensitiveFields = ['signature', 'authorization', 'password', 'token', 'secret'];
  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}

function getErrorStatus(error: Error): number {
  if (error instanceof ValidationError) {
    return 400; // Bad Request
  }

  if (error instanceof PaymentVerificationError) {
    return 401; // Unauthorized
  }

  if (error instanceof BudgetOperationError) {
    return 402; // Payment Required
  }

  if (error instanceof ArticleServiceError) {
    return 404; // Not Found
  }

  // For unknown errors, return 500
  return 500;
}

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const errorStatus = getErrorStatus(error);
  const sanitizedMessage = sanitizeError(error, isDevelopment);
  const errorContext = getErrorContext(error, req);

  if (error instanceof ValidationError || error instanceof PaymentVerificationError) {
    apiLogger.warn(errorContext, 'Client error occurred');
  } else {
    logger.error(errorContext, 'Server error occurred');
  }

  const response: any = {
    error: sanitizedMessage,
    status: errorStatus,
    timestamp: new Date().toISOString()
  };

  if (isDevelopment) {
    response.details = {
      type: error.constructor.name,
      stack: error.stack,
      body: sanitizeRequestBody(req.body)
    };
  }

  const requestId = req.headers['x-request-id'];
  if (requestId) {
    response.requestId = requestId;
  }

  res.status(errorStatus).json(response);
}

export function createValidationError(message: string, field?: string): ValidationError {
  return new ValidationError(message, field);
}

export function createPaymentVerificationError(
  message: string,
  context: any
): PaymentVerificationError {
  return new PaymentVerificationError(message, context);
}

export function createBudgetOperationError(
  message: string,
  context: any
): BudgetOperationError {
  return new BudgetOperationError(message, context);
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}