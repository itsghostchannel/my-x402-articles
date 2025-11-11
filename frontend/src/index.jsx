import './polyfills.js';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { CDPReactProvider } from "@coinbase/cdp-react";
import App from './App.jsx';
import { CDP_CONFIG } from './config.ts';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <CDPReactProvider config={CDP_CONFIG}>
      <App />
    </CDPReactProvider>
  </React.StrictMode>
);