# Modules Documentation

## Overview

This document provides detailed information about each module in the X402 Frontend application, including their purpose, functionality, dependencies, and usage examples.

## Core Modules

### 1. App.jsx

**Purpose**: Main application component providing structure, error boundaries, and global setup.

**Location**: `src/App.jsx`

**Key Features**:
- Solana wallet provider initialization
- Error boundary for wallet initialization failures
- Responsive layout with header and main content areas
- Global state management integration

**Props**: None

**Dependencies**:
```javascript
import React, { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import Articles from "./Articles.jsx";
import { AgentComponent } from "./AgentComponent.jsx";
import { X402Provider } from "./x402.jsx";
```

**Configuration**:
- **Network**: Devnet (configurable via `solanaNetwork` constant)
- **Endpoint**: Auto-generated from Solana cluster API
- **Wallets**: Empty array (uses default wallet adapters)

**Error Handling**:
- Custom `ErrorBoundary` class for wallet initialization errors
- Graceful error UI with reload functionality
- Console error logging for debugging

**Usage Example**:
```javascript
// The App component is typically used as the root component:
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
```

**Styling**:
- Tailwind CSS classes for responsive design
- Custom error boundary styling
- Mobile-first responsive breakpoints

---

### 2. X402Provider (x402.jsx)

**Purpose**: Core payment processing system implementing the X402 protocol for Solana blockchain payments.

**Location**: `src/x402.jsx`

**Exports**:
- `X402Context`: React context for payment functionality
- `X402Provider`: Context provider component
- `isWalletError`: Utility function for error classification

**Key Methods**:

#### executePayment(invoice, memo)
**Purpose**: Execute SPL token transfer for payment processing

**Parameters**:
- `invoice` (Object): Payment invoice containing:
  - `token` (string): Token mint address
  - `recipientWallet` (string): Recipient wallet address
  - `amount` (number): Payment amount
- `memo` (string): Transaction memo/reference

**Returns**: `Promise<string>` - Transaction signature

**Process**:
1. Validate wallet connection
2. Create token transfer transaction
3. Handle recipient token account creation
4. Add memo instruction
5. Sign and send transaction
6. Wait for confirmation

**Example Usage**:
```javascript
const { executePayment } = useX402();

const invoice = {
  token: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC devnet
  recipientWallet: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  amount: 0.01
};

try {
  const signature = await executePayment(invoice, "ARTICLE-PAYMENT-123");
  console.log("Payment successful:", signature);
} catch (error) {
  console.error("Payment failed:", error);
}
```

#### fetchWith402(url, options)
**Purpose**: Enhanced fetch function that automatically handles 402 Payment Required responses

**Parameters**:
- `url` (string): API endpoint URL
- `options` (Object, optional): Fetch options including headers, method, etc.

**Returns**: `Promise<any>` - API response data

**Process**:
1. Add wallet public key to headers
2. Make initial request
3. Handle 402 responses by processing payment
4. Retry request with payment signature
5. Return final response data

**Example Usage**:
```javascript
const { fetchWith402 } = useX402();

try {
  const articleData = await fetchWith402('/api/articles/premium-article');
  console.log("Article content:", articleData);
} catch (error) {
  console.error("Failed to access article:", error);
}
```

#### depositBudget(invoiceUrl, amount)
**Purpose**: Deposit funds into user budget for seamless content access

**Parameters**:
- `invoiceUrl` (string): URL to fetch payment invoice
- `amount` (number): Deposit amount

**Returns**: `Promise<Object>` - Deposit confirmation with new budget amount

**Example Usage**:
```javascript
const { depositBudget } = useX402();

try {
  const result = await depositBudget('/api/tools/get-article', 0.05);
  console.log("New budget:", result.newBudget);
} catch (error) {
  console.error("Deposit failed:", error);
}
```

**Dependencies**:
```javascript
import { Buffer } from "buffer";
import React, { createContext, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { getMint, createTransferInstruction, getAssociatedTokenAddress,
         createAssociatedTokenAccountInstruction, getAccount } from "@solana/spl-token";
```

**Security Features**:
- Transaction validation before signing
- Automatic token account creation
- Error handling for insufficient funds
- Wallet operation error classification

---

### 3. AgentComponent.jsx

**Purpose**: Interactive AI agent interface for article discovery and assistance.

**Location**: `src/AgentComponent.jsx`

**Exports**: `AgentComponent` (named export)

**State Management**:

