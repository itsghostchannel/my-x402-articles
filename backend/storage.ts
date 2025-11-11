import { budgetLogger } from './logger';
import { sqliteStorage } from './sqlite-storage';

/**
 * SQLite-only Storage Service
 *
 * This is the primary storage interface for the x402 payment system.
 * It provides a simplified interface to the SQLite database backend
 * for managing transfers, budget balances, and payment references.
 *
 * No fallback support for Vercel KV or in-memory storage.
 */
export class StorageService {
  private initialized: boolean = false;

  /**
   * Initialize the SQLite database connection
   *
   * @throws {Error} If SQLite initialization fails
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await sqliteStorage.initialize();
      this.initialized = true;
      budgetLogger.info("SQLite storage initialized successfully");
    } catch (error: any) {
      budgetLogger.error({ error: error.message }, "Failed to initialize SQLite storage");
      throw new Error(`Storage initialization failed: ${error.message}`);
    }
  }

  /**
   * Get a value from storage
   *
   * @param key - Storage key (supports "ref_*" for references, "budget_*" for budgets)
   * @returns Promise resolving to the stored value or null
   */
  async get(key: string): Promise<string | boolean | null> {
    this.ensureInitialized();

    try {
      // Handle reference keys (ref_*)
      if (key.startsWith("ref_")) {
        const reference = key.substring(4); // Remove "ref_" prefix
        const hasRef = await sqliteStorage.hasReference(reference);
        return hasRef;
      }

      // Handle budget keys (budget_*)
      if (key.startsWith("budget_")) {
        const payerPubkey = key.substring(7); // Remove "budget_" prefix
        const budget = await sqliteStorage.getBudget(payerPubkey);
        return budget;
      }

      return null;
    } catch (error: any) {
      budgetLogger.error({ error: error.message, key }, "Storage get operation failed");
      throw new Error(`Failed to get value for key '${key}': ${error.message}`);
    }
  }

  /**
   * Set a value in storage
   *
   * @param key - Storage key
   * @param value - Value to store (boolean for references, string for budgets)
   * @param options - Additional options (not used in SQLite implementation)
   */
  async set(key: string, value: string | boolean, options?: any): Promise<void> {
    this.ensureInitialized();

    try {
      // Handle reference keys (ref_*)
      if (key.startsWith("ref_") && value === true) {
        const reference = key.substring(4); // Remove "ref_" prefix
        await sqliteStorage.addReference(reference);
        return;
      }

      // Handle budget keys (budget_*)
      if (key.startsWith("budget_") && typeof value === 'string') {
        const payerPubkey = key.substring(7); // Remove "budget_" prefix
        await sqliteStorage.setBudget(payerPubkey, value);
        return;
      }

      budgetLogger.warn({ key, value }, "Attempted to set unsupported key-value pair");
    } catch (error: any) {
      budgetLogger.error({ error: error.message, key, value }, "Storage set operation failed");
      throw new Error(`Failed to set value for key '${key}': ${error.message}`);
    }
  }

