import React, { useState, useEffect } from "react";
import { useSolanaAddress } from "@coinbase/cdp-hooks";
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";
import WalletInfo from "./WalletInfo.jsx";
import { getTokenSymbol, getTokenByMintAndCluster } from "./tokenMapping.js";

const UserCockpit = ({ onBackToHome }) => {
  const { solanaAddress } = useSolanaAddress();
  const [activeTab, setActiveTab] = useState('creator');
  const [creatorStats, setCreatorStats] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [budgetBalances, setBudgetBalances] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Get network from environment variable or default to devnet
  const network = import.meta.env.VITE_SOLANA_NETWORK || "devnet";
  const isMainnet = network === "mainnet-beta";

  // API base URL
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

  // Helper function to format address
  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Helper function to create Solscan links
  const createSolscanAddressLink = (address) => {
    if (!address) return '#';
    return `https://solscan.io/account/${address}?cluster=${network}`;
  };

  const createSolscanTxLink = (signature) => {
    if (!signature) return '#';
    return `https://solscan.io/tx/${signature}?cluster=${network}`;
  };

  // Helper function to format amount (rounded to 3 decimal places)
  const formatAmount = (amount, decimals = 6) => {
    if (!amount) return '0';
    const result = amount / Math.pow(10, decimals);
    return result.toFixed(3);
  };

  // Helper function to get transaction type display with tooltip
  const getTypeDisplay = (type) => {
    const types = {
      'top-up': { short: 'TOPUP', long: 'Top-up', color: 'bg-green-100 text-green-800' },
      'article': { short: 'A', long: 'Article (Budget)', color: 'bg-blue-100 text-blue-800' },
      'article-one-time': { short: 'AOT', long: 'Article One-time', color: 'bg-purple-100 text-purple-800' }
    };
    return types[type] || { short: 'UNKNOWN', long: type, color: 'bg-gray-100 text-gray-800' };
  };

  // Helper function to get cluster display with tooltip
  const getClusterDisplay = (cluster) => {
    const clusters = {
      'mainnet-beta': { short: 'M', long: 'Mainnet Beta', color: 'bg-red-100 text-red-800' },
      'devnet': { short: 'D', long: 'Devnet', color: 'bg-blue-100 text-blue-800' }
    };
    return clusters[cluster] || { short: '?', long: cluster, color: 'bg-gray-100 text-gray-800' };
  };

  // Helper function to group earnings by token and cluster
  const groupEarningsByTokenAndCluster = (earnings) => {
    const grouped = {};

    earnings?.forEach(earning => {
      const tokenSymbol = getTokenSymbol(earning.tokenMintAddress, earning.cluster) || earning.tokenSymbol || 'UNKNOWN';
      const cluster = earning.cluster || 'Unknown';
      const key = `${tokenSymbol}-${cluster}`;

      if (!grouped[key]) {
        grouped[key] = {
          tokenSymbol,
          cluster,
          totalAmount: 0,
          totalTransactions: 0,
          decimal: earning.decimal || 6,
          tokenMintAddress: earning.tokenSymbol
        };
      }

      grouped[key].totalAmount += earning.amount || 0;
      grouped[key].totalTransactions += earning.count || 0;
    });

    return Object.values(grouped);
  };

  // Helper function to format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Helper function to copy to clipboard
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // Helper function to export data to CSV
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) return;

    // Define CSV headers
    const headers = [
      'Signature ID',
      'Type',
      'From',
      'To',
      'Amount',
      'Token',
      'Cluster',
      'Date',
      'Memo'
    ];

    // Convert data to CSV format
    const csvData = data.map(transfer => [
      transfer.signature_id || 'N/A',
      transfer.type_tx || 'N/A',
      transfer.from || 'N/A',
      transfer.to || 'N/A',
      transfer.amount ? formatAmount(transfer.amount, transfer.decimal) : '0',
      getTokenSymbol(transfer.token_mint_address, transfer.solana_cluster) || transfer.token_symbol || 'UNKNOWN',
      transfer.solana_cluster || 'N/A',
      formatDate(transfer.created_at),
      transfer.memo_value || 'N/A'
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  
  // Fetch creator stats
  const fetchCreatorStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/creator/stats`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setCreatorStats(data);
    } catch (error) {
      console.error('Error fetching creator stats:', error);
      setError('Failed to fetch creator statistics');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user stats
  const fetchUserStats = async () => {
    if (!solanaAddress) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/user/stats?wallet=${solanaAddress}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setUserStats(data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      setError('Failed to fetch user statistics');
    } finally {
      setLoading(false);
    }
  };

  // Fetch budget balances
  const fetchBudgetBalances = async () => {
    if (!solanaAddress) return;

    try {
      const response = await fetch(`${API_BASE}/api/budget/${solanaAddress}/balances`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setBudgetBalances(data);
    } catch (error) {
      console.error('Error fetching budget balances:', error);
    }
  };

  // Fetch data when component mounts or tab changes
  useEffect(() => {
    if (activeTab === 'creator') {
      fetchCreatorStats();
    } else if (activeTab === 'user' && solanaAddress) {
      fetchUserStats();
      fetchBudgetBalances();
    }
  }, [activeTab, solanaAddress]);

  // Render transfers table
  const renderTransfersTable = (transfers, title, showExport = false, filenamePrefix = 'transfers') => (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        {showExport && (
          <button
            onClick={() => exportToCSV(transfers, `${filenamePrefix}-transfers-${new Date().toISOString().split('T')[0]}.csv`)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded hover:bg-gray-100"
            title="Export to CSV"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Signature ID
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                From
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                To
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Token
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cluster
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transfers.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                  No transfers found
                </td>
              </tr>
            ) : (
              transfers.map((transfer, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm">
                    {transfer.signature_id ? (
                      <a
                        href={createSolscanTxLink(transfer.signature_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        {formatAddress(transfer.signature_id)}
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {(() => {
                      const typeDisplay = getTypeDisplay(transfer.type_tx);
                      return (
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${typeDisplay.color}`}
                          title={typeDisplay.long}
                        >
                          {typeDisplay.short}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {transfer.from ? (
                      <a
                        href={createSolscanAddressLink(transfer.from)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        {formatAddress(transfer.from)}
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {transfer.to ? (
                      <a
                        href={createSolscanAddressLink(transfer.to)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        {formatAddress(transfer.to)}
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm font-medium">
                    {formatAmount(transfer.amount, transfer.decimal)}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {getTokenSymbol(transfer.token_mint_address, transfer.solana_cluster) || 'N/A'}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {(() => {
                      const clusterDisplay = getClusterDisplay(transfer.solana_cluster);
                      return (
                        <span
                          className={`px-1 py-0.5 text-xs rounded font-medium ${clusterDisplay.color}`}
                          title={clusterDisplay.long}
                        >
                          {clusterDisplay.short}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {formatDate(transfer.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="container mx-auto p-4 lg:p-8">
        {/* Header */}
        <header className="flex justify-between items-center gap-6 pb-4 mb-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToHome}
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              My X402 Articles
            </button>
            <h1 className="text-2xl lg:text-4xl font-bold">User Cockpit</h1>
          </div>
          <AuthButton />
        </header>

        {/* Wallet Information */}
        <div className="w-full mb-6">
          <WalletInfo />
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('creator')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'creator'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Creator Earnings
            </button>
            <button
              onClick={() => setActiveTab('user')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'user'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              disabled={!solanaAddress}
            >
              User Spendings
              {!solanaAddress && <span className="ml-2 text-xs text-gray-400">(Sign in required)</span>}
            </button>
          </nav>
        </div>

        {/* Loading Display */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span>Loading...</span>
          </div>
        )}

        {/* Creator Earnings Tab */}
        {activeTab === 'creator' && !loading && creatorStats && (
          <div className="space-y-6">
            {/* Creator Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Creator Wallet</h3>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold">
                    {creatorStats.creatorWallet ? (
                      <a
                        href={createSolscanAddressLink(creatorStats.creatorWallet)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        {formatAddress(creatorStats.creatorWallet)}
                      </a>
                    ) : (
                      'Not configured'
                    )}
                  </p>
                  {creatorStats.creatorWallet && (
                    <>
                      <button
                        onClick={() => copyToClipboard(creatorStats.creatorWallet)}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
                        title="Copy full address"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      {copiedAddress && (
                        <span className="text-green-600 font-medium text-sm animate-fade-in">
                          Copied!
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Total Articles</h3>
                <p className="text-lg font-semibold">{creatorStats.totalArticles || 0}</p>
              </div>
            </div>

            {/* Earnings Summary by Token and Cluster */}
            {creatorStats.earningsByToken && creatorStats.earningsByToken.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Earnings Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {groupEarningsByTokenAndCluster(creatorStats.earningsByToken).map((group, index) => (
                    <div key={index} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{group.tokenSymbol}</span>
                          {(() => {
                            const clusterDisplay = getClusterDisplay(group.cluster);
                            return (
                              <span
                                className={`px-2 py-1 text-xs rounded font-medium ${clusterDisplay.color}`}
                                title={clusterDisplay.long}
                              >
                                {clusterDisplay.short}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Total:</span>
                          <span className="font-semibold text-green-600">
                            {formatAmount(group.totalAmount, group.decimal)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400">Transactions:</span>
                          <span className="text-xs text-gray-600">{group.totalTransactions}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Transfers */}
            {renderTransfersTable(creatorStats.recentTransfers || [], 'Recent Transfers', true, 'creator')}
          </div>
        )}

        {/* User Spendings Tab */}
        {activeTab === 'user' && !loading && userStats && (
          <div className="space-y-6">

            {/* How Top-ups Appear */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-medium text-blue-800 mb-2">💡 About Top-up Transactions</h3>
              <p className="text-sm text-blue-700">
                Top-up transactions will appear in "Your Recent Transactions" below after you successfully complete a budget deposit.
                They are marked with the "TOPUP" type and show the amount added to your budget.
              </p>
              {userStats && userStats.totalTransfers === 0 && (
                <p className="text-sm text-blue-600 mt-2 font-medium">
                  No transactions found yet. Try making a deposit to see your transactions here.
                </p>
              )}
            </div>

            {/* Spending Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="col-span-full bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Total Transactions</h3>
                <p className="text-lg font-semibold">{userStats.totalTransfers || 0}</p>
              </div>

              {/* Current Budget Balances and Assets - Side by Side */}
              <div className="col-span-full grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Current Budget Balances */}
                {budgetBalances && budgetBalances.budgetBalances && budgetBalances.budgetBalances.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Budget Balances</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {budgetBalances.budgetBalances.map((balance, index) => {
                        const tokenSymbol = getTokenSymbol(balance.tokenMintAddress, balance.solanaCluster) || balance.tokenSymbol || 'UNKNOWN';
                        const clusterDisplay = getClusterDisplay(balance.solanaCluster);

                        return (
                          <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">{tokenSymbol}</span>
                                <span
                                  className={`px-2 py-1 text-xs rounded font-medium ${clusterDisplay.color}`}
                                  title={clusterDisplay.long}
                                >
                                  {clusterDisplay.short}
                                </span>
                              </div>
                            </div>
                            <div className="text-lg font-bold text-green-600">
                              {formatAmount(balance.amount * Math.pow(10, balance.decimal), balance.decimal)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Available for spending
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Assets */}
                {(() => {
                  // Consolidate spending by final display token symbol
                  const consolidatedSpending = {};

                  if (userStats.spendingByToken && userStats.spendingByToken.length > 0) {
                    userStats.spendingByToken.forEach((item) => {
                      const tokenSymbol = getTokenSymbol(item.tokenMintAddress, item.cluster) || item.tokenSymbol || 'UNKNOWN';

                      if (!consolidatedSpending[tokenSymbol]) {
                        consolidatedSpending[tokenSymbol] = {
                          tokenSymbol,
                          spent: 0,
                          topUp: 0,
                          decimal: item.decimal,
                          articlePayments: 0,
                          oneTimePayments: 0,
                          cluster: item.cluster // Keep first cluster for display
                        };
                      }

                      // Accumulate values
                      consolidatedSpending[tokenSymbol].spent += item.spent || 0;
                      consolidatedSpending[tokenSymbol].topUp += item.topUp || 0;
                      consolidatedSpending[tokenSymbol].articlePayments += item.articlePayments || 0;
                      consolidatedSpending[tokenSymbol].oneTimePayments += item.oneTimePayments || 0;
                    });
                  }

                  if (Object.keys(consolidatedSpending).length > 0) {
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Assets</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.values(consolidatedSpending).map((item, index) => {
                            const clusterDisplay = getClusterDisplay(item.cluster);
                            return (
                              <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-900">{item.tokenSymbol}</span>
                                    <span
                                      className={`px-2 py-1 text-xs rounded font-medium ${clusterDisplay.color}`}
                                      title={clusterDisplay.long}
                                    >
                                      {clusterDisplay.short}
                                    </span>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-500">Spent:</span>
                                    <span className="font-semibold text-red-600 text-sm">
                                      {formatAmount(item.spent * Math.pow(10, item.decimal), item.decimal)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-500">Top-ups:</span>
                                    <span className="font-semibold text-green-600 text-sm">
                                      {formatAmount(item.topUp * Math.pow(10, item.decimal), item.decimal)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-400">Transactions:</span>
                                    <span className="text-xs text-gray-600">
                                      {item.articlePayments + item.oneTimePayments}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Assets</h3>
                        <div className="text-sm text-gray-500">
                          <p>No transaction data available</p>
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>

            {/* Recent Transfers */}
            {renderTransfersTable(userStats.recentTransfers || [], 'Your Recent Transactions', true, 'user')}
          </div>
        )}
        </div>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-gray-200">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center text-sm text-gray-500">
            Built with ❤️ in Berlin on Solana • © 2025
          </div>
        </div>
      </footer>
    </div>
  );
};

export default UserCockpit;