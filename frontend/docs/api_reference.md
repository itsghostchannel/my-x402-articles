# API Reference Documentation

## Overview

This document provides comprehensive API reference for the X402 Frontend application, including component APIs, custom hooks, context providers, and utility functions.

## Component APIs

### App Component

**Import**: `import App from './App.jsx';`

**Props**: None

**Returns**: JSX.Element

**Configuration**:
```javascript
// Network configuration (modifiable)
const solanaNetwork = "devnet"; // Change to "mainnet-beta" for production

// Endpoint is automatically generated
const endpoint = useMemo(() => clusterApiUrl(solanaNetwork), [solanaNetwork]);

// Wallet configuration
const wallets = useMemo(() => [], []); // Add specific wallets if needed
```

**Context Providers**:
The App component wraps children with these providers in order:
1. `ErrorBoundary` - Handles wallet initialization errors
2. `ConnectionProvider` - Solana network connection
3. `WalletProvider` - Wallet functionality
4. `WalletModalProvider` - Wallet UI components
5. `X402Provider` - Payment processing

**Error Handling**:
```javascript
// Error boundary catches wallet initialization errors
static getDerivedStateFromError(error) {
  return { hasError: true, error };
}

componentDidCatch(error, errorInfo) {
  console.error('Wallet Provider Error:', error, errorInfo);
}
```

---

### AgentComponent

**Import**: `import { AgentComponent } from './AgentComponent.jsx';`

**Props**: None

**State Interface**:
```javascript
{
  prompt: string,              // User input
  messages: Array<Message>,    // Chat history
  isThinking: boolean,         // Processing state
  availableTools: Array<Tool>, // Available agent tools
  budgetAmount: number,        // Deposit amount
  localError: string | null    // Error message
}
```

**Message Type Interface**:
```javascript
type Message = {
  from: 'user' | 'agent' | 'agent-thinking' | 'agent-info' | 'agent-error',
  text: string
}
```

**Tool Interface**:
```javascript
type Tool = {
  id: string,          // Tool identifier
  endpoint: string,    // API endpoint
  cost: number,        // Cost in tokens
  description?: string // Tool description
}
```

**Methods**:

#### handleSend()
```javascript
const handleSend = async (): Promise<void>
```
Processes user input and executes appropriate tools.

**Process Flow**:
1. Validate input and processing state
2. Add user message to chat
3. Normalize and match prompt to tools
4. Check wallet connection for paid tools
5. Execute tool with payment processing
6. Display results or handle errors

**Example Usage**:
```javascript
// Called internally on button click or Enter key
<button onClick={handleSend} disabled={isThinking}>
  {isThinking ? "..." : "Ask"}
</button>
```

#### handleTopUp()
```javascript
const handleTopUp = async (): Promise<void>
```
Processes budget deposits through payment flow.

**Validation**:
```javascript
// Input validation
if (!budgetAmount || budgetAmount <= 0) {
  setLocalError("Please enter a valid deposit amount.");
  return;
}

// Wallet validation
if (!publicKey) {
  setLocalError("Error: Wallet not connected. Please connect your wallet to deposit budget.");
  return;
}
```

**Event Handlers**:
```javascript
// Input change handler
const handleInputChange = (e) => setPrompt(e.target.value);

// Budget amount change handler
const handleBudgetChange = (e) => setBudgetAmount(parseFloat(e.target.value) || 0);

// Enter key handler
const handleKeyDown = (e) => e.key === "Enter" && handleSend();
```

---

### Articles Component

**Import**: `import Articles from './Articles.jsx';`

**Props**: None

**State Interface**:
```javascript
{
  freeArticles: Array<Article>,     // Free article list
  premiumArticles: Array<Article>,  // Premium article list
  selectedArticle: Article | null,  // Currently selected article
  isLoading: boolean,               // Loading state
  error: string | null,             // Error message
  activeTab: 'free' | 'premium'     // Active tab
}
```

**Article Interface**:
```javascript
type Article = {
  id: string,
  slug: string,
  title: string,
  excerpt: string,
  author: string,
  date: string,
  readTime: number,
  isPremium: boolean,
  price?: number,
  currencySymbol?: string,
  currencyName?: string,
  content?: string
}
```

**Methods**:

#### fetchArticles()
```javascript
const fetchArticles = async (): Promise<void>
```
Retrieves and categorizes articles from the API.

**API Endpoint**: `GET /api/articles`

**Response Format**:
```javascript
{
  articles: [
    {
      id: "1",
      slug: "article-slug",
      title: "Article Title",
      excerpt: "Article excerpt...",
      author: "Author Name",
      date: "2024-01-01",
      readTime: 5,
      isPremium: false
    }
    // ... more articles
  ]
}
```

#### handleArticleClick()
```javascript
const handleArticleClick = async (article: Article): Promise<void>
```
Handles article selection with payment processing for premium content.

**Logic Flow**:
```javascript
// Free articles - display immediately
if (!article.isPremium) {
  setSelectedArticle(article);
  return;
}

// Premium articles - require wallet and payment
if (!publicKey) {
  setError("Error: Wallet not connected. Please connect your wallet to access premium articles.");
  return;
}

// Process payment and fetch content
const articleData = await fetchWith402(`${API_BASE}/api/articles/${article.slug}`);
```

