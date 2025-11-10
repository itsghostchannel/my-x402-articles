import { KVClient } from './types';
import { budgetLogger } from './logger';

class InMemoryStorage {
  private usedRefs = new Set<string>();
  private userBudgets = new Map<string, string>();

  // Reference management
  hasReference(refKey: string): boolean {
    return this.usedRefs.has(refKey);
  }

  addReference(refKey: string): void {
    this.usedRefs.add(refKey);
  }

  // Budget management
  getBudget(payerPubkey: string): string {
    return this.userBudgets.get(`budget_${payerPubkey}`) || "0";
  }

  setBudget(payerPubkey: string, amount: string): void {
    this.userBudgets.set(`budget_${payerPubkey}`, amount);
  }

  // Generic key-value operations
  get(key: string): string | boolean | null {
    if (key.startsWith("budget_")) {
      return this.userBudgets.get(key) || null;
    } else {
      return this.usedRefs.has(key);
    }
  }

  set(key: string, value: string | boolean): void {
    if (key.startsWith("budget_")) {
      this.userBudgets.set(key, value as string);
    } else if (value === true) {
      this.usedRefs.add(key);
    }
  }

  // Clear all data (useful for testing)
  clear(): void {
    this.usedRefs.clear();
    this.userBudgets.clear();
  }

  // Get storage statistics
  getStats() {
    return {
      usedReferences: this.usedRefs.size,
      userBudgets: this.userBudgets.size,
      totalBudgets: Array.from(this.userBudgets.values()).reduce((sum, val) => sum + BigInt(val), 0n).toString()
    };
  }
}

export class StorageService {
  private kvClient: KVClient | null = null;
  private inMemoryStorage = new InMemoryStorage();

  constructor() {}

  async initialize(): Promise<void> {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      try {
        const { kv } = await import("@vercel/kv");
        this.kvClient = kv;
        budgetLogger.info("Vercel KV client initialized successfully");
      } catch (e: any) {
        budgetLogger.warn({ error: e.message }, "Failed to initialize Vercel KV, using in-memory fallback");
        this.kvClient = null;
      }
    }
  }

  async get(key: string): Promise<string | boolean | null> {
    if (this.kvClient) {
      try {
        return await this.kvClient.get(key);
      } catch (e: any) {
        budgetLogger.warn({ error: e.message, key }, "KV get failed, using in-memory fallback");
        return this.inMemoryStorage.get(key);
      }
    }
    return this.inMemoryStorage.get(key);
  }

  async set(key: string, value: string | boolean, options?: any): Promise<void> {
    if (this.kvClient) {
      try {
        await this.kvClient.set(key, value, options);
        return;
      } catch (e: any) {
        budgetLogger.warn({ error: e.message, key }, "KV set failed, using in-memory fallback");
      }
    }
    this.inMemoryStorage.set(key, value);
  }

  async hasReference(refKey: string): Promise<boolean> {
    const value = await this.get(refKey);
    return Boolean(value);
  }

  async addReference(refKey: string, options?: any): Promise<void> {
    await this.set(refKey, true, options);
  }

  async getBudget(payerPubkey: string): Promise<string> {
    const budgetKey = `budget_${payerPubkey}`;
    const budget = await this.get(budgetKey);
    return typeof budget === 'string' ? budget : "0";
  }

  async setBudget(payerPubkey: string, amount: string, options?: any): Promise<void> {
    const budgetKey = `budget_${payerPubkey}`;
    await this.set(budgetKey, amount, options);
  }

  getStats() {
    return this.inMemoryStorage.getStats();
  }

  clear(): void {
    this.inMemoryStorage.clear();
  }
}

export const storage = new StorageService();