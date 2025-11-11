// paywall.ts - x402 payment integration for CMS
import { createSolanaRpc, address, Signature, Account } from '@solana/kit';
import { fetchMint, Mint } from '@solana-program/token';
import { randomUUID } from 'crypto';
import { paymentLogger, budgetLogger } from './logger';
import {
  VerificationResult,
  Invoice,
  BudgetPaywallOptions,
  X402PaywallOptions,
  SolanaTransactionResponse,
  ParsedInstruction,
  TransactionVerificationContext,
  TransactionMetadata,
  PaymentVerificationLog,
  BudgetOperationContext,
  PaymentValidationContext,
  PaymentVerificationError,
  BudgetOperationError,
  ValidationError
} from './types';
import { storage } from './storage';
import { validateSolanaAddress, validateTransactionSignature, validateReference } from './validation';
import { Request, Response, NextFunction } from 'express';
import { config, getSolanaRpcUrl } from './config';

interface ExtendedRequest extends Request {
  x402_payment_method?: string;
  cms_access_granted?: boolean;
}

// Export RPC instance using configuration
export const rpc = createSolanaRpc(getSolanaRpcUrl());

/**
 * Initialize storage service
 */
export async function initializeStorage(): Promise<void> {
  await storage.initialize();
}

/**
 * Helper function to extract memo from instruction
 */
function extractMemo(memoInstruction: ParsedInstruction | undefined): string | null {
  if (!memoInstruction || !('parsed' in memoInstruction)) return null;
  const parsed = memoInstruction.parsed;

  if (typeof parsed === 'string') return parsed;
  if (parsed?.info?.memo && typeof parsed.info === 'object') {
    return (parsed.info as { memo?: string }).memo || null;
  }

  return null;
}

/**
 * Verify transaction for x402 payments
 */