#### formatMarkdown()
```javascript
const formatMarkdown = (text: string): string
```
Converts markdown content to HTML for display.

**Transformations**:
```javascript
// Headers
.replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mt-6 mb-4 text-gray-900">$1</h3>')
.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold mt-8 mb-5 text-gray-900">$1</h2>')

// Text formatting
.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
.replace(/\*(.+?)\*/g, '<em class="italic text-gray-800">$1</em>')

// Paragraphs and line breaks
.replace(/\n\n/g, '</p><p class="mb-6 text-gray-800">')
```

**Sub-components**:

#### ArticleList
```javascript
const ArticleList = ({ articles, isPremium = false }): JSX.Element
```
Props:
- `articles: Array<Article>` - Articles to display
- `isPremium: boolean` - Styling flag for premium articles

#### Article Modal
```javascript
// Rendered conditionally when selectedArticle exists
{selectedArticle && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    {/* Modal content */}
  </div>
)}
```

---

### useX402 Hook

**Import**: `import { useX402 } from './useX402';`

**Returns**:
```javascript
interface X402Context {
  fetchWith402: (url: string, options?: RequestInit) => Promise<any>;
  depositBudget: (invoiceUrl: string, amount: number) => Promise<any>;
  API_BASE: string;
  isWalletError: (error: Error) => boolean;
  publicKey: PublicKey | null;
}
```

**Usage Example**:
```javascript
function MyComponent() {
  const {
    fetchWith402,
    depositBudget,
    API_BASE,
    isWalletError,
    publicKey
  } = useX402();

  // Use the functionality
}
```

**Error Handling**:
```javascript
if (!context) {
  throw new Error("useX402 must be used within X402Provider");
}
```

---

## X402Provider API

**Import**: `import { X402Provider, X402Context } from './x402.jsx';`

**Provider Props**:
```javascript
interface X402ProviderProps {
  children: React.ReactNode;
}
```

**Context Value**:
```javascript
interface X402ContextValue {
  fetchWith402: (url: string, options?: RequestInit) => Promise<any>;
  depositBudget: (invoiceUrl: string, amount: number) => Promise<any>;
  API_BASE: string;
  isWalletError: (error: Error) => boolean;
  publicKey: PublicKey | null;
}
```

### Core Methods

#### executePayment()
```javascript
const executePayment = useCallback(
  async (invoice: Invoice, memo: string): Promise<string>
);
```

**Invoice Interface**:
```javascript
interface Invoice {
  token: string;           // Token mint address
  recipientWallet: string; // Recipient public key
  amount: number;          // Payment amount
}
```

**Returns**: Transaction signature string

**Error Types**:
- Wallet connection errors
- Insufficient balance errors
- Transaction failure errors
- Network errors

**Example**:
```javascript
const invoice = {
  token: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  recipientWallet: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  amount: 0.01
};

const signature = await executePayment(invoice, "ARTICLE-PAYMENT-123");
```

#### fetchWith402()
```javascript
const fetchWith402 = useCallback(
  async (url: string, options?: RequestInit): Promise<any>
);
```

**Process Flow**:
1. Validate wallet connection
2. Add public key to headers
3. Make initial request
4. Handle 402 responses with payment
5. Retry request with authorization
6. Return parsed JSON response

**Headers Added**:
```javascript
headers.append("x402-Payer-Pubkey", publicKey.toBase58());
```

**402 Response Handling**:
```javascript
// Payment processing
const signature = await executePayment(invoice, invoice.reference);

// Retry with authorization
const finalRes = await fetch(retryUrl, {
  ...options,
  headers: {
    ...options.headers,
    Authorization: `x402 ${signature}`,
  },
});
```

#### depositBudget()
```javascript
const depositBudget = useCallback(
  async (invoiceUrl: string, amount: number): Promise<any>
);
```

**Process Flow**:
1. Fetch invoice from provided URL
2. Create deposit invoice with custom amount
3. Execute payment
4. Confirm deposit with backend
5. Return new budget amount

**Backend Confirmation**:
```javascript
const confirmRes = await fetch(`${API_BASE}/api/confirm-budget-deposit`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    signature,
    reference: depositReference,
    payerPubkey: publicKey.toBase58(),
    amount: amount,
  }),
});
```

**Response Format**:
```javascript
{
  success: boolean,
  newBudget: number,
  message?: string
}
```

### Utility Functions

#### isWalletError()
```javascript
const isWalletError = (error: Error): boolean
```
Classifies errors as wallet-related user cancellations.

**Conditions Checked**:
```javascript
return (
  error.name === "WalletSignTransactionError" ||
  error.name === "WalletSendTransactionError" ||
  error.message.includes("User rejected the request")
);
```

---

## Environment Variables

### VITE_API_URL
**Description**: Base URL for the backend API

**Default**: Empty string (uses relative URLs)

**Example**:
```env
VITE_API_URL=http://localhost:3001
```

**Usage in Code**:
```javascript
const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
```

