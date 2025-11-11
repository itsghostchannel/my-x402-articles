import React, { useState, useEffect } from "react";
import { useX402 } from "./useX402";
import { useIsSignedIn } from "@coinbase/cdp-hooks";
import { SendSolanaTransactionButton } from "@coinbase/cdp-react/components/SendSolanaTransactionButton";
import PaymentInfoDialog from "./PaymentInfoDialog.jsx";

function Articles() {
  const { fetchWith402, API_BASE, solanaAddress, createPaymentTransaction, isWalletError } = useX402();
  const { isSignedIn } = useIsSignedIn();

  // State for articles data
  const [freeArticles, setFreeArticles] = useState([]);
  const [premiumArticles, setPremiumArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('premium');

  // Payment state
  const [pendingPayment, setPendingPayment] = useState(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentDialogInfo, setPaymentDialogInfo] = useState(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  // Re-fetch articles when wallet connects/disconnects
  useEffect(() => {
    if (isSignedIn && solanaAddress) {
      console.log("Wallet connected, re-fetching articles...");
      fetchArticles();
    } else {
      console.log("Wallet disconnected, clearing state and re-fetching articles...");
      setSelectedArticle(null);
      setError(null);
      setPendingPayment(null);
      setShowPaymentDialog(false);
      setPaymentDialogInfo(null);
      fetchArticles();
    }
  }, [isSignedIn, solanaAddress]);

  const handlePaymentSuccess = async (signature, _originalUrl, _originalOptions, article) => {
    try {
      console.log("Article payment successful:", signature);
      console.log("Payment invoice details:", pendingPayment?.invoice);

      // Wait a brief moment for the blockchain to process
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Use the correct headers based on the backend API documentation
      console.log("Retrying article fetch with correct x402 headers...");

      const separator = pendingPayment?.url?.includes("?") ? "&" : "?";
      const retryUrl = `${pendingPayment?.url || `${API_BASE}/api/articles/${article.slug}`}${separator}reference=${pendingPayment?.invoice?.reference}`;

      // Convert amount to smallest unit (USDC has 6 decimals)
      const amountInSmallestUnit = Math.round(pendingPayment?.invoice?.amount * 1000000);

      console.log("Sending amount in smallest unit:", amountInSmallestUnit);

      const retryOptions = {
        ...pendingPayment?.options,
        headers: {
          ...pendingPayment?.options?.headers,
          'x402-payer-pubkey': solanaAddress, // lowercase as per API docs
          'Authorization': `x402 ${signature}`, // correct format
          // Try different header names for the amount
          'x402-amount': amountInSmallestUnit.toString(),
          'amount': amountInSmallestUnit.toString(),
          'x402-payment-amount': amountInSmallestUnit.toString(),
        },
      };

      console.log("Retry URL:", retryUrl);
      console.log("Retry options:", retryOptions);

      const finalRes = await fetch(retryUrl, retryOptions);

      if (!finalRes.ok) {
        const errorText = await finalRes.text();
        console.error("Retry failed:", finalRes.status, errorText);

        if (finalRes.status === 402) {
          // Backend still doesn't recognize payment - try one more approach
          console.log("Backend still requesting payment, trying direct fetchWith402 approach...");

          // Wait longer and try one more time with fetchWith402
          await new Promise(resolve => setTimeout(resolve, 5000));

          try {
            const articleData = await fetchWith402(`${API_BASE}/api/articles/${article.slug}`);
            console.log("Final fetchWith402 attempt result:", articleData);

            if (articleData) {
              setSelectedArticle({
                ...article,
                content: articleData.fullContent || articleData.content || article.excerpt
              });

              setPendingPayment(null);
              setError(null);
              return;
            }
          } catch (finalError) {
            console.error("Final fetchWith402 attempt failed:", finalError);
          }

          // All attempts failed
          const solscanUrl = `https://solscan.io/tx/${signature}?cluster=devnet`;
          setError({
            type: 'payment',
            text: "Payment processed but backend verification is still pending. The backend may not be configured to recognize this payment method. Transaction:",
            transactionLink: { url: solscanUrl, text: `${signature.slice(0, 8)}...${signature.slice(-8)}` }
          });
        } else {
          let finalError;
          try {
            finalError = JSON.parse(errorText);
          } catch {
            finalError = { error: errorText };
          }

          throw new Error(`Failed to retrieve article after payment: ${finalError.error || "Server error"}`);
        }
      } else {
        // Success!
        const result = await finalRes.json();
        console.log("Article retrieved successfully after payment:", result);

        // Show the article content after successful payment
        setSelectedArticle({
          ...article,
          content: result.fullContent || result.content || article.excerpt
        });

        // Show payment dialog
        setPaymentDialogInfo({
          paymentMethod: result.paymentMethod || 'one-time',
          signature: signature,
          amount: pendingPayment?.invoice?.amount,
          isOneTimePayment: true, // This was a one-time payment
          accessMethod: 'paid'
        });
        setShowPaymentDialog(true);

        setPendingPayment(null);
        setError(null);
      }
    } catch (error) {
      console.error("Payment verification failed:", error);

      const solscanUrl = `https://solscan.io/tx/${signature}?cluster=devnet`;
      setError({
        text: `Payment succeeded but verification failed: ${error.message}`,
        transactionLink: { url: solscanUrl, text: `${signature.slice(0, 8)}...${signature.slice(-8)}` }
      });

      setPendingPayment(null);
    }
  };

  const handlePaymentError = (error) => {
    console.error("Payment failed:", error);
    const errorMsg = isWalletError(error) ? "Transaction cancelled by user." : error.message;
    setError(`Payment failed: ${errorMsg}`);
    setPendingPayment(null);
  };

  const fetchArticles = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all articles
      const response = await fetch(`${API_BASE}/api/articles`);
      const data = await response.json();

      if (data.articles) {
        // Separate free and premium articles
        const free = data.articles.filter(article => !article.isPremium);
        const premium = data.articles.filter(article => article.isPremium);

        setFreeArticles(free);
        setPremiumArticles(premium);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArticleClick = async (article) => {
    setSelectedArticle(null);
    setError(null);

    if (!article.isPremium) {
      // For free articles, we can show them directly
      setSelectedArticle(article);
    } else {
      // For premium articles, check wallet connection first
      if (!isSignedIn || !solanaAddress) {
        setError("Error: Wallet not connected. Please sign in to access premium articles.");
        return;
      }

      // For premium articles, we need to use the x402 flow
      try {
        setIsLoading(true);
        const articleData = await fetchWith402(`${API_BASE}/api/articles/${article.slug}`);

        if (articleData) {
          setSelectedArticle({
            ...article,
            content: articleData.fullContent || articleData.content || article.excerpt
          });

          // Show payment dialog for budget access
          setPaymentDialogInfo({
            paymentMethod: articleData.paymentMethod || 'budget',
            signature: null, // Budget access doesn't have a transaction signature
            amount: null,
            isOneTimePayment: false, // This was budget access
            accessMethod: 'budget'
          });
          setShowPaymentDialog(true);
        }
      } catch (err) {
        // Check if it's a payment required error
        if (err.isPaymentRequired) {
          // Handle CDP payment flow - create transaction and show payment button
          const { invoice, url, options } = err;

          console.log("Received payment invoice:", invoice);

          try {
            const transactionData = await createPaymentTransaction(invoice, invoice.reference);

            setPendingPayment({
              invoice,
              transactionData,
              article, // Keep track of which article was being accessed
              url,
              options
            });

            setError({
          type: 'payment',
          message: `Payment required: ${invoice.amount} USDC to access this premium article.`
        });
          } catch (paymentError) {
            console.error("Error creating payment transaction:", paymentError);
            setError(`Failed to create payment transaction: ${paymentError.message}`);
          }
        } else if (err.message && err.message.includes("Wallet not connected")) {
          setError("Error: Wallet not connected. Please sign in again and try again.");
        } else {
          setError(err.message);
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const formatMarkdown = (text) => {
    if (!text) return '';

    return text
      // Remove first H1 title to avoid duplication with modal header
      .replace(/^# (.*$)\n*/gim, '')
      // Headers - Larger for better reading
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mt-6 mb-4 text-gray-900">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold mt-8 mb-5 text-gray-900">$1</h2>')
      // Bold text
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      // Italic text
      .replace(/\*(.+?)\*/g, '<em class="italic text-gray-800">$1</em>')
      // Line breaks between paragraphs
      .replace(/\n\n/g, '</p><p class="mb-6 text-gray-800">')
      // Wrap in paragraphs
      .replace(/^(.)/gim, '<p class="mb-6 text-gray-800 leading-relaxed">$1')
      .replace(/(.)$/gim, '$1</p>')
      // Fix any remaining line breaks
      .replace(/\n/g, '<br />');
  };

  const ArticleList = ({ articles, isPremium = false }) => (
    <div className="space-y-3">
      {articles.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          {isPremium ? "No premium articles available" : "No free articles available"}
        </p>
      ) : (
        articles.map((article) => (
          <div
            key={article.id}
            onClick={() => handleArticleClick(article)}
            className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
              isPremium
                ? 'border-blue-400 bg-blue-50 hover:bg-blue-100'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-900 flex-1">{article.title}</h3>
              <div className="flex items-center space-x-2">
                {isPremium && article.price && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-semibold">
                    {article.currencySymbol || '$'}{article.price.toFixed(2)}
                  </span>
                )}
                {isPremium && (
                  <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full">
                    PREMIUM
                  </span>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">{article.excerpt}</p>
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>By {article.author}</span>
              <span>{article.readTime} min read</span>
            </div>
            <div className="mt-1 text-xs text-gray-400">
              {new Date(article.date).toLocaleDateString()}
              {isPremium && article.currencyName && (
                <span className="ml-2">• {article.currencyName}</span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xl font-semibold mb-4">Articles</h2>

      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('premium')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'premium'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Premium Articles ({premiumArticles.length})
        </button>
        <button
          onClick={() => setActiveTab('free')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'free'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Free Articles ({freeArticles.length})
        </button>
      </div>

      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading articles...</div>
        </div>
      )}

      {error && (
        <div className={`mb-4 p-3 rounded-lg text-sm border ${
          error.type === 'payment'
            ? 'bg-yellow-50 border border-yellow-300 text-yellow-700'
            : 'bg-red-50 border border-red-300 text-red-700'
        }`}>
          <strong>{error.type === 'payment' ? 'Warning:' : 'Error:'}</strong>{' '}
          {typeof error === 'string' ? error : (error.text || error.message)}
          {error.transactionLink && (
            <span>
              {' '}Transaction:{' '}
              <a
                href={error.transactionLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline ml-1"
              >
                {error.transactionLink.text}
              </a>
            </span>
          )}
        </div>
      )}

      {/* Payment Button */}
      {pendingPayment && solanaAddress && (
        <div className="mb-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
          <h3 className="font-semibold text-sm mb-2">Complete Article Access</h3>
          <p className="text-sm text-gray-600 mb-3">
            Pay {pendingPayment.invoice.amount} USDC to access "{pendingPayment.article.title}"
          </p>
          <SendSolanaTransactionButton
            account={solanaAddress}
            network="solana-devnet"
            transaction={pendingPayment.transactionData}
            onSuccess={(signature) => handlePaymentSuccess(signature, pendingPayment.url, pendingPayment.options, pendingPayment.article)}
            onError={handlePaymentError}
          />
          <button
            onClick={() => {
              setPendingPayment(null);
              setError(null);
              setShowPaymentDialog(false);
              setPaymentDialogInfo(null);
            }}
            className="ml-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'free' ? (
            <ArticleList articles={freeArticles} isPremium={false} />
          ) : (
            <ArticleList articles={premiumArticles} isPremium={true} />
          )}
        </div>
      )}

      {selectedArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight max-w-4xl">
                  {selectedArticle.title}
                </h1>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="ml-6 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-1 text-base text-gray-600 border-b border-gray-200 pb-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">By {selectedArticle.author}</span>
                  <span className="text-gray-400">•</span>
                  <span>{new Date(selectedArticle.date).toLocaleDateString()}</span>
                  <span className="text-gray-400">•</span>
                  <span>{selectedArticle.readTime} min read</span>
                  {selectedArticle.isPremium && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                        PREMIUM ARTICLE
                      </span>
                      {selectedArticle.price && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                            {selectedArticle.currencySymbol || '$'}{selectedArticle.price.toFixed(2)}
                          </span>
                        </>
                      )}
                      {selectedArticle.currencyName && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-600">{selectedArticle.currencyName}</span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="prose prose-xl max-w-none mb-8">
                <div
                  className="text-gray-800 leading-relaxed text-lg"
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(selectedArticle.content || selectedArticle.excerpt)
                  }}
                />
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors text-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Info Dialog */}
      <PaymentInfoDialog
        isOpen={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        paymentInfo={paymentDialogInfo}
        articleTitle={selectedArticle?.title}
      />
    </div>
  );
}

export default Articles;