export async function verifyTransaction(
  signature: string,
  reference: string,
  requiredAmount: number,
  splTokenMint: string,
  recipientWallet: string
): Promise<VerificationResult> {
  // Validate inputs
  if (!validateTransactionSignature(signature)) {
    const error = new ValidationError('Invalid transaction signature format');
    return { success: false, error: error.message };
  }

  if (!validateReference(reference)) {
    const error = new ValidationError('Invalid reference format (must be UUID)');
    return { success: false, error: error.message };
  }

  if (!validateSolanaAddress(splTokenMint)) {
    const error = new ValidationError('Invalid SPL token mint address');
    return { success: false, error: error.message };
  }

  if (!validateSolanaAddress(recipientWallet)) {
    const error = new ValidationError('Invalid recipient wallet address');
    return { success: false, error: error.message };
  }

  const context: TransactionVerificationContext = {
    signature,
    reference,
    expectedAmount: requiredAmount,
    splToken: splTokenMint,
    recipientWallet
  };

  try {
    const rpcUrl = getSolanaRpcUrl();
    paymentLogger.info({
      signature,
      commitment: 'finalized',
      rpcUrl
    }, "Fetching transaction from RPC");

    const tx = await rpc.getTransaction(signature as Signature, {
      commitment: 'finalized',
      encoding: 'jsonParsed'
    }).send();

    paymentLogger.info({
      signature,
      transactionFound: !!tx,
      hasError: tx?.meta?.err,
      meta: tx?.meta
    }, "Transaction fetch result");

    // If RPC call fails, try direct HTTP fetch as fallback
    if (!tx) {
      paymentLogger.info({
        signature,
        rpcUrl
      }, "RPC call failed, trying direct HTTP fetch");

      // Try different commitment levels
      const commitments = ['confirmed', 'finalized'];

      for (const commitment of commitments) {
        try {
          paymentLogger.info({
            signature,
            commitment,
            rpcUrl
          }, "Trying direct HTTP fetch with commitment");

          const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'getTransaction',
              params: [signature, { commitment, encoding: 'jsonParsed' }]
            })
          });

          const result = await response.json() as any;
          paymentLogger.info({
            signature,
            commitment,
            directFetchSuccess: !!result.result,
            result: result.result ? 'Transaction found' : 'Transaction not found',
            httpStatus: response.status
          }, "Direct HTTP fetch result");

          if (result.result && !result.result.meta?.err) {
            paymentLogger.info({
              signature,
              commitment
            }, "Transaction verification successful via direct fetch");

            // Extract amount from transaction properly
            const preBalance = result.result.meta?.preTokenBalances?.find(
              (b: any) => b.owner === recipientWallet && b.mint === splTokenMint
            );
            const postBalance = result.result.meta?.postTokenBalances?.find(
              (b: any) => b.owner === recipientWallet && b.mint === splTokenMint
            );

            const preAmount = BigInt(preBalance?.uiTokenAmount?.amount || "0");
            const postAmount = BigInt(postBalance?.uiTokenAmount?.amount || "0");
            let amountReceived = postAmount - preAmount;

            // For self-transfer transactions (budget deposits), extract from instruction
            if (amountReceived === 0n && result.result.transaction?.message?.instructions) {
              for (const instruction of result.result.transaction.message.instructions) {
                if (instruction.parsed && instruction.parsed.type === 'transfer') {
                  const transferAmount = instruction.parsed.info.amount;
                  if (transferAmount) {
                    amountReceived = BigInt(transferAmount);
                    break;
                  }
                }
              }
            }

            const mintAddress = address(splTokenMint);
            const mintAccount: Account<Mint> = await fetchMint(rpc, mintAddress);

            return {
              success: true,
              amountReceived: Number(amountReceived) / Math.pow(10, mintAccount.data.decimals),
              amountReceivedSmallestUnit: amountReceived
            };
          }
        } catch (fetchError: any) {
          paymentLogger.error({
            signature,
            commitment,
            error: fetchError.message
          }, "Direct HTTP fetch failed for commitment");
        }
      }
    }

    if (!tx || (tx.meta && tx.meta.err)) {
      throw new PaymentVerificationError("Transaction failed or not found", context);
    }

    // Verify Memo (Reference)
    const memoInstruction = tx.transaction.message.instructions?.find(
      (ix: any) =>
        (ix.programId === config.memoProgramId ||
         ix.program === "memo") &&
        'parsed' in ix
    );

    const memoString = extractMemo(memoInstruction);
    const isReferenceValid = memoString === reference;
    if (!isReferenceValid) {
      throw new PaymentVerificationError(
        `Invalid reference memo. Expected: ${reference}, Received: ${memoString}`,
        context
      );
    }

    // Verify Amount
    const mintAddress = address(splTokenMint);

    const mintAccount: Account<Mint> = await fetchMint(rpc, mintAddress);
    const requiredAmountSmallestUnit = BigInt(
      Math.floor(requiredAmount * Math.pow(10, mintAccount.data.decimals))
    );

    const preBalance = tx.meta?.preTokenBalances?.find(
      (b: any) => b.owner === recipientWallet && b.mint === splTokenMint
    );
    const postBalance = tx.meta?.postTokenBalances?.find(
      (b: any) => b.owner === recipientWallet && b.mint === splTokenMint
    );

    const preAmount = BigInt(preBalance?.uiTokenAmount?.amount || "0");
    const postAmount = BigInt(postBalance?.uiTokenAmount?.amount || "0");
    let amountReceived = postAmount - preAmount;

    // For self-transfer transactions (budget deposits), the balance difference will be 0
    // In this case, we need to verify the transaction amount from the transfer instruction
    if (amountReceived === 0n && tx.transaction.message.instructions) {
      // Look for transfer instructions to extract the amount
      for (const instruction of tx.transaction.message.instructions) {
        if (instruction.parsed && instruction.parsed.type === 'transfer') {
          const transferAmount = instruction.parsed.info.amount;
          if (transferAmount) {
            amountReceived = BigInt(transferAmount);
            break;
          }
        }
      }
    }

    const logContext: TransactionMetadata = {
      preBalance: preAmount.toString(),
      postBalance: postAmount.toString(),
      amountReceived: amountReceived.toString(),
      amountRequired: requiredAmountSmallestUnit.toString()
    };

    paymentLogger.info(logContext, "Token balance verification");

    const isAmountValid = amountReceived === requiredAmountSmallestUnit;
    if (!isAmountValid) {
      if (amountReceived > requiredAmountSmallestUnit) {
        paymentLogger.info({
          expectedAmount: requiredAmountSmallestUnit.toString(),
          receivedAmount: amountReceived.toString()
        }, "Amount received exceeds required, allowing budget deposit");
      } else {
        throw new PaymentVerificationError(
          `Incorrect token amount. Received: ${amountReceived}, Required: ${requiredAmountSmallestUnit}`,
          context
        );
      }
    }

    return {
      success: true,
      amountReceived: Number(amountReceived) / Math.pow(10, mintAccount.data.decimals),
      amountReceivedSmallestUnit: amountReceived,
    };
  } catch (error: any) {
    if (error instanceof PaymentVerificationError || error instanceof ValidationError) {
      paymentLogger.warn({
        error: error.message,
        ...context
      }, "Transaction verification failed");
      return { success: false, error: error.message };
    }

    const logContext: PaymentVerificationLog = {
      error: error.message,
      ...context
    };

    paymentLogger.warn(logContext, "Unexpected transaction verification error");
    return { success: false, error: error.message };
  }
}

