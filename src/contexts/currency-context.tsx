"use client";

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { Currency, DEFAULT_CURRENCY, formatCurrency as formatCurrencyUtil } from '@/data/currencies';
import { api } from '@/trpc/react';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatCurrency: (amount: number) => string;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

/**
 * Hook to use currency context
 */
export function useCurrency() {
  const context = useContext(CurrencyContext);

  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }

  return context;
}

interface CurrencyProviderProps {
  children: ReactNode;
}

/**
 * Currency Provider Component
 * Manages global currency settings and provides formatting utilities
 */
export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const [currency, setCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch currency settings from the server
  const { data: feeSettings, isLoading: settingsLoading } = api.settings.getFeeSettings.useQuery(
    undefined,
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
    }
  );

  // Update currency settings mutation
  const updateCurrencyMutation = api.settings.updateCurrency.useMutation({
    onSuccess: () => {
      // Currency updated successfully
    },
    onError: (error) => {
      console.error('Failed to update currency settings:', error);
    },
  });

  // Update local currency state when settings are loaded
  useEffect(() => {
    if (feeSettings?.currency && !settingsLoading) {
      setCurrencyState(feeSettings.currency);
      setIsLoading(false);
    } else if (!settingsLoading) {
      // No settings found, use default
      setCurrencyState(DEFAULT_CURRENCY);
      setIsLoading(false);
    }
  }, [feeSettings, settingsLoading]);

  // Function to update currency and persist to server
  const setCurrency = async (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    
    // Update on server
    try {
      await updateCurrencyMutation.mutateAsync({
        currency: newCurrency,
      });
    } catch (error) {
      console.error('Failed to save currency settings:', error);
      // Revert to previous currency on error
      setCurrencyState(currency);
    }
  };

  // Format currency using the current currency settings
  const formatCurrency = (amount: number): string => {
    return formatCurrencyUtil(amount, currency);
  };

  const contextValue: CurrencyContextType = {
    currency,
    setCurrency,
    formatCurrency,
    isLoading: isLoading || settingsLoading,
  };

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
}

/**
 * Higher-order component to wrap components with currency context
 */
export function withCurrency<P extends object>(Component: React.ComponentType<P>) {
  return function CurrencyWrappedComponent(props: P) {
    return (
      <CurrencyProvider>
        <Component {...props} />
      </CurrencyProvider>
    );
  };
}
