"use client";

import { createContext, useCallback, useContext, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = "info" | "success" | "warning" | "error";

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

// ── Style maps ────────────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<ToastVariant, string> = {
  info:    "bg-blue-600 text-white",
  success: "bg-emerald-700 text-white",
  warning: "bg-yellow-500 text-white",
  error:   "bg-red-600 text-white",
};

const VARIANT_ICONS: Record<ToastVariant, string> = {
  info:    "ℹ",
  success: "✓",
  warning: "⚠",
  error:   "✕",
};

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

let nextId = 0;
const DURATION_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, DURATION_MS);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container — top-right */}
      {toasts.length > 0 && (
        <div
          className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
          aria-live="polite"
          aria-atomic="false"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-3 min-w-[260px] max-w-sm px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in-down ${VARIANT_STYLES[t.variant]}`}
            >
              <span className="shrink-0 font-bold text-base leading-none">
                {VARIANT_ICONS[t.variant]}
              </span>
              <span className="flex-1">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 opacity-70 hover:opacity-100 transition text-base leading-none ml-1"
                aria-label="ปิด"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx.toast;
}
