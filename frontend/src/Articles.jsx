import React, { useState, useEffect } from "react";
import "@solana/wallet-adapter-react-ui/styles.css";
import { useX402 } from "./useX402";
import { useWallet } from "@solana/wallet-adapter-react";

function Articles() {
  const { fetchWith402, API_BASE } = useX402();
  const { publicKey } = useWallet();

  // State for articles data
  const [freeArticles, setFreeArticles] = useState([]);
  const [premiumArticles, setPremiumArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('premium');

  useEffect(() => {
    fetchArticles();
  }, []);

  // Re-fetch articles when wallet connects/disconnects
  useEffect(() => {
    if (publicKey) {
      console.log("Wallet connected, re-fetching articles...");
      fetchArticles();
    } else {
      console.log("Wallet disconnected, clearing state and re-fetching articles...");
      setSelectedArticle(null);
      setError(null);
      fetchArticles();
    }
  }, [publicKey]);

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
      if (!publicKey) {
        setError("Error: Wallet not connected. Please connect your wallet to access premium articles.");
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
        }
      } catch (err) {
        // Check if it's a wallet connection error
        if (err.message && err.message.includes("Wallet not connected")) {
          setError("Error: Wallet not connected. Please reconnect your wallet and try again.");
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
        <div className="mb-4 bg-red-50 border border-red-300 text-red-700 p-3 rounded-lg text-sm">
          <strong>Error:</strong> {error}
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
    </div>
  );
}

export default Articles;