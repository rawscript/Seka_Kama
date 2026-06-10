'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { getCorsErrorStatus, resetCorsError } from '@/services/api';

interface ApiContextType {
  // CORS error state
  corsErrorActive: boolean;
  corsErrorMessage: string | null;
  
  // API availability tracking
  apiAvailable: boolean;
  lastCheckTime: number;
  retryCount: number;
  
  // Methods
  checkApiAvailability: () => Promise<boolean>;
  markApiUnavailable: (reason?: string) => void;
  markApiAvailable: () => void;
  shouldAttemptRequest: () => boolean;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

interface ApiProviderProps {
  children: ReactNode;
}

const RETRY_COOLDOWN_MS = 30000; // 30 seconds
const MAX_RETRY_COUNT = 3;

export function ApiProvider({ children }: ApiProviderProps) {
  const [corsErrorActive, setCorsErrorActive] = useState(false);
  const [corsErrorMessage, setCorsErrorMessage] = useState<string | null>(null);
  const [apiAvailable, setApiAvailable] = useState(true);
  const [lastCheckTime, setLastCheckTime] = useState(Date.now());
  const [retryCount, setRetryCount] = useState(0);

  // Sync with global CORS error state from api.ts
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const globalCorsError = getCorsErrorStatus();
      if (globalCorsError !== corsErrorActive) {
        setCorsErrorActive(globalCorsError);
        if (globalCorsError) {
          setCorsErrorMessage('CORS error detected - backend API is blocking requests');
          setApiAvailable(false);
        }
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [corsErrorActive]);

  const checkApiAvailability = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    
    // If CORS error is active and cooldown hasn't expired, return false immediately
    if (corsErrorActive && (now - lastCheckTime) < RETRY_COOLDOWN_MS) {
      return false;
    }

    // If we've retried too many times, wait for cooldown
    if (retryCount >= MAX_RETRY_COUNT && (now - lastCheckTime) < RETRY_COOLDOWN_MS) {
      return false;
    }

    try {
      // Simple health check with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/health`,
        { 
          signal: controller.signal,
          mode: 'cors',
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        // API is available - reset all error states
        setApiAvailable(true);
        setCorsErrorActive(false);
        setCorsErrorMessage(null);
        setRetryCount(0);
        resetCorsError();
        setLastCheckTime(now);
        return true;
      } else {
        // API returned error
        setApiAvailable(false);
        setRetryCount(prev => prev + 1);
        setLastCheckTime(now);
        return false;
      }
    } catch (error) {
      // Network error or CORS error
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isCorsError = errorMsg.includes('CORS') || errorMsg.includes('cors') || errorMsg.includes('Failed to fetch');
      
      if (isCorsError) {
        setCorsErrorActive(true);
        setCorsErrorMessage('CORS error - backend is not configured or offline');
      }
      
      setApiAvailable(false);
      setRetryCount(prev => prev + 1);
      setLastCheckTime(now);
      return false;
    }
  }, [corsErrorActive, lastCheckTime, retryCount]);

  const markApiUnavailable = useCallback((reason?: string) => {
    setApiAvailable(false);
    setRetryCount(prev => prev + 1);
    setLastCheckTime(Date.now());
    if (reason) {
      setCorsErrorMessage(reason);
      if (reason.toLowerCase().includes('cors')) {
        setCorsErrorActive(true);
      }
    }
  }, []);

  const markApiAvailable = useCallback(() => {
    setApiAvailable(true);
    setCorsErrorActive(false);
    setCorsErrorMessage(null);
    setRetryCount(0);
    setLastCheckTime(Date.now());
    resetCorsError();
  }, []);

  const shouldAttemptRequest = useCallback((): boolean => {
    const now = Date.now();
    
    // If API is known to be available, allow request
    if (apiAvailable && !corsErrorActive) {
      return true;
    }

    // If we've hit max retries and cooldown hasn't expired, block request
    if (retryCount >= MAX_RETRY_COUNT && (now - lastCheckTime) < RETRY_COOLDOWN_MS) {
      return false;
    }

    // If CORS error is active and cooldown hasn't expired, block request
    if (corsErrorActive && (now - lastCheckTime) < RETRY_COOLDOWN_MS) {
      return false;
    }

    // Allow retry if cooldown has expired
    if ((now - lastCheckTime) >= RETRY_COOLDOWN_MS) {
      return true;
    }

    // Default to allowing request (first attempts)
    return retryCount < MAX_RETRY_COUNT;
  }, [apiAvailable, corsErrorActive, retryCount, lastCheckTime]);

  const value: ApiContextType = {
    corsErrorActive,
    corsErrorMessage,
    apiAvailable,
    lastCheckTime,
    retryCount,
    checkApiAvailability,
    markApiUnavailable,
    markApiAvailable,
    shouldAttemptRequest
  };

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApiContext() {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApiContext must be used within an ApiProvider');
  }
  return context;
}
