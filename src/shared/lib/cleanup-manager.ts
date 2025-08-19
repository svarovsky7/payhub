/**
 * Cleanup manager for handling component lifecycle and preventing memory leaks
 */
export class CleanupManager {
  private cleanupFunctions: Set<() => void> = new Set();
  private isCleanedUp = false;

  /**
   * Add a cleanup function to be called on unmount
   */
  add(cleanup: () => void): void {
    if (this.isCleanedUp) {
      // If already cleaned up, run immediately
      cleanup();
      return;
    }
    this.cleanupFunctions.add(cleanup);
  }

  /**
   * Add an interval and automatically handle cleanup
   */
  addInterval(callback: () => void, delay: number): void {
    const intervalId = setInterval(callback, delay);
    this.add(() => clearInterval(intervalId));
  }

  /**
   * Add a timeout and automatically handle cleanup
   */
  addTimeout(callback: () => void, delay: number): void {
    const timeoutId = setTimeout(() => {
      callback();
      this.cleanupFunctions.delete(() => clearTimeout(timeoutId));
    }, delay);
    this.add(() => clearTimeout(timeoutId));
  }

  /**
   * Add an event listener and automatically handle cleanup
   */
  addEventListener<K extends keyof WindowEventMap>(
    target: Window | Document | HTMLElement,
    type: K | string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ): void {
    target.addEventListener(type as string, listener, options);
    this.add(() => target.removeEventListener(type as string, listener, options));
  }

  /**
   * Add an abort controller for fetch requests
   */
  createAbortController(): AbortController {
    const controller = new AbortController();
    this.add(() => controller.abort());
    return controller;
  }

  /**
   * Clean up all registered functions
   */
  cleanup(): void {
    if (this.isCleanedUp) return;
    
    this.isCleanedUp = true;
    this.cleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    });
    this.cleanupFunctions.clear();
  }

  /**
   * Check if cleanup has been called
   */
  get cleaned(): boolean {
    return this.isCleanedUp;
  }
}

/**
 * React hook for using CleanupManager
 */
import { useEffect, useRef } from 'react';

export function useCleanupManager(): CleanupManager {
  const managerRef = useRef<CleanupManager>();

  if (!managerRef.current) {
    managerRef.current = new CleanupManager();
  }

  useEffect(() => {
    const manager = managerRef.current;
    return () => {
      manager?.cleanup();
    };
  }, []);

  return managerRef.current;
}