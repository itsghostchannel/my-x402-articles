# Architecture Documentation

## System Overview

The X402 Frontend is a React-based web application that implements a micropayment system for accessing premium content using the Solana blockchain. The architecture follows a component-based design with clear separation of concerns.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Environment                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   UI Components │  │  State Management│  │  Wallet Layer   │ │
│  │                 │  │                 │  │                 │ │
│  │ • Articles      │  │ • React Context │  │ • Solana Wallet │ │
│  │ • Agent Chat    │  │ • Custom Hooks  │  │ • SPL Tokens    │ │
│  │ • Payment UI    │  │ • Local State   │  │ • Transactions  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Network Layer                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   HTTP Client   │  │   X402 Protocol │  │ Solana Network  │ │
│  │                 │  │                 │  │                 │ │
│  │ • REST API      │  │ • 402 Handling  │  │ • Devnet        │ │
│  │ • Error Retry   │  │ • Payment Flow  │  │ • Web3.js       │ │
│  │ • Auth Headers  │  │ • Budget Mgmt   │  │ • Transactions  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Services                          │
├─────────────────────────────────────────────────────────────┤
│  • Article API         • Payment Processing                 │
│  • Agent Tools         • Budget Management                  │
│  • User Authentication  • Content Delivery                  │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Core Components

#### 1. App Component (`App.jsx`)
**Purpose**: Root application component providing global setup and error handling

**Responsibilities**:
- Wallet provider initialization
- Error boundary implementation
- Layout structure management
- Global routing and navigation

**Dependencies**:
- Solana Wallet Adapter providers
- X402Provider context
- Child components (Articles, AgentComponent)

**Key Features**:
- Error boundary for wallet initialization failures
- Responsive layout with Tailwind CSS
- Header with wallet connection button

#### 2. X402Provider (`x402.jsx`)
**Purpose**: Core payment processing and X402 protocol implementation

**Responsibilities**:
- Execute SPL token transfers
- Handle 402 payment required responses
- Manage budget deposits
- Provide payment context to child components

**Key Methods**:
- `executePayment(invoice, memo)` - Process token transfers
- `fetchWith402(url, options)` - Intercept and handle 402 responses
- `depositBudget(invoiceUrl, amount)` - Manage user budget

**Security Features**:
- Transaction validation
- Error handling for wallet operations
- Automatic token account creation

#### 3. AgentComponent (`AgentComponent.jsx`)
**Purpose**: AI-powered chat interface for article discovery and assistance

**Responsibilities**:
- Real-time chat interface
- Tool execution for article access
- Budget management integration
- Wallet connection status monitoring

**State Management**:
- Chat messages with different types (user, agent, error, info)
- Available tools from backend
- Loading and error states
- Budget amount management

**UI Features**:
- Auto-scrolling chat window
- Message styling by type
- Budget deposit interface
- Tool execution feedback

#### 4. Articles Component (`Articles.jsx`)
**Purpose**: Article browsing, categorization, and reading interface

**Responsibilities**:
- Article listing and categorization
- Premium/free article management
- Article modal viewer
- Payment integration for premium content

**State Management**:
- Article collections (free/premium)
- Selected article state
- Loading and error states
- Active tab management

**Features**:
- Tabbed interface for article types
- Rich text article rendering
- Modal-based article reader
- Responsive design

### Custom Hooks

#### useX402 Hook (`useX402.js`)
**Purpose**: Simplified interface to X402 context functionality

**Benefits**:
- Context access validation
- Error handling for missing context
- Clean interface for components

**Usage**:
```javascript
const { fetchWith402, depositBudget, API_BASE, isWalletError, publicKey } = useX402();
```

## Data Flow Architecture

### Payment Flow
```
User Action → Component → X402Provider → Solana Network → Backend
     │              │            │               │             │
     │              │            │               │             │
     ▼              ▼            ▼               ▼             ▼
Click Article → Check Type → Execute Payment → Confirm → Return Content
```

### 402 Payment Handling
```
HTTP Request → 402 Response → Invoice Processing → Payment → Retry with Auth
      │               │               │              │             │
      │               │               │              │             │
      ▼               ▼               ▼              ▼             ▼
Fetch API → Parse Invoice → Build Transaction → Sign & Send → Get Content
```

### Agent Tool Execution
```
User Query → Tool Matching → Payment Processing → Tool Execution → Response
     │               │               │              │             │
     │               │               │              │             │
     ▼               ▼               ▼              ▼             ▼
Chat Input → Find Tool → Check Budget/Pay → Call API → Display Result
```

## State Management Architecture

### Global State (React Context)
- **X402Context**: Payment processing and budget management
- **Wallet Context**: Solana wallet connection and transactions

### Local State (Component Level)
- **App Component**: Error boundary state
- **AgentComponent**: Chat messages, tools, loading states
- **Articles Component**: Article lists, selected article, UI state

### State Flow Patterns
1. **Top-down**: Configuration and context providers
2. **Bottom-up**: User actions and events
3. **Lateral**: Component communication through shared context

## Security Architecture

### Wallet Security
- Transaction signing requires explicit user approval
- Private keys never leave the wallet
- Error boundaries prevent wallet state leakage

### Payment Security
- Invoice validation before payment
- Transaction confirmation on blockchain
- Automatic token account creation with validation

### Data Security
- Input sanitization for user inputs
- Error message sanitization
- Secure token handling in localStorage (if used)

## Performance Architecture

### Optimization Strategies
1. **Component Optimization**:
   - React.memo for expensive renders
   - useCallback for stable function references
   - useMemo for expensive computations

2. **Network Optimization**:
   - Request deduplication
   - Error retry mechanisms
   - Loading state management

3. **Bundle Optimization**:
   - Vite build optimization
   - Dynamic imports for code splitting
   - Tree shaking for unused code

### Memory Management
- Cleanup in useEffect hooks
- Event listener removal
- Proper state reset on component unmount

## Error Handling Architecture

### Error Boundaries
- **App Level**: Wallet initialization errors
- **Component Level**: Payment and API errors
- **User Communication**: Clear error messages and recovery options

### Error Types
1. **Wallet Errors**: Connection, signing, network issues
2. **Payment Errors**: Insufficient funds, invalid transactions
3. **API Errors**: Network failures, server errors
4. **UI Errors**: Component failures, state inconsistencies

### Recovery Strategies
- Automatic retry for transient failures
- User guidance for recoverable errors
- Graceful degradation for non-critical features

## Integration Architecture

### External Dependencies
1. **Solana Ecosystem**:
   - Web3.js for blockchain interaction
   - Wallet Adapter for wallet integration
   - SPL Token library for token operations

2. **Build Tools**:
   - Vite for development and building
   - Tailwind CSS for styling
   - PostCSS for CSS processing

### API Integration
- RESTful API communication
- 402 Payment Required protocol
- WebSocket support for real-time updates (future)

## Deployment Architecture

### Build Process
1. **Development**: Vite dev server with HMR
2. **Production**: Optimized bundle with code splitting
3. **Deployment**: Static files to CDN (Vercel)

### Environment Configuration
- Development: Local backend proxy
- Production: Environment-specific API URLs
- Network: Devnet for testing, Mainnet for production

## Future Architecture Considerations

### Scalability
- Component lazy loading
- API response caching
- Optimistic UI updates

### Extensibility
- Plugin system for new payment methods
- Theme system for customization
- Internationalization support

### Monitoring
- Error tracking integration
- Performance monitoring
- User analytics