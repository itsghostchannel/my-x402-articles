import { useX402 } from "./useX402";
import React, { useState, useEffect, useRef } from "react";

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
  const [budgetAmount, setBudgetAmount] = useState(0.01);
  const [localError, setLocalError] = useState(null);
  const chatboxRef = useRef(null);
  const toolsFetchedRef = useRef(false);

  const { fetchWith402, depositBudget, isWalletError, API_BASE, publicKey } = useX402();

  useEffect(() => {
    // Only fetch tools once
    if (toolsFetchedRef.current) return;
    toolsFetchedRef.current = true;

    const fetchTools = async () => {
      try {
        const tools = await fetch(`${API_BASE}/api/agent/tools`).then((res) =>
          res.json()
        );
        setAvailableTools(tools);
        addMessage(
          "agent-info",
          `I have ${tools.length} tools ready to use: get_all_articles (Free), get_article_preview (Free), get_article_free (Free), and get_article (Paid).`
        );
      } catch (e) {
        setLocalError(e.message);
      }
    };
    fetchTools();
  }, [API_BASE]);

  // Re-fetch tools and clear state when wallet connects/disconnects
  useEffect(() => {
    if (publicKey) {
      addMessage("agent-info", "Wallet connected. I can now help you access premium articles and manage your budget.");
    } else {
      addMessage("agent-info", "Wallet disconnected. I can only help with free article previews.");
    }
  }, [publicKey]);

  useEffect(() => {
    if (chatboxRef.current) {
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (from, text) => {
    setMessages((prev) => [...prev, { from, text }]);
  };

  const handleSend = async () => {
    if (!prompt || isThinking) return;

    addMessage("user", prompt);
    const userPrompt = prompt;
    setPrompt("");
    setIsThinking(true);
    setLocalError(null);

    try {
      const normalizedPrompt = userPrompt.toLowerCase();
      const tool = availableTools.find((t) =>
        normalizedPrompt.includes(t.id)
      );
      let answer;

      if (tool) {
        if (!publicKey && tool.cost > 0) {
          answer = `Error: Wallet not connected. Please connect your wallet to use the "${tool.id}" tool, which costs ${tool.cost} tokens.`;
        } else {
          addMessage(
            "agent-thinking",
            `Tool "${tool.id}" found with estimated cost ${tool.cost} tokens (e.g., USDC). Initiating fetch using budget or 402 payment...`
          );

          const result = await fetchWith402(`${API_BASE}${tool.endpoint}`);
          if (result && result.context) {
            answer = `[${tool.id}] ${result.context} (Paid) using ${result.paymentMethod}`;
          } else {
            answer = `Failed to retrieve context: Unknown error`;
          }
        }
      } else {
        answer = "Sorry, I could not locate a suitable tool for that request. You might try using tools such as get_all_articles (Free), get_article_preview (Free), or get_article (Paid).";
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

    if (!publicKey) {
      setLocalError("Error: Wallet not connected. Please connect your wallet to deposit budget.");
      addMessage("agent-error", "Deposit failed: Wallet not connected. Please connect your wallet first.");
      return;
    }

    setIsThinking(true);
    setLocalError(null);
    addMessage(
      "agent-thinking",
      `Initiating budget deposit of ${budgetAmount} tokens...`
    );

    try {
      const sampleInvoiceUrl = `${API_BASE}${availableTools[0].endpoint}`;
      const result = await depositBudget(sampleInvoiceUrl, budgetAmount);

      if (result && result.success) {
        addMessage(
          "agent-info",
          `Budget deposit successful! Your new total budget is: ${result.newBudget} tokens.`
        );
      }
    } catch (err) {
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
        className="mt-4 border border-gray-200 rounded-lg p-4 h-40 overflow-y-auto bg-gray-50 space-y-3" 
      >
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`p-3 rounded-lg text-sm max-w-[85%] ${getMessageStyle(msg.from)}`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 flex flex-wrap items-center gap-1">
      <label htmlFor="budget" className="text-sm font-medium text-gray-700">
          Amount:
        </label>
        <input
          type="number"
          id="budget"
          value={budgetAmount}
          onChange={(e) => setBudgetAmount(parseFloat(e.target.value) || 0)}
          min="0.01"
          step="0.01"
          className="w-24 px-4 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm flex-grow"
        />
        <button
          onClick={handleTopUp}
          disabled={isThinking}
          className="bg-blue-600 text-white font-semibold text-sm py-2 px-8 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isThinking ? "Processing ..." : "Top-up"}
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
            className="bg-blue-600 text-white font-semibold py-2 px-5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isThinking ? "..." : "Ask"}
          </button>
        </div>
      </div>
    </div>
  );
}
