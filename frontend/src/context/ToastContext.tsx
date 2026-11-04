import React, { createContext, useState, useCallback } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

export interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      removeToast(id);
    }, 3800);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-lg shadow-lg text-sm transition-all duration-300 border ${
              toast.type === 'error'
                ? 'bg-[#fef2f2] border-[#fecaca] text-[#b91c1c]'
                : toast.type === 'success'
                ? 'bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]'
                : toast.type === 'warning'
                ? 'bg-[#fffbeb] border-[#fef3c7] text-[#b45309]'
                : 'bg-[#f0fdfa] border-[#ccfbf1] text-[#0f766e]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />}
              {toast.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0 text-green-600" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />}
              {toast.type === 'info' && <Info className="w-5 h-5 flex-shrink-0 text-teal-600" />}
              <span className="font-medium">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:opacity-75 rounded transition-opacity"
              aria-label="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
