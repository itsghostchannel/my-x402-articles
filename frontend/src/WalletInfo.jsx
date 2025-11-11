import React, { useState, useEffect } from "react";
import { useSolanaAddress } from "@coinbase/cdp-hooks";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";

const WalletInfo = () => {
  const { solanaAddress } = useSolanaAddress();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tokenBalances, setTokenBalances] = useState({ CASH: null, USDC: null });
  const [tokenLoading, setTokenLoading] = useState(false);

  // Get network from environment variable or default to devnet
  const network = import.meta.env.VITE_SOLANA_NETWORK || "devnet";
  const isMainnet = network === "mainnet-beta";

  // Token configurations
  const tokenConfigs = {
    CASH: {
      devnet: "CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH",
      mainnet: "CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH",
      decimals: 6, // Assuming 6 decimals, adjust if needed
      symbol: "CASH"
    },
    USDC: {
      devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
      mainnet: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      decimals: 6,
      symbol: "USDC"
    }
  };

  // Create connection to Solana network
  const connection = new Connection(clusterApiUrl(network));

  // Fetch token balances
  const fetchTokenBalances = async () => {
    if (!solanaAddress) return;

    setTokenLoading(true);
    try {
      const publicKey = new PublicKey(solanaAddress);
      const balances = { ...tokenBalances };

      for (const [symbol, config] of Object.entries(tokenConfigs)) {
        try {
          const mintAddress = isMainnet ? config.mainnet : config.devnet;
          const mintPubKey = new PublicKey(mintAddress);
          const tokenAccountAddress = await getAssociatedTokenAddress(mintPubKey, publicKey);

          const accountInfo = await getAccount(connection, tokenAccountAddress);
          const balanceInSmallestUnit = Number(accountInfo.amount);
          const normalizedBalance = balanceInSmallestUnit / Math.pow(10, config.decimals);

          balances[symbol] = normalizedBalance;
        } catch (error) {
          // Token account doesn't exist or other error - set to null
          console.log(`No ${symbol} account found or error fetching balance:`, error.message);
          balances[symbol] = null;
        }
      }

      setTokenBalances(balances);
    } catch (error) {
      console.error("Error fetching token balances:", error);
    } finally {
      setTokenLoading(false);
    }
  };

  // Fetch SOL balance
  const fetchBalance = async () => {
    if (!solanaAddress) return;

    setLoading(true);
    try {
      const publicKey = new PublicKey(solanaAddress);
      const balanceInLamports = await connection.getBalance(publicKey);
      const balanceInSOL = balanceInLamports / 1e9; // Convert lamports to SOL
      setBalance(balanceInSOL);
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance(null);
    } finally {
      setLoading(false);
    }
  };

  // Copy address to clipboard
  const copyAddress = async () => {
    if (!solanaAddress) return;

    try {
      await navigator.clipboard.writeText(solanaAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (error) {
      console.error("Error copying address:", error);
    }
  };

  // Fetch balance when component mounts or address changes
  useEffect(() => {
    fetchBalance();
    fetchTokenBalances();
  }, [solanaAddress, network]); // Added network dependency to refetch on network change

  if (!solanaAddress) {
    return null;
  }

  // Format address for display (show first 6 and last 4 characters)
  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
      {/* Network indicator */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${isMainnet ? 'bg-red-500' : 'bg-blue-500'}`}></div>
        <span className="text-xs font-medium text-gray-600">
          {isMainnet ? 'MAINNET' : 'DEVNET'}
        </span>
      </div>

      {/* Wallet information */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Address display with copy functionality */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Address:</span>
          <button
            onClick={copyAddress}
            className="flex items-center gap-1 text-sm font-mono text-gray-900 hover:text-blue-600 transition-colors cursor-pointer bg-transparent border-none p-0"
            title="Click to copy address"
          >
            <span>{formatAddress(solanaAddress)}</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
          {copied && (
            <span className="text-xs text-green-600">Copied!</span>
          )}
        </div>

        {/* Balance display */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Balance:</span>
          {loading || tokenLoading ? (
            <div className="flex items-center gap-1">
              <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
              <span className="text-sm text-gray-500">Loading...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">
                {balance !== null ? `${balance.toFixed(3)} SOL` : '0.000 SOL'}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                | {tokenBalances.CASH !== null ? `${tokenBalances.CASH.toFixed(3)} CASH` : '0.000 CASH'}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                | {tokenBalances.USDC !== null ? `${tokenBalances.USDC.toFixed(3)} USDC` : '0.000 USDC'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletInfo;