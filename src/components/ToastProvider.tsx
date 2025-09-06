// Toast system: context API to show success/warning/error toasts; auto-dismiss and click-to-close
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

// Visual variants for toasts
type ToastType = 'success' | 'warning' | 'error';

type Toast = {
  id: string;
  type: ToastType;
  message: string;
  duration?: number; // ms
};

type ToastContextValue = {
  push: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Remove a toast and clear any pending timeout
  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timeouts.current[id];
    if (t) {
      clearTimeout(t);
      delete timeouts.current[id];
    }
  }, []);

  // Create a toast and schedule auto-dismiss
  const push = useCallback((message: string, type: ToastType = 'success', duration = 3000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const toast: Toast = { id, type, message, duration };
    setToasts((prev) => [...prev, toast]);
    timeouts.current[id] = setTimeout(() => remove(id), duration);
  }, [remove]);

  // Global cleanup: clear any timeouts on unmount
  useEffect(() => () => {
    // cleanup on unmount
    Object.values(timeouts.current).forEach(clearTimeout);
    timeouts.current = {};
  }, []);

  const value = useMemo<ToastContextValue>(() => ({
    push,
    success: (m, d) => push(m, 'success', d),
    warning: (m, d) => push(m, 'warning', d),
    error: (m, d) => push(m, 'error', d),
  }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
  {/* Render the stack of toasts in the top-right (see CSS) */}
  <div className="toast-container" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`} onClick={() => remove(t.id)}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