  /**
   * Check if a reference exists
   *
   * @param refKey - Reference key to check
   * @returns Promise resolving to true if reference exists
   */
  async hasReference(refKey: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      return await sqliteStorage.hasReference(refKey);
    } catch (error: any) {
      budgetLogger.error({ error: error.message, refKey }, "Storage hasReference operation failed");
      throw new Error(`Failed to check reference '${refKey}': ${error.message}`);
    }
  }

  /**
   * Add a reference to prevent replay attacks
   *
   * @param refKey - Reference key to add
   * @param options - Additional options (not used in SQLite implementation)
   */
  async addReference(refKey: string, options?: any): Promise<void> {
    this.ensureInitialized();

    try {
      await sqliteStorage.addReference(refKey);
    } catch (error: any) {
      budgetLogger.error({ error: error.message, refKey }, "Storage addReference operation failed");
      throw new Error(`Failed to add reference '${refKey}': ${error.message}`);
    }
  }

  /**
   * Get the budget amount for a payer
   *
   * @param payerPubkey - Payer's public key
   * @returns Promise resolving to the budget amount as string
   */
  async getBudget(payerPubkey: string): Promise<string> {
    this.ensureInitialized();

    try {
      return await sqliteStorage.getBudget(payerPubkey);
    } catch (error: any) {
      budgetLogger.error({ error: error.message, payerPubkey }, "Storage getBudget operation failed");
      throw new Error(`Failed to get budget for '${payerPubkey}': ${error.message}`);
    }
  }

  /**
   * Set the budget amount for a payer
   *
   * @param payerPubkey - Payer's public key
   * @param amount - Budget amount as string
   * @param options - Additional options (not used in SQLite implementation)
   */
  async setBudget(payerPubkey: string, amount: string, options?: any): Promise<void> {
    this.ensureInitialized();

    try {
      await sqliteStorage.setBudget(payerPubkey, amount);
    } catch (error: any) {
      budgetLogger.error({ error: error.message, payerPubkey, amount }, "Storage setBudget operation failed");
      throw new Error(`Failed to set budget for '${payerPubkey}': ${error.message}`);
    }
  }

  /**
   * Process a top-up payment
   *
   * @param context - Top-up payment context
   */
  async processTopUp(context: any): Promise<void> {
    this.ensureInitialized();

    try {
      return await sqliteStorage.processTopUp(context);
    } catch (error: any) {
      budgetLogger.error({ error: error.message, context }, "Storage processTopUp operation failed");
      throw new Error(`Failed to process top-up: ${error.message}`);
    }
  }

  /**
   * Process an article payment
   *
   * @param context - Article payment context
   * @returns Promise resolving to payment result
   */
  async processArticlePayment(context: any): Promise<any> {
    this.ensureInitialized();

    try {
      return await sqliteStorage.processArticlePayment(context);
    } catch (error: any) {
      budgetLogger.error({ error: error.message, context }, "Storage processArticlePayment operation failed");
      throw new Error(`Failed to process article payment: ${error.message}`);
    }
  }

  /**
   * Process a one-time article payment
   *
   * @param signatureId - Transaction signature ID
   * @param from - Sender wallet address
   * @param to - Recipient wallet address
   * @param solanaCluster - Solana cluster ('mainnet-beta' or 'devnet')
   * @param amount - Payment amount in smallest unit
   * @param decimal - Token decimal places
   * @param tokenSymbol - Token symbol
   * @param tokenMintAddress - Token mint address
   * @param articleId - Article identifier
   * @param memoValue - Optional memo value
   */
  async processOneTimeArticlePayment(
    signatureId: string,
    from: string,
    to: string,
    solanaCluster: 'mainnet-beta' | 'devnet',
    amount: number,
    decimal: number,
    tokenSymbol: string,
    tokenMintAddress: string,
    articleId: string,
    memoValue?: string
  ): Promise<void> {
    this.ensureInitialized();

    try {
      return await sqliteStorage.processOneTimeArticlePayment(
        signatureId, from, to, solanaCluster,
        amount, decimal, tokenSymbol, tokenMintAddress, articleId, memoValue
      );
    } catch (error: any) {
      budgetLogger.error({
        error: error.message,
        signatureId,
        from,
        to,
        solanaCluster,
        amount,
        articleId
      }, "Storage processOneTimeArticlePayment operation failed");
      throw new Error(`Failed to process one-time article payment: ${error.message}`);
    }
  }

  /**
   * Get transfers by wallet address
   *
   * @param wallet - Wallet address
   * @param limit - Maximum number of transfers to return
   * @returns Promise resolving to array of transfer records
   */
  async getTransfersByWallet(wallet: string, limit: number = 50): Promise<any[]> {
    this.ensureInitialized();

    try {
      return await sqliteStorage.getTransfersByWallet(wallet, limit);
    } catch (error: any) {
      budgetLogger.error({ error: error.message, wallet, limit }, "Storage getTransfersByWallet operation failed");
      throw new Error(`Failed to get transfers for wallet '${wallet}': ${error.message}`);
    }
  }

  /**
   * Get transfers by type
   *
   * @param typeTx - Transaction type ('top-up', 'article', 'article-one-time')
   * @param limit - Maximum number of transfers to return
   * @returns Promise resolving to array of transfer records
   */
  async getTransfersByType(typeTx: string, limit: number = 50): Promise<any[]> {
    this.ensureInitialized();

    try {
      return await sqliteStorage.getTransfersByType(typeTx, limit);
    } catch (error: any) {
      budgetLogger.error({ error: error.message, typeTx, limit }, "Storage getTransfersByType operation failed");
      throw new Error(`Failed to get transfers by type '${typeTx}': ${error.message}`);
    }
  }

  /**
   * Get a specific transfer by signature ID
   *
   * @param signatureId - Transaction signature ID
   * @returns Promise resolving to transfer record or null
   */
  async getTransfer(signatureId: string): Promise<any> {
    this.ensureInitialized();

    try {
      return await sqliteStorage.getTransfer(signatureId);
    } catch (error: any) {
      budgetLogger.error({ error: error.message, signatureId }, "Storage getTransfer operation failed");
      throw new Error(`Failed to get transfer '${signatureId}': ${error.message}`);
    }
  }

  /**
   * Get all budget balances for a wallet across all tokens and clusters
   *
   * @param walletAddress - Wallet address
   * @returns Promise resolving to array of budget balances
   */
  async getAllBudgetBalances(walletAddress: string): Promise<any[]> {
    this.ensureInitialized();

    try {
      return await sqliteStorage.getAllBudgetBalances(walletAddress);
    } catch (error: any) {
      budgetLogger.error({ error: error.message, walletAddress }, "Storage getAllBudgetBalances operation failed");
      throw new Error(`Failed to get all budget balances: ${error.message}`);
    }
  }

  /**
   * Get budget balance for a specific wallet, cluster, and token
   *
   * @param walletAddress - Wallet address
   * @param solanaCluster - Solana cluster
   * @param tokenMintAddress - Token mint address
   * @returns Promise resolving to budget balance or null
   */
  async getBudgetBalance(
    walletAddress: string,
    solanaCluster: 'mainnet-beta' | 'devnet',
    tokenMintAddress: string
  ): Promise<any> {
    this.ensureInitialized();

    try {
      return await sqliteStorage.getBudgetBalance(walletAddress, solanaCluster, tokenMintAddress);
    } catch (error: any) {
      budgetLogger.error({
        error: error.message,
        walletAddress,
        solanaCluster,
        tokenMintAddress
      }, "Storage getBudgetBalance operation failed");
      throw new Error(`Failed to get budget balance: ${error.message}`);
    }
  }

  /**
   * Update budget balance for a specific wallet, cluster, and token
   *
   * @param walletAddress - Wallet address
   * @param solanaCluster - Solana cluster
   * @param tokenMintAddress - Token mint address
   * @param amount - New balance amount in smallest unit
   * @param decimal - Token decimal places
   * @param tokenSymbol - Token symbol
   */
  async updateBudgetBalance(
    walletAddress: string,
    solanaCluster: 'mainnet-beta' | 'devnet',
    tokenMintAddress: string,
    amount: number,
    decimal: number,
    tokenSymbol: string
  ): Promise<void> {
    this.ensureInitialized();

    try {
      await sqliteStorage.updateBudgetBalance(
        walletAddress, solanaCluster, tokenMintAddress,
        amount, decimal, tokenSymbol
      );
    } catch (error: any) {
      budgetLogger.error({
        error: error.message,
        walletAddress,
        solanaCluster,
        tokenMintAddress,
        amount
      }, "Storage updateBudgetBalance operation failed");
      throw new Error(`Failed to update budget balance: ${error.message}`);
    }
  }

  /**
   * Check if a wallet has sufficient budget for a payment
   *
   * @param walletAddress - Wallet address
   * @param solanaCluster - Solana cluster
   * @param tokenMintAddress - Token mint address
   * @param requiredAmount - Required amount in smallest unit
   * @returns Promise resolving to true if sufficient budget exists
   */
  async hasSufficientBudget(
    walletAddress: string,
    solanaCluster: 'mainnet-beta' | 'devnet',
    tokenMintAddress: string,
    requiredAmount: number
  ): Promise<boolean> {
    this.ensureInitialized();

    try {
      return await sqliteStorage.hasSufficientBudget(
        walletAddress, solanaCluster, tokenMintAddress, requiredAmount
      );
    } catch (error: any) {
      budgetLogger.error({
        error: error.message,
        walletAddress,
        solanaCluster,
        tokenMintAddress,
        requiredAmount
      }, "Storage hasSufficientBudget operation failed");
      throw new Error(`Failed to check sufficient budget: ${error.message}`);
    }
  }

  /**
   * Add amount to budget balance
   *
   * @param walletAddress - Wallet address
   * @param solanaCluster - Solana cluster
   * @param tokenMintAddress - Token mint address
   * @param amountToAdd - Amount to add in smallest unit
   * @param decimal - Token decimal places
   * @param tokenSymbol - Token symbol
   */
  async addToBudgetBalance(
    walletAddress: string,
    solanaCluster: 'mainnet-beta' | 'devnet',
    tokenMintAddress: string,
    amountToAdd: number,
    decimal: number,
    tokenSymbol: string
  ): Promise<void> {
    this.ensureInitialized();

    try {
      await sqliteStorage.addToBudgetBalance(
        walletAddress, solanaCluster, tokenMintAddress,
        amountToAdd, decimal, tokenSymbol
      );
    } catch (error: any) {
      budgetLogger.error({
        error: error.message,
        walletAddress,
        solanaCluster,
        tokenMintAddress,
        amountToAdd
      }, "Storage addToBudgetBalance operation failed");
      throw new Error(`Failed to add to budget balance: ${error.message}`);
    }
  }

  /**
   * Deduct amount from budget balance
   *
   * @param walletAddress - Wallet address
   * @param solanaCluster - Solana cluster
   * @param tokenMintAddress - Token mint address
   * @param amountToDeduct - Amount to deduct in smallest unit
   * @param decimal - Token decimal places
   * @param tokenSymbol - Token symbol
   * @returns Promise resolving to true if deduction was successful
   */
  async deductFromBudgetBalance(
    walletAddress: string,
    solanaCluster: 'mainnet-beta' | 'devnet',
    tokenMintAddress: string,
    amountToDeduct: number,
    decimal: number,
    tokenSymbol: string
  ): Promise<boolean> {
    this.ensureInitialized();

    try {
      return await sqliteStorage.deductFromBudgetBalance(
        walletAddress, solanaCluster, tokenMintAddress,
        amountToDeduct, decimal, tokenSymbol
      );
    } catch (error: any) {
      budgetLogger.error({
        error: error.message,
        walletAddress,
        solanaCluster,
        tokenMintAddress,
        amountToDeduct
      }, "Storage deductFromBudgetBalance operation failed");
      throw new Error(`Failed to deduct from budget balance: ${error.message}`);
    }
  }

  /**
   * Get database statistics
   *
   * @returns Object containing database statistics
   */
  getStats(): any {
    if (!this.initialized) {
      return {
        initialized: false,
        error: "Storage not initialized"
      };
    }

    try {
      return sqliteStorage.getDatabaseStats();
    } catch (error: any) {
      budgetLogger.error({ error: error.message }, "Storage getStats operation failed");
      return {
        initialized: this.initialized,
        error: error.message
      };
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.initialized) {
      try {
        await sqliteStorage.close();
        this.initialized = false;
        budgetLogger.info("Storage connection closed successfully");
      } catch (error: any) {
        budgetLogger.error({ error: error.message }, "Storage close operation failed");
        throw new Error(`Failed to close storage: ${error.message}`);
      }
    }
  }

  /**
   * Ensure storage is initialized
   * @throws {Error} If storage is not initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error("Storage not initialized. Call initialize() first.");
    }
  }
}

// Export singleton instance
export const storage = new StorageService();