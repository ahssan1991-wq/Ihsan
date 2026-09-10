import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { registerServiceWorker } from './serviceWorkerRegistration';
import { ErrorBoundary } from './components/ErrorBoundary';

// Silence benign Vite HMR websocket disconnection errors in cloud container preview
window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason &&
    (typeof event.reason === 'string' || event.reason.message) &&
    (String(event.reason?.message || event.reason).includes('WebSocket') ||
     String(event.reason?.message || event.reason).includes('vite'))
  ) {
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  if (
    event.message &&
    (event.message.includes('WebSocket') || event.message.includes('vite'))
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);

// Register service worker for offline asset caching & background sync
registerServiceWorker();

