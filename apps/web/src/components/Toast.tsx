import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { CheckIcon, WarningIcon, InfoIcon, PhoneIcon, XIcon } from "@phosphor-icons/react";

export interface ToastItem {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message?: string;
  clinicPhone?: string;
}

interface ToastContextType {
  toast: (item: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (item: Omit<ToastItem, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { ...item, id }]);

      // Auto-dismiss after 4.5 seconds
      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast Container Stack */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-[15px] border shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
              t.type === "success"
                ? "bg-slate-900/95 text-white border-blue-500/40"
                : t.type === "error"
                  ? "bg-slate-900/95 text-white border-red-500/40"
                  : "bg-slate-900/95 text-white border-slate-700"
            }`}
          >
            {/* Status Icon */}
            <div
              className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                t.type === "success"
                  ? "bg-blue-500 text-white"
                  : t.type === "error"
                    ? "bg-red-500 text-white"
                    : "bg-slate-700 text-slate-200"
              }`}
            >
              {t.type === "success" ? (
                <CheckIcon size={16} weight="bold" />
              ) : t.type === "error" ? (
                <WarningIcon size={16} weight="bold" />
              ) : (
                <InfoIcon size={16} weight="bold" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">{t.title}</span>
                <span className="text-[10px] font-mono text-slate-400">now</span>
              </div>
              {t.message && (
                <p className="text-xs text-slate-300 leading-relaxed m-0">{t.message}</p>
              )}
              {t.clinicPhone && (
                <div className="pt-1">
                  <a
                    href={`tel:${t.clinicPhone}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 underline hover:text-blue-300"
                  >
                    <PhoneIcon size={13} weight="bold" />
                    <span>Call Office: {t.clinicPhone}</span>
                  </a>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              aria-label="Close notification"
              className="shrink-0 text-slate-400 hover:text-white p-1 rounded-md text-xs cursor-pointer"
            >
              <XIcon size={14} weight="bold" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