---

## API Endpoints Integration

### Article Endpoints

#### GET /api/articles
**Purpose**: Retrieve all articles (free and premium)

**Used by**: `Articles.fetchArticles()`

**Response**:
```javascript
{
  articles: Array<Article>
}
```

#### GET /api/articles/:slug
**Purpose**: Retrieve specific article content

**Used by**: `Articles.handleArticleClick()`

**Payment Required**: 402 status for premium articles

**Response**:
```javascript
{
  fullContent: string,
  content: string,
  // ... other article data
}
```

### Agent Tool Endpoints

#### GET /api/agent/tools
**Purpose**: Retrieve available agent tools

**Used by**: `AgentComponent.useEffect()`

**Response**:
```javascript
[
  {
    id: "get_all_articles",
    endpoint: "/api/agent/get-all-articles",
    cost: 0,
    description: "Get all available articles"
  },
  {
    id: "get_article",
    endpoint: "/api/agent/get-article",
    cost: 0.01,
    description: "Get specific article content"
  }
  // ... more tools
]
```

#### Tool Endpoints
**Pattern**: `/api/agent/{tool-id}`

**Used by**: `AgentComponent.handleSend()`

**Payment Required**: 402 status for paid tools

**Response Format**:
```javascript
{
  context: string,        // Tool response content
  paymentMethod: string,  // "budget" or "x402"
  // ... tool-specific data
}
```

### Payment Endpoints

#### POST /api/confirm-budget-deposit
**Purpose**: Confirm budget deposit after payment

**Used by**: `X402Provider.depositBudget()`

**Request Body**:
```javascript
{
  signature: string,      // Transaction signature
  reference: string,      // Deposit reference
  payerPubkey: string,    // Payer wallet address
  amount: number          // Deposit amount
}
```

**Response**:
```javascript
{
  success: boolean,
  newBudget: number,
  message?: string
}
```

---

## Error Reference

### Error Types

#### Wallet Errors
**Source**: Solana Wallet Adapter

**Common Errors**:
```javascript
"WalletSignTransactionError"     // User cancelled signing
"WalletSendTransactionError"     // Transaction sending failed
"User rejected the request"      // User cancelled operation
```

**Handling**:
```javascript
const errorMsg = isWalletError(err)
  ? "Looks like user canceled the transaction."
  : err.message;
```

#### Payment Errors
**Source**: Transaction processing

**Common Errors**:
- Insufficient token balance
- Invalid token mint
- Network connection issues
- Transaction timeout

#### API Errors
**Source**: Backend API

**Status Codes**:
- 402: Payment Required
- 401: Unauthorized
- 404: Not Found
- 500: Server Error

**Error Format**:
```javascript
{
  error: "Error message description",
  code: "ERROR_CODE",
  details?: any
}
```

### Error Handling Patterns

#### Component-Level Error Handling
```javascript
try {
  const result = await riskyOperation();
  // Handle success
} catch (err) {
  if (isWalletError(err)) {
    // Handle user cancellation
    setLocalError("Transaction cancelled by user.");
  } else if (err.message.includes("Wallet not connected")) {
    // Handle wallet connection
    setLocalError("Please connect your wallet.");
  } else {
    // Handle other errors
    setLocalError(err.message);
  }
}
```

#### Global Error Boundary
```javascript
class ErrorBoundary extends React.Component {
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

---

## Performance APIs

### React Optimizations

#### useCallback Usage
```javascript
const executePayment = useCallback(
  async (invoice, memo) => {
    // Function body
  },
  [connection, publicKey, sendTransaction] // Dependencies
);
```

#### useMemo Usage
```javascript
const endpoint = useMemo(() => clusterApiUrl(solanaNetwork), [solanaNetwork]);
```

### Loading States

#### Component Loading
```javascript
const [isLoading, setIsLoading] = useState(false);

// Usage
{isLoading && (
  <div className="flex items-center justify-center">
    <div className="text-gray-500">Loading...</div>
  </div>
)}
```

#### Processing States
```javascript
const [isThinking, setIsThinking] = useState(false);

// Usage in buttons
<button disabled={isThinking}>
  {isThinking ? "Processing..." : "Submit"}
</button>
```

---

## Configuration APIs

### Vite Configuration

#### Proxy Configuration
```javascript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true
    }
  }
}
```

#### Define Configuration
```javascript
define: {
  'process.env': {},
  'global': 'window',
}
```

### Tailwind Configuration

#### Content Paths
```javascript
content: [
  "./index.html",
  "./src/**/*.{js,ts,jsx,tsx}",
]
```

#### Theme Extensions
```javascript
theme: {
  extend: {
    // Custom theme extensions
  },
}
```

---

## Development APIs

### Build Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Environment Detection
```javascript
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;
const API_BASE = import.meta.env.VITE_API_URL;
```

### Debug Logging
```javascript
// Payment debugging
console.log("Building transaction for invoice:", invoice);
console.log("Transaction sent, awaiting confirmation:", signature);
console.log("Transaction finalized:", signature);

// Error debugging
console.error('Wallet Provider Error:', error, errorInfo);
```