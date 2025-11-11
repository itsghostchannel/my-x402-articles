import React from 'react';

const PaymentInfoDialog = ({
  isOpen,
  onClose,
  paymentInfo,
  articleTitle
}) => {
  if (!isOpen) return null;

  const {
    paymentMethod,
    signature,
    amount,
    isOneTimePayment,
    accessMethod
  } = paymentInfo || {};

  // Get network from environment variable or default to devnet
  const network = import.meta.env.VITE_SOLANA_NETWORK || "devnet";
  const isMainnet = network === "mainnet-beta";

  // Helper function to create Solscan links
  const createSolscanTxLink = (signature) => {
    if (!signature) return '#';
    return `https://solscan.io/tx/${signature}?cluster=${network}`;
  };

  // Helper function to format signature for display
  const formatSignature = (signature) => {
    if (!signature) return 'N/A';
    return `${signature.slice(0, 8)}...${signature.slice(-8)}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {isOneTimePayment ? '🔓 Article Access Granted' : '📖 Article Access Granted'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Article Information */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Article:</p>
            <p className="font-semibold text-gray-900">{articleTitle || 'Unknown Article'}</p>
          </div>

          {/* Payment Method Information */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Payment Method:</p>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              isOneTimePayment
                ? 'bg-purple-100 text-purple-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {isOneTimePayment ? '💳 One-Time Payment' : '💰 Budget Balance'}
            </div>
          </div>

          {/* Transaction Details for One-Time Payments */}
          {isOneTimePayment && signature && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Transaction Details:</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Signature ID:</span>
                  <a
                    href={createSolscanTxLink(signature)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline font-mono text-sm"
                  >
                    {formatSignature(signature)}
                  </a>
                </div>
                {amount && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Amount:</span>
                    <span className="font-semibold text-gray-900">{amount} USDC</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Network:</span>
                  <span className={`px-2 py-1 text-xs rounded font-medium ${
                    isMainnet
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {isMainnet ? 'MAINNET' : 'DEVNET'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Budget Access Information */}
          {!isOneTimePayment && (
            <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700">
                <span className="font-semibold">✓ Budget Access:</span> This article was accessed using your existing budget balance. No additional payment was required for this access.
              </p>
            </div>
          )}

          {/* Action Button */}
          <div className="mt-6">
            <button
              onClick={onClose}
              className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Continue Reading
            </button>
          </div>

          {/* Footer */}
          {isOneTimePayment && signature && (
            <div className="mt-4 text-center text-xs text-gray-500">
              Transaction ID: {signature.slice(0, 12)}...{signature.slice(-12)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentInfoDialog;