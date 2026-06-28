import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { installConsoleControl } from './utils/consoleLogger';

// Hide console logs unless REACT_APP_SHOW_CONSOLE_LOGS=OFF (defaults to hidden).
// Installed first so logs are suppressed before any other module runs.
installConsoleControl();

/** Console noise from extensions (password managers, ad blockers, etc.) — not from this app */
function isBrowserExtensionNoise(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes('disconnected port') ||
    t.includes('extension context invalidated') ||
    t.includes('chrome-extension://') ||
    t.includes('moz-extension://') ||
    t.includes('proxy.js') ||
    t.includes('content_script') ||
    t.includes('chrome.runtime') ||
    t.includes('runtime.lasterror') ||
    t.includes('message port closed') ||
    t.includes('unchecked runtime.lasterror')
  );
}

// Suppress browser extension errors that pollute the console when they surface as window errors.
// Note: Chrome often logs "Unchecked runtime.lastError..." directly from the extension system;
// those lines cannot be removed from page JS — disable the offending extension or ignore them.
window.addEventListener('error', (event) => {
  const errorMessage = event.message || event.error?.message || '';
  const errorStack = event.error?.stack || '';
  const combined = `${errorMessage}\n${errorStack}`;

  if (isBrowserExtensionNoise(combined)) {
    // Suppress these extension-related errors
    event.preventDefault();
    event.stopPropagation();

    // Optionally log to console in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Extension Error Suppressed]:', errorMessage);
    }

    return false;
  }
});

// Also handle unhandledrejection for Promise-based extension errors
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.message || event.reason || '';
  const reasonStr = typeof reason === 'string' ? reason : String(reason);

  if (isBrowserExtensionNoise(reasonStr)) {
    // Suppress these extension-related promise rejections
    event.preventDefault();

    // Optionally log to console in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Extension Promise Rejection Suppressed]:', reasonStr);
    }
  }
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
