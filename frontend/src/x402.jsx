import { Buffer } from "buffer";
import React, { createContext, useCallback } from "react";
import { useSolanaAddress, useIsSignedIn } from "@coinbase/cdp-hooks";
import { v4 as uuidv4 } from 'uuid';
import { PublicKey, Transaction, TransactionInstruction, clusterApiUrl, Connection } from "@solana/web3.js";
import { getMint, createTransferInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } from "@solana/spl-token";
import { SendSolanaTransactionButton } from "@coinbase/cdp-react/components/SendSolanaTransactionButton";

window.Buffer = Buffer;
export const X402Context = createContext(null);

const isWalletError = (error) => {
  return (
    error.name === "WalletSignTransactionError" ||
    error.name === "WalletSendTransactionError" ||
    error.message.includes("User rejected the request")
  );
};

// Get network from environment variable or default to devnet
const network = import.meta.env.VITE_SOLANA_NETWORK || "devnet";
const isMainnet = network === "mainnet-beta";

// Create a connection to Solana network
const connection = new Connection(clusterApiUrl(network));

export function X402Provider({ children }) {
  const { solanaAddress } = useSolanaAddress();
  const { isSignedIn } = useIsSignedIn();

  // Convert string address to PublicKey object when needed
  const publicKey = solanaAddress ? new PublicKey(solanaAddress) : null;

  // Helper function to create and encode transaction for CDP
  const createAndEncodeTransaction = useCallback(async (invoice, memo) => {
    if (!publicKey) {
      throw new Error("Wallet not connected.");
    }

    console.log("Building transaction for invoice:", invoice);
    console.log("Memo:", memo);

    const tx = new Transaction();
    const mintPubKey = new PublicKey(invoice.token);
    const recipientWalletPubKey = new PublicKey(invoice.recipientWallet);
    const payerPubKey = publicKey;

    const mintInfo = await getMint(connection, mintPubKey);
    const amountInSmallestUnit = BigInt(
      Math.floor(invoice.amount * Math.pow(10, mintInfo.decimals))
    );

    console.log("Transaction creation details:");
    console.log("- Invoice amount:", invoice.amount);
    console.log("- Mint decimals:", mintInfo.decimals);
    console.log("- Calculated amount in smallest unit:", amountInSmallestUnit.toString());
    console.log("- Expected amount in smallest unit:", (0.5 * Math.pow(10, mintInfo.decimals)).toString());

    const payerTokenAccountAddress = await getAssociatedTokenAddress(
      mintPubKey,
      payerPubKey
    );
    const recipientTokenAccountAddress = await getAssociatedTokenAddress(
      mintPubKey,
      recipientWalletPubKey
    );

    try {
      await getAccount(connection, recipientTokenAccountAddress);
    } catch (err) {
      console.log("Recipient ATA does not exist, creating...");
      tx.add(
        createAssociatedTokenAccountInstruction(
          payerPubKey,
          recipientTokenAccountAddress,
          recipientWalletPubKey,
          mintPubKey
        )
      );
    }

    tx.add(
      createTransferInstruction(
        payerTokenAccountAddress,
        recipientTokenAccountAddress,
        payerPubKey,
        amountInSmallestUnit
      )
    );

    tx.add(
      new TransactionInstruction({
        keys: [{ pubkey: payerPubKey, isSigner: true, isWritable: false }],
        data: Buffer.from(memo, "utf-8"),
        programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
      })
    );

    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = payerPubKey;

    // Serialize and encode transaction for CDP
    const serializedTransaction = tx.serialize({
      requireAllSignatures: false,
    });

    return Buffer.from(serializedTransaction).toString("base64");
  }, [connection, publicKey]);

  // For CDP, we'll use a callback-based approach instead of direct transaction execution
  const createPaymentTransaction = useCallback(async (invoice, memo) => {
    if (!isSignedIn || !solanaAddress) {
      throw new Error("Wallet not connected.");
    }

    return await createAndEncodeTransaction(invoice, memo);
  }, [isSignedIn, solanaAddress, createAndEncodeTransaction]);

  // Note: fetchWith402 is now handled by individual components using SendSolanaTransactionButton
  // This function will need to be called with a callback that handles the transaction signing
  const fetchWith402 = useCallback(
    async (url, options = {}) => {
      if (!solanaAddress) {
        throw new Error("Wallet not connected.");
      }

      const headers = new Headers(options.headers || {});
      headers.append("x402-Payer-Pubkey", solanaAddress);

      const res = await fetch(url, { ...options, headers });

      if (res.ok) {
        console.log("Fetch successful (via budget or public)");
        return res.json();
      } else if (res.status === 402) {
        const invoice = await res.json();
        console.log("Received 402 invoice:", invoice);

        // For CDP, we return the invoice and let the component handle the transaction
        // The component will use SendSolanaTransactionButton to execute the payment
        throw { isPaymentRequired: true, invoice, url, options };
      } else {
        const errorText = await res.text();
        throw new Error(`HTTP Error: ${res.status} ${res.statusText} - ${errorText}`);
      }
    },
    [solanaAddress]
  );

  const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

  const depositBudget = useCallback(
    async (_invoiceUrl, amount) => {
      if (!solanaAddress) {
        throw new Error("Wallet not connected.");
      }

      // Create a mock 402 invoice for budget deposit
      console.log("Creating budget deposit invoice for amount:", amount);

      // Create a budget deposit invoice structure
      // For demo purposes, we'll send to the user's own wallet (self-transfer)
      // In production, this should be your treasury wallet address
      const budgetDepositInvoice = {
        token: isMainnet ? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" : "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", // USDC
        recipientWallet: solanaAddress, // Self-transfer for demo purposes
        amount: amount,
        reference: `TOPUP-${uuidv4()}`,
        id: `budget-deposit-${Date.now()}`,
        description: `Budget deposit of ${amount} USDC tokens`
      };

      const depositInvoice = { ...budgetDepositInvoice, amount: amount };
      const depositReference = budgetDepositInvoice.reference;

      try {
        // Return transaction data for component to handle with SendSolanaTransactionButton
        const transactionData = await createPaymentTransaction(depositInvoice, depositReference);

        return {
          transactionData,
          invoice: depositInvoice,
          reference: depositReference,
          payerPubkey: solanaAddress,
          amount: amount,
          API_BASE
        };
      } catch (error) {
        console.error("Error creating transaction for budget deposit:", error);
        throw new Error(`Failed to create budget deposit transaction: ${error.message}`);
      }
    },
    [solanaAddress, createPaymentTransaction, API_BASE, isMainnet]
  );

  const value = {
    fetchWith402,
    depositBudget,
    createPaymentTransaction,
    API_BASE,
    isWalletError,
    publicKey: solanaAddress,
    solanaAddress,
    isSignedIn,
  };

  return <X402Context.Provider value={value}>{children}</X402Context.Provider>;
}