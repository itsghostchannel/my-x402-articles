import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import { budgetLogger } from './logger';
import {
  TransferRecord,
  BudgetBalance,
  DatabaseConnection,
  PaymentContext,
  TopUpContext
} from './types';

let db: Database | null = null;

export class SQLiteStorageService {
  private dbPath: string;
  private initialized: boolean = false;

  constructor(dbPath: string = './storage.sqlite') {
    this.dbPath = dbPath;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      await this.createTables();
      this.initialized = true;
      budgetLogger.info({ dbPath: this.dbPath }, "SQLite database initialized successfully");
    } catch (error: any) {
      budgetLogger.error({ error: error.message, dbPath: this.dbPath }, "Failed to initialize SQLite database");
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!db) throw new Error('Database not initialized');

    // Create transfers table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS transfers (
        signature_id TEXT PRIMARY KEY,
        type_tx TEXT NOT NULL CHECK (type_tx IN ('top-up', 'article', 'article-one-time')),
        type_tx_nodes TEXT,
        from_address TEXT NOT NULL,
        to_address TEXT NOT NULL,
        solana_cluster TEXT NOT NULL CHECK (solana_cluster IN ('mainnet-beta', 'devnet')),
        amount INTEGER NOT NULL,
        decimal INTEGER NOT NULL,
        token_symbol TEXT NOT NULL,
        token_mint_address TEXT NOT NULL,
        memo_value TEXT,
        created_at INTEGER NOT NULL
      )
    `);

    // Create budget_balances table with unique constraint
    await db.exec(`
      CREATE TABLE IF NOT EXISTS budget_balances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wallet_address TEXT NOT NULL,
        solana_cluster TEXT NOT NULL CHECK (solana_cluster IN ('mainnet-beta', 'devnet')),
        amount INTEGER NOT NULL DEFAULT 0,
        decimal INTEGER NOT NULL,
        token_symbol TEXT NOT NULL,
        token_mint_address TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE(wallet_address, solana_cluster, token_mint_address)
      )
    `);

    // Create indexes for better performance
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_transfers_from_address ON transfers(from_address);
      CREATE INDEX IF NOT EXISTS idx_transfers_to_address ON transfers(to_address);
      CREATE INDEX IF NOT EXISTS idx_transfers_type_tx ON transfers(type_tx);
      CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON transfers(created_at);
      CREATE INDEX IF NOT EXISTS idx_budget_balances_wallet_cluster ON budget_balances(wallet_address, solana_cluster);
    `);

    budgetLogger.info("Database tables created successfully");
  }

  // Transfer management functions
  async createTransfer(transfer: Omit<TransferRecord, 'created_at'>): Promise<void> {
    if (!db) throw new Error('Database not initialized');

    const now = Math.floor(Date.now() / 1000);

    await db.run(
      `INSERT INTO transfers (
        signature_id, type_tx, type_tx_nodes, from_address, to_address,
        solana_cluster, amount, decimal, token_symbol, token_mint_address,
        memo_value, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transfer.signature_id,
        transfer.type_tx,
        transfer.type_tx_nodes,
        transfer.from,
        transfer.to,
        transfer.solana_cluster,
        transfer.amount,
        transfer.decimal,
        transfer.token_symbol,
        transfer.token_mint_address,
        transfer.memo_value,
        now
      ]
    );

    budgetLogger.info({
      signatureId: transfer.signature_id,
      type: transfer.type_tx,
      amount: transfer.amount
    }, "Transfer record created");
  }

  async getTransfer(signatureId: string): Promise<TransferRecord | null> {
    if (!db) throw new Error('Database not initialized');

    const row = await db.get(
      'SELECT * FROM transfers WHERE signature_id = ?',
      [signatureId]
    );

    return row ? this.mapRowToTransfer(row) : null;
  }

  async getTransfersByWallet(walletAddress: string, limit: number = 50): Promise<TransferRecord[]> {
    if (!db) throw new Error('Database not initialized');

    const rows = await db.all(
      'SELECT * FROM transfers WHERE from_address = ? OR to_address = ? ORDER BY created_at DESC LIMIT ?',
      [walletAddress, walletAddress, limit]
    );

    return rows.map(row => this.mapRowToTransfer(row));
  }

  async getTransfersByType(typeTx: string, limit: number = 50): Promise<TransferRecord[]> {
    if (!db) throw new Error('Database not initialized');

    const rows = await db.all(
      'SELECT * FROM transfers WHERE type_tx = ? ORDER BY created_at DESC LIMIT ?',
      [typeTx, limit]
    );

    return rows.map(row => this.mapRowToTransfer(row));
  }

  // Budget balance management functions
  async getBudgetBalance(
    walletAddress: string,
    solanaCluster: 'mainnet-beta' | 'devnet',
    tokenMintAddress: string
  ): Promise<BudgetBalance | null> {
    if (!db) throw new Error('Database not initialized');

    const row = await db.get(
      'SELECT * FROM budget_balances WHERE wallet_address = ? AND solana_cluster = ? AND token_mint_address = ?',
      [walletAddress, solanaCluster, tokenMintAddress]
    );

    return row ? this.mapRowToBudgetBalance(row) : null;
  }

async getAllBudgetBalances(walletAddress: string): Promise<BudgetBalance[]> {
    if (!db) throw new Error('Database not initialized');

    const rows = await db.all(
      'SELECT * FROM budget_balances WHERE wallet_address = ? ORDER BY solana_cluster, token_symbol',
      [walletAddress]
    );

    return rows.map(row => this.mapRowToBudgetBalance(row));
  }

  async updateBudgetBalance(
    walletAddress: string,
    solanaCluster: 'mainnet-beta' | 'devnet',
    tokenMintAddress: string,
    amount: number,
    decimal: number,
    tokenSymbol: string
  ): Promise<void> {
    if (!db) throw new Error('Database not initialized');

    const now = Math.floor(Date.now() / 1000);

    await db.run(`
      INSERT INTO budget_balances (
        wallet_address, solana_cluster, amount, decimal, token_symbol,
        token_mint_address, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(wallet_address, solana_cluster, token_mint_address)
      DO UPDATE SET
        amount = excluded.amount,
        decimal = excluded.decimal,
        token_symbol = excluded.token_symbol
    `, [
      walletAddress,
      solanaCluster,
      amount,
      decimal,
      tokenSymbol,
      tokenMintAddress,
      now
    ]);

    budgetLogger.info({
      walletAddress,
      solanaCluster,
      tokenMintAddress,
      amount
    }, "Budget balance updated");
  }

  async addToBudgetBalance(
    walletAddress: string,
    solanaCluster: 'mainnet-beta' | 'devnet',
    tokenMintAddress: string,
    amountToAdd: number,
    decimal: number,
    tokenSymbol: string
  ): Promise<void> {
    const currentBalance = await this.getBudgetBalance(walletAddress, solanaCluster, tokenMintAddress);
    const newAmount = currentBalance ? currentBalance.amount + amountToAdd : amountToAdd;

    await this.updateBudgetBalance(
      walletAddress,
      solanaCluster,
      tokenMintAddress,
      newAmount,
      decimal,
      tokenSymbol
    );
  }

  async deductFromBudgetBalance(
    walletAddress: string,
    solanaCluster: 'mainnet-beta' | 'devnet',
    tokenMintAddress: string,
    amountToDeduct: number,
    decimal: number,
    tokenSymbol: string
  ): Promise<boolean> {
    const currentBalance = await this.getBudgetBalance(walletAddress, solanaCluster, tokenMintAddress);

    if (!currentBalance || currentBalance.amount < amountToDeduct) {
      return false;
    }

    const newAmount = currentBalance.amount - amountToDeduct;
    await this.updateBudgetBalance(
      walletAddress,
      solanaCluster,
      tokenMintAddress,
      newAmount,
      decimal,
      tokenSymbol
    );

    return true;
  }

  // Payment processing functions
  async processTopUp(context: TopUpContext): Promise<void> {
    // Create transfer record
    await this.createTransfer({
      signature_id: context.signatureId,
      type_tx: 'top-up',
      from: context.from,
      to: context.to,
      solana_cluster: context.solanaCluster,
      amount: context.amount,
      decimal: context.decimal,
      token_symbol: context.tokenSymbol,
      token_mint_address: context.tokenMintAddress,
      memo_value: context.memoValue
    });

    // Update budget balance
    await this.addToBudgetBalance(
      context.from,
      context.solanaCluster,
      context.tokenMintAddress,
      context.amount,
      context.decimal,
      context.tokenSymbol
    );
  }

  async hasSufficientBudget(
    walletAddress: string,
    solanaCluster: 'mainnet-beta' | 'devnet',
    tokenMintAddress: string,
    requiredAmount: number
  ): Promise<boolean> {
    const balance = await this.getBudgetBalance(walletAddress, solanaCluster, tokenMintAddress);
    return balance ? balance.amount >= requiredAmount : false;
  }

  async processArticlePayment(context: PaymentContext): Promise<{ success: boolean; requiresOneTimePayment: boolean }> {
    const hasBudget = await this.hasSufficientBudget(
      context.walletAddress,
      context.solanaCluster,
      context.tokenMintAddress,
      context.amount
    );

    if (hasBudget) {
      // Deduct from budget and create article transfer
      const balance = await this.getBudgetBalance(
        context.walletAddress,
        context.solanaCluster,
        context.tokenMintAddress
      );

      if (balance) {
        await this.deductFromBudgetBalance(
          context.walletAddress,
          context.solanaCluster,
          context.tokenMintAddress,
          context.amount,
          balance.decimal,
          balance.token_symbol
        );

        // Create article transfer record
        const signatureId = `budget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await this.createTransfer({
          signature_id: signatureId,
          type_tx: 'article',
          type_tx_nodes: context.articleId,
          from: context.walletAddress,
          to: process.env.MY_WALLET_ADDRESS || '',
          solana_cluster: context.solanaCluster,
          amount: context.amount,
          decimal: balance.decimal,
          token_symbol: balance.token_symbol,
          token_mint_address: context.tokenMintAddress
        });

        return { success: true, requiresOneTimePayment: false };
      }
    }

    // Insufficient budget, requires one-time payment
    return { success: false, requiresOneTimePayment: true };
  }

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
    await this.createTransfer({
      signature_id: signatureId,
      type_tx: 'article-one-time',
      type_tx_nodes: articleId,
      from,
      to,
      solana_cluster: solanaCluster,
      amount,
      decimal,
      token_symbol: tokenSymbol,
      token_mint_address: tokenMintAddress,
      memo_value: memoValue
    });
  }

  // Utility functions
  private mapRowToTransfer(row: any): TransferRecord {
    return {
      signature_id: row.signature_id,
      type_tx: row.type_tx,
      type_tx_nodes: row.type_tx_nodes,
      from: row.from_address,
      to: row.to_address,
      solana_cluster: row.solana_cluster,
      amount: row.amount,
      decimal: row.decimal,
      token_symbol: row.token_symbol,
      token_mint_address: row.token_mint_address,
      memo_value: row.memo_value,
      created_at: row.created_at
    };
  }

  private mapRowToBudgetBalance(row: any): BudgetBalance {
    return {
      wallet_address: row.wallet_address,
      solana_cluster: row.solana_cluster,
      amount: row.amount,
      decimal: row.decimal,
      token_symbol: row.token_symbol,
      token_mint_address: row.token_mint_address,
      created_at: row.created_at
    };
  }

  // Compatibility functions for existing code
  async hasReference(refKey: string): Promise<boolean> {
    if (!db) throw new Error('Database not initialized');

    // Check if there's a transfer with this signature_id
    const transfer = await this.getTransfer(refKey);
    return transfer !== null;
  }

  async addReference(refKey: string): Promise<void> {
    // For compatibility, we don't need to do anything special here
    // The references are handled through transfer records
    budgetLogger.debug({ refKey }, "Reference added (compatibility mode)");
  }

  async getBudget(payerPubkey: string): Promise<string> {
    // For compatibility, return the sum of all budget balances for this wallet
    if (!db) throw new Error('Database not initialized');

    const row = await db.get(
      'SELECT SUM(amount) as total_amount FROM budget_balances WHERE wallet_address = ?',
      [payerPubkey]
    );

    return row && row.total_amount ? row.total_amount.toString() : "0";
  }

  async setBudget(payerPubkey: string, amount: string): Promise<void> {
    // This is a compatibility function - in the new system, budget is managed per token
    budgetLogger.warn({
      payerPubkey,
      amount,
      message: "setBudget called - consider using updateBudgetBalance instead"
    }, "Legacy setBudget function used");
  }

  // Statistics and debugging
  async getDatabaseStats(): Promise<any> {
    if (!db) throw new Error('Database not initialized');

    const [transferCount, budgetCount] = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM transfers'),
      db.get('SELECT COUNT(*) as count FROM budget_balances')
    ]);

    return {
      transfers: transferCount.count,
      budgetBalances: budgetCount.count,
      initialized: this.initialized,
      dbPath: this.dbPath
    };
  }

  async close(): Promise<void> {
    if (db) {
      await db.close();
      db = null;
      this.initialized = false;
      budgetLogger.info("Database connection closed");
    }
  }
}

export const sqliteStorage = new SQLiteStorageService();