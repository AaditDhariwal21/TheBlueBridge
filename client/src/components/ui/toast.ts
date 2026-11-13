import { createContext, useContext } from 'react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  /** A short bold line above the message. */
  title?: string;
  /** Milliseconds before it dismisses itself (hover and focus pause it). 0 keeps it until dismissed. */
  duration?: number;
  /** One follow-up, e.g. "Try again" or "Undo". Clicking it also dismisses the toast. */
  action?: { label: string; onClick: () => void };
}

export interface Toast extends ToastOptions {
  id: string;
  variant: ToastVariant;
  message: string;
  duration: number;
}

export interface ToastApi {
  show: (variant: ToastVariant, message: string, options?: ToastOptions) => string;
  success: (message: string, options?: ToastOptions) => string;
  error: (message: string, options?: ToastOptions) => string;
  info: (message: string, options?: ToastOptions) => string;
  warning: (message: string, options?: ToastOptions) => string;
  dismiss: (id: string) => void;
}

/** Errors stay longer: they usually need reading, and often offer an action. */
export const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 5_000,
  info: 5_000,
  warning: 7_000,
  error: 8_000,
};

export const ToastContext = createContext<ToastApi | null>(null);

/** Transient feedback ("Approved", "Couldn't load more"). Persistent errors stay inline. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>.');
  return api;
}
