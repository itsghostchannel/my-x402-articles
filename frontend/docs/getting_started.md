# Getting Started Guide

## Overview

This guide will help you set up and run the X402 Frontend application locally. The frontend is a React-based web application that integrates with Solana blockchain payments for accessing premium content.

## Prerequisites

### Required Software
- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher (comes with Node.js)
- **Git**: For version control

### Required Accounts
- **Solana Wallet**: Phantom, Solflare, or any compatible Solana wallet
- **Devnet SOL**: Test SOL for transactions (get from [Solfaucet](https://solfaucet.com/))

### Optional but Recommended
- **VS Code**: With recommended extensions for React development
- **Solana CLI**: For advanced blockchain operations

## Quick Start

### 1. Repository Setup

```bash
# Clone the repository
git clone <repository-url>
cd x402-new/frontend

# Install dependencies
npm install
```

### 2. Environment Configuration

Create a `.env` file in the `frontend` directory:

```env
# Backend API URL
VITE_API_URL=http://localhost:3001

# Optional: Solana network (defaults to devnet)
# VITE_SOLANA_NETWORK=devnet
```

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 4. Backend Setup

Make sure you have the X402 backend running. The frontend expects it at `http://localhost:3001` by default.

```bash
# In the backend directory
cd ../backend
npm install
npm run dev
```

## Detailed Setup Guide

### Step 1: System Preparation

#### Install Node.js
```bash
# Check if Node.js is installed
node --version

# If not installed, download from https://nodejs.org/
# or use a version manager like nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### Verify Installation
```bash
node --version  # Should show v18.x.x or higher
npm --version   # Should show 8.x.x or higher
```

### Step 2: Project Setup

#### Clone and Install
```bash
# Clone the repository
git clone <repository-url>
cd x402-new/frontend

# Install all dependencies
npm install

# Verify installation
npm list --depth=0
```

#### Verify Project Structure
```
frontend/
├── src/
│   ├── App.jsx
│   ├── AgentComponent.jsx
│   ├── Articles.jsx
│   ├── x402.jsx
│   ├── useX402.js
│   ├── index.jsx
│   └── polyfills.js
├── public/
│   └── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

### Step 3: Environment Configuration

#### Create Environment File
```bash
# Create .env file
touch .env
```

#### Configure Environment Variables
```env
# Required: Backend API URL
VITE_API_URL=http://localhost:3001

# Optional: Custom Solana RPC endpoint
# VITE_SOLANA_RPC=https://api.devnet.solana.com

# Optional: Application title
# VITE_APP_TITLE="X402 Articles"
```

### Step 4: Wallet Setup

#### Install Solana Wallet
1. **Phantom Wallet**: Install from [phantom.app](https://phantom.app/)
2. **Solflare Wallet**: Install from [solflare.com](https://solflare.com/)
3. **Other Wallets**: Any Solana Wallet Adapter compatible wallet

#### Configure Wallet for Devnet
```bash
# In your wallet settings:
# 1. Switch to Devnet network
# 2. Get some devnet SOL from faucet
# 3. Create/import your wallet
```

#### Get Test SOL
1. Visit [Solfaucet](https://solfaucet.com/)
2. Enter your wallet address
3. Request devnet SOL
4. Wait for confirmation (typically a few seconds)

### Step 5: Backend Integration

#### Backend Requirements
The X402 frontend requires a running backend that provides:
- Article API endpoints
- Agent tool endpoints
- Payment processing
- Budget management

#### Backend Configuration
Make sure your backend is configured to:
- Run on port 3001 (or update `VITE_API_URL`)
- Handle CORS requests from `http://localhost:3000`
- Support the X402 payment protocol

#### Test Backend Connection
```bash
# Test if backend is accessible
curl http://localhost:3001/api/articles

# Expected: JSON response with articles data
```

### Step 6: Running the Application

#### Development Mode
```bash
# Start development server
npm run dev

# Output should show:
#   VITE v5.x.x  ready in xxx ms
#   ➜  Local:   http://localhost:3000/
#   ➜  Network: use --host to expose
#   ➜  press h + enter to show help
```

#### Verify Application
1. Open `http://localhost:3000` in your browser
2. You should see the X402 Articles interface
3. Check browser console for any errors

#### Connect Wallet
1. Click "Connect Wallet" button in the top-right
2. Select your wallet (Phantom, Solflare, etc.)
3. Approve connection in your wallet
4. Verify your wallet address appears

## Testing the Application

### Test Free Articles
1. Click on the "Free Articles" tab
2. Click on any free article
3. Article should open in a modal with full content

### Test Premium Articles
1. Click on the "Premium Articles" tab
2. Select a premium article
3. You should be prompted to connect wallet (if not connected)
4. Approve the payment transaction in your wallet
5. Article content should load after payment confirmation

### Test Agent Interface
1. In the "Articles Agent" section, type a query
2. Try queries like:
   - "get all articles"
   - "get article preview"
   - "show me premium articles"
3. Agent should respond with appropriate actions

### Test Budget Management
1. Enter an amount in the budget deposit field
2. Click "Top-up"
3. Approve the transaction in your wallet
4. Budget should be updated and reflected in the UI

## Common Issues and Solutions

### Wallet Connection Issues

**Issue**: Wallet not connecting
```bash
# Solutions:
# 1. Ensure wallet is installed and unlocked
# 2. Check that wallet allows connection to localhost
# 3. Try refreshing the page
# 4. Check browser console for specific error
```

**Issue**: Transaction failures
```bash
# Solutions:
# 1. Ensure you have sufficient devnet SOL
# 2. Check that you have the required tokens (USDC on devnet)
# 3. Verify network is set to Devnet
# 4. Check backend is running and accessible
```

### Backend Connection Issues

**Issue**: API requests failing
```bash
# Solutions:
# 1. Verify backend is running on correct port
# 2. Check VITE_API_URL in .env file
# 3. Ensure CORS is configured on backend
# 4. Test API endpoints directly with curl
```

**Issue**: 402 Payment Required errors
```bash
# Solutions:
# 1. Ensure wallet is connected
# 2. Check if you have sufficient token balance
# 3. Verify token mint address is correct
# 4. Check backend payment processing
```

### Build and Deployment Issues

**Issue**: Build failures
```bash
# Solutions:
# 1. Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# 2. Check for Node.js version compatibility
node --version  # Should be 18+

# 3. Clear Vite cache
npm run build -- --force
```

## Development Workflow

### Daily Development
```bash
# Start development
npm run dev

# In another terminal, start backend
cd ../backend
npm run dev

# Make changes to code
# Changes will hot-reload automatically
```

### Testing Changes
```bash
# Test in development environment
npm run dev

# Build for production testing
npm run build
npm run preview

# Test production build locally
open http://localhost:4173
```

### Code Quality
```bash
# Install linting tools (if configured)
npm install -g eslint prettier

# Run linting (if configured)
npm run lint

# Format code
npm run format
```

## Production Deployment

### Build for Production
```bash
# Build optimized production bundle
npm run build

# Output will be in ./dist directory
ls -la dist/
```

### Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod

# Follow prompts to configure deployment
```

### Environment Variables for Production
```bash
# Set in Vercel dashboard or CLI:
VITE_API_URL=https://your-backend-url.com
VITE_SOLANA_NETWORK=mainnet-beta  # For production
```

### Docker Deployment
```dockerfile
# Dockerfile example
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=0 /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Advanced Configuration

### Custom Solana Configuration
```javascript
// In vite.config.js
export default defineConfig({
  define: {
    'process.env.SOLANA_NETWORK': JSON.stringify('mainnet-beta'),
    'process.env.RPC_ENDPOINT': JSON.stringify('https://your-rpc-endpoint.com'),
  },
});
```

### Custom Wallet Configuration
```javascript
// In App.jsx
const wallets = useMemo(() => [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
  // Add other wallet adapters
], []);
```

### Custom API Configuration
```javascript
// Custom fetch wrapper
const customFetch = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response.json();
};
```

## Performance Optimization

### Development Optimization
```bash
# Enable fast refresh
npm run dev

# Use source maps for debugging
# Configured in vite.config.js
```

### Build Optimization
```bash
# Analyze bundle size
npm install -g vite-bundle-analyzer
npm run build
vite-bundle-analyzer dist

# Enable code splitting
# Automatically configured by Vite
```

### Runtime Optimization
```javascript
// Use React.memo for components
const MyComponent = React.memo(function MyComponent({ prop }) {
  return <div>{prop}</div>;
});

// Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Use useCallback for stable functions
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

## Monitoring and Debugging

### Browser DevTools
```bash
# 1. Open Developer Tools (F12)
# 2. Check Console tab for errors
# 3. Use Network tab to monitor API calls
# 4. Use React DevTools for component inspection
```

### Solana Transaction Monitoring
```bash
# 1. Use Solana Explorer
# 2. Go to https://explorer.solana.com/
# 3. Switch to Devnet
# 4. Search transaction signatures from console logs
```

### Error Tracking
```javascript
// Add error logging
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Send to error tracking service
});

// Add unhandled promise rejection tracking
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Send to error tracking service
});
```

## Contributing

### Code Style
- Use ES6+ features
- Follow React best practices
- Use TypeScript where beneficial
- Maintain consistent formatting

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/new-feature
```

### Testing
```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom

# Run tests (if configured)
npm run test

# Run tests with coverage
npm run test:coverage
```

## Support and Resources

### Documentation
- [React Documentation](https://react.dev/)
- [Solana Documentation](https://docs.solana.com/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

### Community
- [Solana Discord](https://discord.gg/solana)
- [React Community](https://reactjs.org/community)
- [GitHub Issues](https://github.com/solana-labs/solana-web3.js/issues)

### Troubleshooting Resources
- [Solana Wallet Adapter Troubleshooting](https://github.com/solana-labs/wallet-adapter#troubleshooting)
- [Vite Troubleshooting](https://vitejs.dev/guide/troubleshooting.html)
- [React Troubleshooting](https://react.dev/learn/troubleshooting)