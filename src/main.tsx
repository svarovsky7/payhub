import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { setupViteErrorHandler } from '@/shared/lib';
import './index.css';
import App from './App.tsx';

// Setup error handlers for development
setupViteErrorHandler();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