#### Local State
```javascript
const [prompt, setPrompt] = useState("");                    // User input
const [messages, setMessages] = useState([...]);            // Chat history
const [isThinking, setIsThinking] = useState(false);        // Processing state
const [availableTools, setAvailableTools] = useState([]);   // Available tools
const [budgetAmount, setBudgetAmount] = useState(0.01);     // Deposit amount
const [localError, setLocalError] = useState(null);         // Error state
```

#### Refs
```javascript
const chatboxRef = useRef(null);           // Chat scroll container
const toolsFetchedRef = useRef(false);     // Tools fetch guard
```

**Key Methods**:

#### handleSend()
**Purpose**: Process user input and execute appropriate tools

**Process**:
1. Validate input and processing state
2. Add user message to chat
3. Match prompt to available tools
4. Handle wallet connection requirements
5. Execute tool with payment processing
6. Display results or errors

**Tool Matching Logic**:
```javascript
const normalizedPrompt = userPrompt.toLowerCase();
const tool = availableTools.find((t) => normalizedPrompt.includes(t.id));
```

#### handleTopUp()
**Purpose**: Process budget deposits through the agent interface

**Features**:
- Input validation for deposit amounts
- Wallet connection verification
- Transaction status feedback
- Error handling and user guidance

#### getMessageStyle(from)
**Purpose**: Generate CSS classes for different message types

**Message Types**:
- `user`: Blue background, right-aligned
- `agent`: Gray background, left-aligned
- `agent-thinking`: Yellow background, italic
- `agent-info`: Green background
- `agent-error`: Red background

**UI Features**:
- Auto-scrolling chat window
- Real-time message updates
- Loading state indicators
- Responsive design

**Dependencies**:
```javascript
import { useX402 } from "./useX402";
import React, { useState, useEffect, useRef } from "react";
```

**Tool Integration**:
The component integrates with backend tools that provide article access functionality:
- `get_all_articles` (Free)
- `get_article_preview` (Free)
- `get_article_free` (Free)
- `get_article` (Paid)

---

### 4. Articles.jsx

**Purpose**: Article browsing, categorization, and reading interface with payment integration.

**Location**: `src/Articles.jsx`

**Exports**: Default export `Articles`

**State Management**:
```javascript
const [freeArticles, setFreeArticles] = useState([]);      // Free articles
const [premiumArticles, setPremiumArticles] = useState([]); // Premium articles
const [selectedArticle, setSelectedArticle] = useState(null); // Current article
const [isLoading, setIsLoading] = useState(false);          // Loading state
const [error, setError] = useState(null);                   // Error state
const [activeTab, setActiveTab] = useState('premium');     // Active tab
```

**Key Methods**:

#### fetchArticles()
**Purpose**: Retrieve and categorize articles from the API

**Process**:
1. Set loading state
2. Fetch articles from API
3. Separate free and premium articles
4. Update state with results
5. Handle errors gracefully

#### handleArticleClick(article)
**Purpose**: Handle article selection and payment processing

**Logic**:
- Free articles: Display immediately
- Premium articles: Check wallet, process payment, then display

#### formatMarkdown(text)
**Purpose**: Convert markdown content to HTML for display

**Features**:
- Header conversion (h1, h2, h3)
- Bold and italic text formatting
- Paragraph handling
- Line break processing

**Components**:

#### ArticleList Component
**Purpose**: Render list of articles with consistent styling

**Props**:
- `articles` (Array): Article objects to display
- `isPremium` (boolean): Premium status for styling

**Features**:
- Article cards with hover effects
- Pricing display for premium articles
- Author and metadata display
- Empty state handling

#### Article Modal
**Purpose**: Full-screen article reader with rich formatting

**Features**:
- Responsive design
- Rich text rendering
- Metadata display
- Close functionality

**Dependencies**:
```javascript
import React, { useState, useEffect } from "react";
import "@solana/wallet-adapter-react-ui/styles.css";
import { useX402 } from "./useX402";
import { useWallet } from "@solana/wallet-adapter-react";
```

**Styling**:
- Tailwind CSS for responsive design
- Custom article card styling
- Modal overlay with backdrop
- Premium article visual indicators

---

### 5. useX402.js

**Purpose**: Custom React hook providing simplified access to X402 functionality.

**Location**: `src/useX402.js`

**Exports**: `useX402` (named export)

**Functionality**:
- Access X402 context with error validation
- Provide clean interface for components
- Handle context absence gracefully

**Returns**:
```javascript
{
  fetchWith402,      // Enhanced fetch with 402 handling
  depositBudget,     // Budget deposit functionality
  API_BASE,         // Base API URL
  isWalletError,    // Error classification function
  publicKey         // Connected wallet public key
}
```

