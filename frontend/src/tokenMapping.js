// Static token mapping for User Cockpit
// Maps token mint addresses to symbols and clusters

export const TOKEN_MAPPINGS = [
  {
    token_mint_address: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    token_symbol: 'USDC',
    solana_cluster: 'devnet'
  },
  {
    token_mint_address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    token_symbol: 'USDC',
    solana_cluster: 'mainnet-beta'
  },
  {
    token_mint_address: 'CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH',
    token_symbol: 'CASH',
    solana_cluster: 'devnet'
  },
  {
    token_mint_address: 'CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH',
    token_symbol: 'CASH',
    solana_cluster: 'mainnet-beta'
  }
];

// Helper functions to get token information
export const getTokenSymbol = (mintAddress, cluster) => {
  const token = TOKEN_MAPPINGS.find(
    t => t.token_mint_address === mintAddress && t.solana_cluster === cluster
  );
  return token ? token.token_symbol : 'UNKNOWN';
};

export const getTokenByMintAndCluster = (mintAddress, cluster) => {
  return TOKEN_MAPPINGS.find(
    t => t.token_mint_address === mintAddress && t.solana_cluster === cluster
  );
};

export const getAllTokensForCluster = (cluster) => {
  return TOKEN_MAPPINGS.filter(t => t.solana_cluster === cluster);
};

export const getAllTokenSymbols = () => {
  return [...new Set(TOKEN_MAPPINGS.map(t => t.token_symbol))];
};