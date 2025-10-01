'use client';

import { toast as sonnerToast, Toaster as ToastProvider, type ExternalToast } from 'sonner';

// Include 'destructive' for backward compatibility; map it to 'error' internally
export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info' | 'destructive';

export interface ToastOptions extends Partial<ExternalToast> {
  title?: string;
  description?: string; // Made optional
  variant?: ToastVariant;
  duration?: number;
}

export const toast = ({
  title,
  description,
  variant = 'default',
  duration = 5000,
  ...options
}: ToastOptions) => {
  const message = description || title || '';

  if (variant === 'default') {
    sonnerToast(message, { duration, ...options });
    return;
  }

  // Map legacy 'destructive' to 'error' for Sonner
  const method = variant === 'destructive' ? 'error' : variant;
  // @ts-expect-error indexed access on sonnerToast methods
  sonnerToast[method](message, { duration, ...options });
};

export const useToast = () => {
  return {
    toast,
    dismiss: sonnerToast.dismiss,
    error: (message: string) => toast({ description: message, variant: 'error' }),
    success: (message: string) => toast({ description: message, variant: 'success' }),
    warning: (message: string) => toast({ description: message, variant: 'warning' }),
    info: (message: string) => toast({ description: message, variant: 'info' }),
  };
};

export { ToastProvider };