/**
 * Budget paywall middleware - checks user's pre-paid budget first
 */
export const budgetPaywall = ({ amount, splToken }: BudgetPaywallOptions) =>
  async (req: ExtendedRequest, res: Response, next: NextFunction): Promise<void> => {
    const payerPubkeyHeader = req.headers["x402-payer-pubkey"];
    const payerPubkey = Array.isArray(payerPubkeyHeader) ? payerPubkeyHeader[0] : payerPubkeyHeader;

    if (!payerPubkey) {
      return next(); // No header, continue to normal 402 paywall
    }

    // Validate payer pubkey
    if (!validateSolanaAddress(payerPubkey)) {
      budgetLogger.warn({ payer: payerPubkey }, "Invalid payer pubkey format");
      return next();
    }

    let requiredAmount: bigint = 0n;
    const context: BudgetOperationContext = { payer: payerPubkey };

    try {
      const mintAddress = address(splToken);
      const mintAccount: Account<Mint> = await fetchMint(rpc, mintAddress);
      requiredAmount = BigInt(Math.floor(amount * Math.pow(10, mintAccount.data.decimals)));

      // Try new SQLite payment processing first
      try {
        const paymentContext = {
          walletAddress: payerPubkey,
          solanaCluster: process.env.SOLANA_NETWORK === 'mainnet-beta' ? 'mainnet-beta' : 'devnet',
          tokenMintAddress: splToken,
          amount: Number(requiredAmount),
          articleId: req.query.id as string || req.params.id
        };

        const paymentResult = await storage.processArticlePayment(paymentContext);

        if (paymentResult.success) {
          // Payment processed from budget successfully
          context.amountDeducted = requiredAmount.toString();
          context.remainingBudget = "0"; // Will be updated by SQLite storage

          budgetLogger.info({
            ...context,
            method: "SQLite budget",
            articleId: paymentContext.articleId
          }, "Budget paywall: Article payment processed via SQLite budget");

          req.x402_payment_method = "budget";
          req.cms_access_granted = true;
          return next();
        } else if (paymentResult.requiresOneTimePayment) {
          // Insufficient budget, continue to one-time payment
          context.requiredAmount = requiredAmount.toString();
          context.availableBudget = "0";

          budgetLogger.debug({
            ...context,
            method: "SQLite budget check",
            articleId: paymentContext.articleId
          }, "Budget paywall: Insufficient budget, requires one-time payment");

          return next();
        }
      } catch (sqliteError: any) {
        budgetLogger.warn({
          error: sqliteError.message,
          payer: payerPubkey,
          amount: amount
        }, "SQLite budget processing failed, falling back to legacy method");
      }

      // Fallback to legacy budget method
      const currentBudget = BigInt((await storage.getBudget(payerPubkey)));

      if (currentBudget >= requiredAmount) {
        // Budget sufficient!
        const newBudget = currentBudget - requiredAmount;
        context.amountDeducted = requiredAmount.toString();
        context.remainingBudget = newBudget.toString();

        budgetLogger.info(context, "Budget paywall: Using prepaid budget (legacy method)");
        await storage.setBudget(payerPubkey, newBudget.toString());
        req.x402_payment_method = "budget";
        req.cms_access_granted = true;
        return next();
      } else {
        // Insufficient budget
        context.requiredAmount = requiredAmount.toString();
        context.availableBudget = currentBudget.toString();

        budgetLogger.debug(context, "Budget paywall: Insufficient budget, falling back to payment");
        return next();
      }
    } catch (error: any) {
      const errorContext: BudgetOperationContext = {
        ...context,
        error: error instanceof Error ? error.message : String(error),
        amount: requiredAmount.toString()
      };

      if (error instanceof BudgetOperationError) {
        budgetLogger.error(errorContext, "Error in budget paywall middleware");
      } else {
        budgetLogger.error(errorContext, "Unexpected error in budget paywall middleware");
      }
      return next();
    }
  };

/**
 * x402 paywall middleware - fallback when budget is insufficient
 */
