import { useX402 } from "./useX402";
import React, { useState, useEffect, useRef } from "react";
import { SendSolanaTransactionButton } from "@coinbase/cdp-react/components/SendSolanaTransactionButton";
import ReactMarkdown from 'react-markdown';

export function AgentComponent() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([
    {
      from: "agent",
      text: "Hello! I'm your reader assistance agent. I use retrieval and guidance tools to help you explore and understand the articles available to you.",
    },
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [availableTools, setAvailableTools] = useState([]);
  const [budgetAmount, setBudgetAmount] = useState(0.50); // Match backend minimum deposit
  const [localError, setLocalError] = useState(null);
  const [pendingPayment, setPendingPayment] = useState(null);
  const chatboxRef = useRef(null);
  const toolsFetchedRef = useRef(false);

  const { fetchWith402, depositBudget, createPaymentTransaction, isWalletError, API_BASE, publicKey, solanaAddress, isSignedIn } = useX402();

  useEffect(() => {
    // Only fetch tools once
    if (toolsFetchedRef.current) return;
    toolsFetchedRef.current = true;

    const fetchTools = async () => {
      try {
        console.log("Fetching tools from:", `${API_BASE}/api/agent/tools`);
        const toolsRes = await fetch(`${API_BASE}/api/agent/tools`);
        console.log("Tools response status:", toolsRes.status);

        if (!toolsRes.ok) {
          throw new Error(`Failed to fetch tools: ${toolsRes.status} ${toolsRes.statusText}`);
        }

        const tools = await toolsRes.json();
        console.log("Fetched tools:", tools);

        setAvailableTools(tools);
        addMessage(
          "agent-info",
          `I have ${tools.length} tools ready to use: get_all_articles (Free), get_article_preview (Free), get_article_free (Free), and get_article (Paid - costs USDC).`
        );
      } catch (e) {
        console.error("Error fetching tools:", e);
        setLocalError(e.message);
        addMessage("agent-error", `Failed to load tools: ${e.message}. Please check if the backend API is running.`);
      }
    };
    fetchTools();
  }, [API_BASE]);

  // Re-fetch tools and clear state when wallet connects/disconnects
  useEffect(() => {
    if (isSignedIn && solanaAddress) {
      addMessage("agent-info", "Wallet connected. I can now help you access premium articles and manage your budget.");
    } else {
      addMessage("agent-info", "Wallet disconnected. I can only help with free article previews.");
    }
  }, [isSignedIn, solanaAddress]);

  useEffect(() => {
    if (chatboxRef.current) {
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (from, text) => {
    setMessages((prev) => [...prev, { from, text }]);
  };

  const handlePaymentSuccess = async (signature, originalUrl, originalOptions) => {
    try {
      addMessage("agent-thinking", "Payment successful! Verifying transaction...");

      let result;
      if (pendingPayment.toolId === 'deposit') {
        // Handle deposit confirmation - call the backend API to record the transaction
        console.log("Deposit transaction confirmed with signature:", signature);

        try {
          // Add signature to the request body for deposit confirmation
          const confirmOptions = {
            ...pendingPayment.options,
            body: JSON.stringify({
              ...JSON.parse(pendingPayment.options.body),
              signature: signature, // Add signature from completed transaction
            }),
          };

          const confirmResponse = await fetch(pendingPayment.url, confirmOptions);

          if (!confirmResponse.ok) {
            const errorData = await confirmResponse.json();
            throw new Error(`Deposit confirmation failed: ${errorData.error || 'Unknown error'}`);
          }

          const result = await confirmResponse.json();
          const solscanUrl = `https://solscan.io/tx/${signature}?cluster=devnet`;

          addMessage("agent-info", (
            <span>
              Budget deposit successful! Transaction signature:
              <a
                href={solscanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline ml-1"
              >
                {signature.slice(0, 8)}...{signature.slice(-8)}
              </a>
              {result.newBudget && (
                <span className="ml-2 text-green-600">
                  New budget: {result.newBudget} USDC
                </span>
              )}
            </span>
          ));
        } catch (error) {
          console.error("Deposit confirmation error:", error);
          addMessage("agent-error", `Deposit confirmation failed: ${error.message}`);
        }
      } else {
        // Handle regular payment retry
        const separator = originalUrl.includes("?") ? "&" : "?";
        const retryUrl = `${originalUrl}${separator}reference=${pendingPayment.invoice.reference}`;
        const finalRes = await fetch(retryUrl, {
          ...originalOptions,
          headers: {
            ...originalOptions.headers,
            Authorization: `x402 ${signature}`,
          },
        });

        if (!finalRes.ok) {
          const finalError = await finalRes.json();
          throw new Error(`Verification failed: ${finalError.error || "Server error"}`);
        }

        result = await finalRes.json();
        addMessage("agent", `Payment successful! [${pendingPayment.toolId}] ${result.context} (Paid) using payment method: ${result.paymentMethod || 'direct payment'}`);
      }

      setPendingPayment(null);
    } catch (error) {
      addMessage("agent-error", `Payment succeeded but verification failed: ${error.message}`);
      setPendingPayment(null);
    }
  };

  const handlePaymentError = (error) => {
    addMessage("agent-error", `Payment failed: ${error.message}`);
    setPendingPayment(null);
  };

  const handleSend = async () => {
    if (!prompt || isThinking) return;

    addMessage("user", prompt);
    const userPrompt = prompt;
    setPrompt("");
    setIsThinking(true);
    setLocalError(null);
    setPendingPayment(null);

    try {
      const normalizedPrompt = userPrompt.toLowerCase();
      const tool = availableTools.find((t) =>
        normalizedPrompt.includes(t.id)
      );
      let answer;

      if (tool) {
        if (!isSignedIn && tool.cost > 0) {
          answer = `Error: Wallet not connected. Please sign in to use the "${tool.id}" tool, which costs ${tool.cost} USDC.`;
        } else {
          addMessage(
            "agent-thinking",
            `Tool "${tool.id}" found with estimated cost ${tool.cost} USDC. Initiating fetch using budget or 402 payment...`
          );

          try {
            let url = `${API_BASE}${tool.endpoint}`;

            // For article-specific tools, extract article ID from prompt
            if (tool.id !== 'get_all_articles') {
              // Try to find an article ID in the prompt
              const articleMatch = userPrompt.match(/\b(blockchain_the_defibrillator_journalism_needs|building_media_infrastructure_that_outlasts_election_cycles|training_data_transparency_what_we_dont_know_about_my_origins|breaking_through_how_ctrlx_won_the_radar_hackathon_for_germany|encryption_is_dead_long_live_encryption)\b/i);
              if (articleMatch) {
                url += `?id=${articleMatch[1]}`;
              }
            }

            const result = await fetchWith402(url);
            if (result && result.context) {
              answer = `[${tool.id}] ${result.context} (Paid) using ${result.paymentMethod}`;
            } else {
              answer = `Failed to retrieve context: Unknown error`;
            }
          } catch (paymentErr) {
            if (paymentErr.isPaymentRequired) {
              // We need to show the transaction button for CDP
              const transactionData = await createPaymentTransaction(
                paymentErr.invoice,
                paymentErr.invoice.reference
              );

              setPendingPayment({
                invoice: paymentErr.invoice,
                transactionData,
                toolId: tool.id,
                url: paymentErr.url,
                options: paymentErr.options
              });

              answer = `Payment required for "${tool.id}" tool. Please complete the payment transaction below.`;
            } else {
              throw paymentErr;
            }
          }
        }
      } else {
        answer = "Sorry, I could not locate a suitable tool for that request. You might try using tools such as get_all_articles (Free), get_article_preview (Free), or get_article (Paid - costs USDC).";
      }
      addMessage("agent", answer);
    } catch (err) {
      const errorMsg = isWalletError(err) ? "Looks like user canceled the transaction." :
                      (err.message && err.message.includes("Wallet not connected")) ?
                      "Wallet not connected. Please reconnect your wallet and try again." : err.message;
      setLocalError(errorMsg);
      addMessage("agent-error", `Agent error: ${errorMsg}`);
    } finally {
      setIsThinking(false);
    }
  };

  const handleTopUp = async () => {
    if (!budgetAmount || budgetAmount <= 0) {
      setLocalError("Please enter a valid deposit amount.");
      return;
    }

    if (!isSignedIn) {
      setLocalError("Error: Wallet not connected. Please sign in to deposit budget.");
      addMessage("agent-error", "Deposit failed: Wallet not connected. Please sign in first.");
      return;
    }

    setIsThinking(true);
    setLocalError(null);

    // Validate minimum deposit amount
    if (budgetAmount < 0.50) {
      setLocalError(`Minimum deposit amount is 0.50 USDC. Please increase the amount.`);
      setIsThinking(false);
      return;
    }

    addMessage(
      "agent-thinking",
      `Initiating top-up of ${budgetAmount} USDC...`
    );

    try {
      // Call depositBudget with a dummy URL since it now creates its own invoice
      const result = await depositBudget("dummy-url", budgetAmount);
      console.log("Top-up result:", result);

      if (result && result.transactionData) {
        setPendingPayment({
          invoice: result.invoice,
          transactionData: result.transactionData,
          toolId: 'deposit',
          url: `${result.API_BASE}/api/budget/deposit/confirm`, // Use the correct backend endpoint
          options: {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reference: result.reference.replace('TOPUP-', ''), // Remove TOPUP- prefix for backend validation
              payerPubkey: result.payerPubkey,
              amount: result.amount,
            }),
          }
        });

        addMessage("agent-info", `Please complete the deposit transaction below to add ${budgetAmount} USDC to your budget.`);
      } else {
        throw new Error("No transaction data returned from depositBudget");
      }
    } catch (err) {
      console.error("Top-up error:", err);
      const errorMsg = isWalletError(err) ? "Transaction cancelled by user." :
                      (err.message && err.message.includes("Wallet not connected")) ?
                      "Wallet not connected. Please reconnect your wallet and try again." : err.message;
      setLocalError(errorMsg);
      addMessage("agent-error", `Deposit failed: ${errorMsg}`);
    } finally {
      setIsThinking(false);
    }
  };

  const getMessageStyle = (from) => {
    switch (from) {
      case 'user':
        return 'bg-blue-100 text-blue-900 text-right ml-auto';
      case 'agent':
        return 'bg-gray-100 text-gray-900';
      case 'agent-thinking':
        return 'bg-yellow-50 text-yellow-700 italic';
      case 'agent-info':
        return 'bg-green-50 text-green-700';
      case 'agent-error':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-gray-100 text-gray-900';
    }
  };

  return (
    <div className="h-full flex flex-col border border-gray-200 rounded-lg shadow p-6 bg-white">
      <h2 className="text-xl font-semibold mb-3">
      Articles Agent
      </h2>

      {localError && (
          <div className="mt-4 bg-red-50 border border-red-300 text-red-700 p-3 rounded-lg text-sm">
            <strong>Error:</strong> {localError}
          </div>
      )}

      <div
        ref={chatboxRef}
        className="mt-4 border border-gray-200 rounded-lg p-4 h-[500px] overflow-y-auto bg-gray-50 space-y-3"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg text-sm max-w-[85%] ${getMessageStyle(msg.from)}`}
          >
            {msg.from === 'agent' || msg.from === 'agent-thinking' ? (
              <ReactMarkdown
                components={{
                  h2: ({children}) => <h2 className="text-lg font-bold mb-3 text-gray-900">{children}</h2>,
                  h3: ({children}) => <h3 className="text-md font-semibold mb-2 text-gray-900">{children}</h3>,
                  p: ({children}) => <p className="mb-3 last:mb-0 text-gray-800 leading-relaxed">{children}</p>,
                  strong: ({children}) => <strong className="font-bold text-gray-900">{children}</strong>,
                  em: ({children}) => <em className="italic text-gray-700">{children}</em>,
                  hr: () => <hr className="my-4 border-gray-300" />,
                  ul: ({children}) => <ul className="list-disc ml-4 mb-3">{children}</ul>,
                  ol: ({children}) => <ol className="list-decimal ml-4 mb-3">{children}</ol>,
                  li: ({children}) => <li className="mb-1">{children}</li>,
                  code: ({children}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>
                }}
              >
                {msg.text}
              </ReactMarkdown>
            ) : (
              msg.text
            )}
          </div>
        ))}
      </div>

      {/* CDP Transaction Button */}
      {pendingPayment && solanaAddress && (
        <div className="mt-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
          <h3 className="font-semibold text-sm mb-2">
            {pendingPayment.toolId === 'deposit' ? 'Complete Deposit' : 'Complete Payment'}
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            {pendingPayment.toolId === 'deposit'
              ? `Top-up ${budgetAmount} USDC to your budget`
              : `Pay ${pendingPayment.invoice.amount} USDC for "${pendingPayment.toolId}" tool`
            }
          </p>
          <SendSolanaTransactionButton
            account={solanaAddress}
            network="solana-devnet"
            transaction={pendingPayment.transactionData}
            onSuccess={(signature) => handlePaymentSuccess(signature, pendingPayment.url, pendingPayment.options)}
            onError={handlePaymentError}
          />
          <button
            onClick={() => setPendingPayment(null)}
            className="ml-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="mt-4 p-4 flex flex-wrap items-center gap-1">
      <label htmlFor="budget" className="text-sm font-medium text-gray-700">
        USDC top-up amount:
        </label>
        <input
          type="number"
          id="budget"
          value={budgetAmount}
          onChange={(e) => setBudgetAmount(parseFloat(e.target.value) || 0)}
          min="0.50"
          step="0.01"
          className="w-24 px-4 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm flex-grow"
        />
        <button
          onClick={handleTopUp}
          disabled={isThinking}
          className="bg-blue-600 text-white font-semibold text-base py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {isThinking ? "Processing ..." : "💰 Top-up"}
        </button>
      </div>

      <div className="mt-auto pt-4"> 
        <div className="flex gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about articles..."
            className="flex-grow px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={isThinking}
            className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isThinking ? "..." : "🤖 Ask"}
          </button>
        </div>
      </div>
    </div>
  );
}