**Error Handling**:
```javascript
if (!context) {
  throw new Error("useX402 must be used within X402Provider");
}
```

**Usage Example**:
```javascript
import { useX402 } from "./useX402";

function MyComponent() {
  const { fetchWith402, depositBudget, publicKey } = useX402();

  const handlePayment = async () => {
    if (!publicKey) {
      alert("Please connect your wallet");
      return;
    }

    try {
      const result = await fetchWith402('/api/premium-content');
      console.log("Content accessed:", result);
    } catch (error) {
      console.error("Access failed:", error);
    }
  };

  return <button onClick={handlePayment}>Access Premium Content</button>;
}
```

---

### 6. Entry Point Modules

#### index.jsx
**Purpose**: Application entry point and React initialization.

**Features**:
- React 18 root creation
- Strict mode for development
- Polyfill imports
- CSS imports

**Code**:
```javascript
import './polyfills.js';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

#### polyfills.js
**Purpose**: Browser compatibility polyfills for Buffer and other Node.js globals.

**Code**:
```javascript
import { Buffer } from 'buffer';
window.Buffer = Buffer;
```

## Configuration Modules

### vite.config.js
**Purpose**: Vite build tool configuration for development and production.

**Features**:
- React plugin support
- Buffer polyfills for browser compatibility
- Development proxy to backend
- Dependency optimization

**Key Configuration**:
```javascript
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
    'global': 'window',
  },
  resolve: {
    alias: { buffer: 'buffer' }
  },
  optimizeDeps: { include: ['buffer'] },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
```

### tailwind.config.js
**Purpose**: Tailwind CSS configuration for styling system.

**Configuration**:
```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
}
```

### postcss.config.js
**Purpose**: PostCSS configuration for CSS processing.

**Configuration**:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

## Dependency Analysis

### Production Dependencies

#### Core React Ecosystem
- **react (18.3.1)**: UI framework
- **react-dom (18.3.1)**: DOM rendering

#### Solana Integration
- **@solana/web3.js (1.98.4)**: Solana blockchain interaction
- **@solana/wallet-adapter-react (0.15.35)**: React wallet integration
- **@solana/wallet-adapter-react-ui (0.9.35)**: Wallet UI components
- **@solana/wallet-adapter-base (0.9.27)**: Base wallet functionality
- **@solana/wallet-adapter-base-ui (0.1.6)**: Base UI components
- **@solana/spl-token (0.4.14)**: SPL token support

#### Browser Compatibility
- **buffer (6.0.3)**: Buffer polyfill for browser
- **process (0.11.10)**: Process polyfill

### Development Dependencies

#### Build Tools
- **vite (5.4.10)**: Build tool and dev server
- **@vitejs/plugin-react (4.3.4)**: React plugin for Vite

#### CSS Processing
- **tailwindcss (3.4.18)**: Utility-first CSS framework
- **postcss (8.5.6)**: CSS processing
- **autoprefixer (10.4.21)**: Vendor prefixing

#### Browser Polyfills
- **rollup-plugin-polyfill-node (0.13.0)**: Node.js polyfills
- **vite-plugin-node-polyfills (0.24.0)**: Vite node polyfills

## Integration Patterns

### Context Pattern
The application uses React Context for global state management:
- `X402Context` for payment functionality
- Wallet Adapter context for blockchain operations

### Custom Hook Pattern
Custom hooks provide clean interfaces to complex functionality:
- `useX402()` for payment operations
- `useWallet()` for wallet operations

### Error Boundary Pattern
Error boundaries prevent component failures from crashing the app:
- `ErrorBoundary` in App.jsx for wallet errors
- Local error handling in components

### Props Drilling Prevention
Context and custom hooks prevent prop drilling:
- Payment functionality through X402 context
- Wallet state through adapter context

## Testing Considerations

### Unit Testing
- Component testing with React Testing Library
- Hook testing with appropriate test utilities
- Error boundary testing

### Integration Testing
- Payment flow testing
- Wallet integration testing
- API interaction testing

### End-to-End Testing
- User journey testing
- Payment completion testing
- Error scenario testing

## Performance Optimizations

### React Optimizations
- `useCallback` for stable function references
- `useMemo` for expensive computations
- Component memoization where appropriate

### Bundle Optimizations
- Tree shaking through Vite
- Code splitting for large components
- Dependency optimization

### Network Optimizations
- Request deduplication
- Error retry mechanisms
- Loading state management