export function x402Paywall({ amount, splToken, recipientWallet }: X402PaywallOptions) {
  return async (req: ExtendedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.x402_payment_method === "budget") {
        return next();
      }

      const MINT_ADDRESS = address(splToken.trim());
      const RECIPIENT_ADDRESS = address(recipientWallet.trim());

      const authHeaderHeader = req.headers["authorization"];
      const authHeader = Array.isArray(authHeaderHeader) ? authHeaderHeader[0] : authHeaderHeader;
      const signature = authHeader?.startsWith("x402 ")
        ? authHeader.split(" ")[1]
        : null;
      const reference = req.query.reference ? req.query.reference.toString() : null;

      if (signature && reference) {
        const refKey = `ref_${reference}`;
        if (await storage.hasReference(refKey)) {
          res.status(401).json({ error: "Payment already claimed (replay attack)" });
          return;
        }

        paymentLogger.info({
          signature,
          reference,
          amount,
          splToken: splToken.trim(),
          recipient: recipientWallet.trim()
        }, "Verifying x402 payment transaction");

        const verification = await verifyTransaction(
          signature,
          reference,
          amount,
          splToken.trim(),
          recipientWallet.trim()
        );

        const mintAccount: Account<Mint> = await fetchMint(rpc, MINT_ADDRESS);
        const requiredAmountSmallestUnit = BigInt(Math.floor(amount * Math.pow(10, mintAccount.data.decimals)));

        if (verification.success && verification.amountReceivedSmallestUnit === requiredAmountSmallestUnit) {
          await storage.addReference(refKey, { ex: 300 });

          // Record one-time article payment in SQLite if available
          try {
            const articleId = req.query.id as string || req.params.id;
            if (articleId) {
              // Extract the from address from request headers (CDP Embedded Wallets)
              const payerPubkeyHeader = req.headers["x402-payer-pubkey"];
              const fromAddress = Array.isArray(payerPubkeyHeader) ? payerPubkeyHeader[0] : payerPubkeyHeader;

              await storage.processOneTimeArticlePayment(
                signature,
                fromAddress,
                recipientWallet.trim(),
                process.env.SOLANA_NETWORK === 'mainnet-beta' ? 'mainnet-beta' : 'devnet',
                Number(requiredAmountSmallestUnit),
                mintAccount.data.decimals,
                splToken.trim(),
                splToken.trim(),
                articleId,
                reference
              );
            }
          } catch (sqliteError: any) {
            paymentLogger.warn({
              error: sqliteError.message,
              signature,
              articleId: req.query.id as string || req.params.id
            }, "Failed to record one-time payment in SQLite");
          }

          paymentLogger.info({
            signature,
            reference,
            amountReceived: verification.amountReceivedSmallestUnit?.toString()
          }, "Payment verification successful - access granted");
          req.x402_payment_method = "onetime";
          req.cms_access_granted = true;
          return next();
        } else {
          let errorMsg = verification.error || "Unknown verification error";

          // Only check amount mismatch if we actually received an amount
          if (typeof verification.amountReceivedSmallestUnit !== 'undefined') {
            if (verification.amountReceivedSmallestUnit !== requiredAmountSmallestUnit) {
              errorMsg = `Incorrect token amount. Received: ${verification.amountReceivedSmallestUnit}, Required: ${requiredAmountSmallestUnit}`;
            }
          } else {
            // If we don't have amount information, it's likely a validation error
            errorMsg = `Payment verification failed: ${errorMsg}`;
          }

          paymentLogger.warn({
            error: errorMsg,
            verificationResult: verification,
            signature,
            reference
          }, "Payment verification failed");

          res.status(401).json({ error: `Invalid payment: ${errorMsg}` });
          return;
        }
      }

      const newReference = randomUUID();

      paymentLogger.info({
        amount,
        splToken: splToken.trim(),
        recipient: recipientWallet.trim(),
        generatedReference: newReference
      }, "No payment proof found - sending 402 challenge");
      const invoice: Invoice = {
        protocol: "x402",
        recipientWallet: recipientWallet.trim(),
        amount: amount,
        token: splToken.trim(),
        reference: newReference,
        metadata: {
          service: config.paymentDescription,
          description: `Access premium article content for ${amount} ${splToken}`
        }
      };

      res.status(402).json(invoice);
      return;
    } catch (error: any) {
      paymentLogger.error({
        error: error.message,
        amount,
        splToken: splToken.trim(),
        recipient: recipientWallet.trim()
      }, "Error in x402 paywall middleware");
      res.status(500).json({ error: `Internal server error: ${error.message}` });
      return;
    }
  };
}

/**
 * Middleware to check if access was granted by payment
 */
export const requirePayment = (req: ExtendedRequest, res: Response, next: NextFunction): void => {
  if (req.cms_access_granted) {
    return next();
  }
  res.status(402).json({ error: "Payment required for article access" });
  return;
};