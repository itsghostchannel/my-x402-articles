import React, { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import Articles from "./Articles.jsx";
import { clusterApiUrl } from "@solana/web3.js";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { AgentComponent } from "./AgentComponent.jsx";
import { X402Provider } from "./x402.jsx";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Wallet Provider Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold mb-4">Wallet Initialization Error</h2>
            <p className="text-gray-600 mb-4">
              There was an issue initializing the wallet provider. Please refresh the page to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const solanaNetwork = "devnet";
  const endpoint = useMemo(() => clusterApiUrl(solanaNetwork), [solanaNetwork]);
  const wallets = useMemo(() => [], []);

  return (
    <ErrorBoundary>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets}>
          <WalletModalProvider>
            <X402Provider>
            <div className="min-h-screen bg-white text-gray-900">
              <div className="container mx-auto p-4 lg:p-8">
                
                <header className="flex justify-between items-center gap-6 pb-4 mb-6 border-b border-gray-200">
                  <h1 className="text-2xl lg:text-4xl font-bold">My X402 Articles</h1>
                  <WalletMultiButton />
                </header>

                <div className="flex flex-col space-y-6">
                  <div className="w-full">
                    <AgentComponent />
                  </div>
                  <div className="w-full">
                    <div className="h-full p-6 bg-white border border-gray-200 rounded-lg shadow">
                      <Articles />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </X402Provider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
    </ErrorBoundary>
  );
}

export default App;