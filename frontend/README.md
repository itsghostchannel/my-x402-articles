# X402 Frontend

A React-based web application for accessing premium and free articles using Solana blockchain payments and the X402 protocol. This application demonstrates micropayments for content access through an innovative payment system.

## Overview

The X402 Frontend is a modern web application that allows users to:
- Browse free and premium articles
- Connect their Solana wallet for payments
- Use an AI-powered agent to assist with article discovery
- Deposit budget for seamless article access
- Make micropayments using the X402 protocol

## Features

### 📰 Article Management
- Browse free and premium articles in separate tabs
- View article details including author, reading time, and pricing
- Full-screen article reader with rich text formatting
- Real-time article fetching with error handling

### 💰 X402 Payment System
- Solana wallet integration for blockchain payments
- Automatic handling of 402 Payment Required responses
- Budget deposit system for seamless access
- Support for SPL tokens (USDC and others)
- Transaction confirmation and error handling

### 🤖 AI Agent Assistant
- Interactive chat interface for article discovery
- Tool-based system for accessing different article types
- Wallet connection status awareness
- Real-time budget management and deposit functionality

### 🔐 Wallet Integration
- Multi-wallet support through Solana Wallet Adapter
- Devnet network configuration for testing
- Error boundary for wallet initialization issues
- Connection status monitoring and user feedback

## Technology Stack

### Frontend Framework
- **React 18.3.1** - UI framework with hooks and context
- **Vite 5.4.10** - Build tool and development server
- **Tailwind CSS 3.4.18** - Utility-first CSS framework

### Blockchain Integration
- **@solana/web3.js 1.98.4** - Solana blockchain interaction
- **@solana/wallet-adapter-react 0.15.35** - React wallet integration
- **@solana/spl-token 0.4.14** - SPL token support
- **@solana/wallet-adapter-react-ui 0.9.35** - UI components

### Development Tools
- **PostCSS 8.5.6** - CSS processing
- **Autoprefixer 10.4.21** - CSS vendor prefixes
- **Buffer polyfill** - Browser compatibility

## Project Structure

```
frontend/
├── src/
│   ├── App.jsx                 # Main application component
│   ├── AgentComponent.jsx      # AI agent chat interface
│   ├── Articles.jsx           # Article listing and reader
│   ├── x402.jsx              # X402 payment provider
│   ├── useX402.js            # Custom hook for X402 functionality
│   ├── index.jsx             # Application entry point
│   ├── polyfills.js          # Browser polyfills
│   └── index.css             # Global styles
├── public/
│   └── index.html            # HTML template
├── package.json              # Dependencies and scripts
├── vite.config.js           # Vite configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration
└── vercel.json             # Vercel deployment configuration
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn package manager
- Solana wallet (Phantom, Solflare, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd x402-new/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**

   Create a `.env` file in the root directory:
   ```env
   VITE_API_URL=http://localhost:3001
   ```

   The API URL should point to your X402 backend server.

4. **Start Development Server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

### Build and Deployment

1. **Build for Production**
   ```bash
   npm run build
   ```

2. **Preview Production Build**
   ```bash
   npm run preview
   ```

3. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

## Core Components

### App.jsx
The main application component that sets up:
- Solana wallet providers and error boundaries
- Routing and layout structure
- Global state management

### X402Provider (`x402.jsx`)
Core payment processing component providing:
- `executePayment()` - Handles SPL token transfers
- `fetchWith402()` - Intercepts 402 responses and processes payments
- `depositBudget()` - Manages budget deposits for the user
- Error handling for wallet operations

### AgentComponent
AI-powered assistant featuring:
- Real-time chat interface
- Tool integration for article access
- Budget management and deposit functionality
- Wallet connection awareness

### Articles Component
Article management system with:
- Tabbed interface for free/premium content
- Article modal viewer with rich text rendering
- Payment integration for premium articles
- Responsive design and loading states

### useX402 Hook
Custom React hook that provides:
- Access to X402 context functionality
- Error handling for wallet operations
- Simplified interface for payment operations

## API Integration

The application integrates with a backend API supporting:

### Article Endpoints
- `GET /api/articles` - List all articles
- `GET /api/articles/:slug` - Get specific article (402 for premium)
- `GET /api/agent/tools` - List available agent tools

### Payment Endpoints
- `POST /api/confirm-budget-deposit` - Confirm budget deposits
- Various tool endpoints with 402 payment requirements

## Configuration

### Vite Configuration
- React plugin support
- Buffer polyfills for browser compatibility
- Development proxy to backend server
- Optimized dependencies

### Tailwind CSS Configuration
- Utility-first CSS framework
- Responsive design utilities
- Custom theme extensions

### Wallet Configuration
- Devnet network for testing
- Multiple wallet support
- Error boundary handling

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Environment Variables
- `VITE_API_URL` - Backend API server URL

## Security Considerations

- Wallet transactions require explicit user approval
- Error handling prevents sensitive data exposure
- Secure transaction processing through Solana network
- Input validation and sanitization

## Troubleshooting

### Common Issues

1. **Wallet Connection Errors**
   - Ensure wallet is installed and unlocked
   - Check network configuration (devnet)
   - Verify wallet permissions

2. **Payment Failures**
   - Confirm sufficient token balance
   - Check token account existence
   - Verify recipient address validity

3. **API Connection Issues**
   - Verify backend server is running
   - Check CORS configuration
   - Confirm API URL environment variable

### Error Types Handled

- Wallet initialization errors
- Transaction signing failures
- Network connectivity issues
- Insufficient funds
- Invalid token accounts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is part of the X402 ecosystem. Please refer to the main project license for usage terms.