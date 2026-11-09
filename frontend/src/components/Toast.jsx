import React, { createContext, useContext, useState } from 'react';
import { X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (content, type = 'info', timeout = 3500) => {
    const id = Date.now() + Math.random();
    let message = '';
    let toastType = type;

    if (typeof content === 'string') {
      message = content;
    } else if (content && typeof content === 'object') {
      message = content.title || content.msg || content.description || JSON.stringify(content);
      toastType = content.type || type;
    }

    setToasts(prev => [{ id, message, type: toastType }, ...prev]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, timeout);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Provide both function directly and object with addToast/toast properties
  const contextValue = Object.assign(
    (msg, type, timeout) => addToast(msg, type, timeout),
    {
      addToast,
      toast: addToast,
    }
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-3 max-w-sm px-4 py-2.5 rounded-xl shadow-lg border text-xs font-mono pointer-events-auto transition-all duration-200 backdrop-blur-md ${
              t.type === 'error'
                ? 'bg-red-500/20 border-red-500/50 text-red-700 dark:text-red-300 shadow-red-500/10'
                : 'bg-emerald-50 dark:bg-[#08150c]/95 border-emerald-500/40 dark:border-green-500/40 text-emerald-950 dark:text-green-300 shadow-[0_4px_20px_rgba(34,197,94,0.15)]'
            }`}
          >
            <span className="flex-1 font-semibold">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 hover:opacity-75 transition-opacity cursor-pointer"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Return fallback no-op so components never crash
    const noop = () => {};
    noop.addToast = () => {};
    return noop;
  }
  return ctx;
};
