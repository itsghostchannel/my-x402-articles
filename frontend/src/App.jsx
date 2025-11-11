import React, { useMemo, useState } from "react";
import { useIsInitialized, useIsSignedIn } from "@coinbase/cdp-hooks";
import Articles from "./Articles.jsx";
import { AuthButton } from "@coinbase/cdp-react/components/AuthButton";
import { AgentComponent } from "./AgentComponent.jsx";
import { X402Provider } from "./x402.jsx";
import WalletInfo from "./WalletInfo.jsx";
import UserCockpit from "./UserCockpit.jsx";

// Loading component
function Loading() {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Loading wallet...</p>
      </div>
    </div>
  );
}

// Sign In component
function SignInScreen() {
  return (
    <main className="min-h-screen bg-white text-gray-900 flex items-center justify-center">
      <div className="card card--login text-center p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Welcome!</h1>
        <p className="text-gray-600 mb-6">Please sign in to continue with X402 Articles.</p>
        <AuthButton />
      </div>
    </main>
  );
}

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

// Main App content after sign in
function AppContent() {
  const [showUserCockpit, setShowUserCockpit] = useState(false);

  const handleBackToHome = () => {
    setShowUserCockpit(false);
  };

  if (showUserCockpit) {
    return <UserCockpit onBackToHome={handleBackToHome} />;
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="container mx-auto p-4 lg:p-8">

        <header className="flex justify-between items-center gap-6 pb-4 mb-6 border-b border-gray-200">
          <h1
            className="text-2xl lg:text-4xl font-bold cursor-pointer hover:text-blue-600 transition-colors"
            onClick={() => setShowUserCockpit(false)}
          >
            My X402 Articles
          </h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowUserCockpit(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base font-medium flex items-center gap-2"
            >
              👤 User
            </button>
            <AuthButton />
          </div>
        </header>

        <div className="flex flex-col space-y-6">
          <div className="w-full">
            <WalletInfo />
          </div>
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
}

function App() {
  const { isInitialized } = useIsInitialized();
  const { isSignedIn } = useIsSignedIn();

  return (
    <ErrorBoundary>
      <X402Provider>
        <div className="app">
          {!isInitialized && <Loading />}
          {isInitialized && (
            <>
              {!isSignedIn && <SignInScreen />}
              {isSignedIn && <AppContent />}
            </>
          )}
        </div>
      </X402Provider>
    </ErrorBoundary>
  );
}

export default App;