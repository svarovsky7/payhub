/**
 * Handle Vite HMR WebSocket connection errors
 */
export function setupViteErrorHandler(): void {
  if (import.meta.env.DEV) {
    // Handle unhandled promise rejections from Vite HMR
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      
      // Ignore browser extension errors
      if (error?.message?.includes('listener indicated an asynchronous response')) {
        event.preventDefault();
        return;
      }
      
      // Ignore Vite HMR connection errors
      if (error?.message?.includes('[vite]') || 
          error?.message?.includes('WebSocket') ||
          error?.message?.includes('Failed to fetch dynamically imported module')) {
        event.preventDefault();
        console.warn('Vite HMR error (ignored):', error.message);
        return;
      }
    });

    // Handle Vite connection issues
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      const firstArg = args[0];
      
      // Suppress Vite WebSocket errors
      if (typeof firstArg === 'string' && 
          (firstArg.includes('[vite]') || 
           firstArg.includes('WebSocket') ||
           firstArg.includes('message channel closed'))) {
        console.warn('Vite connection issue (suppressed):', firstArg);
        return;
      }
      
      originalConsoleError.apply(console, args);
    };
  }
}