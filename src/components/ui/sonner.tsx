"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "error";

type Toast = {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (t: Omit<Toast, "id" | "variant"> & { variant?: ToastVariant }) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const idRef = React.useRef(0);

  const toast = React.useCallback<ToastContextValue["toast"]>((t) => {
    const id = ++idRef.current;
    const next: Toast = { id, variant: "default", ...t } as Toast;
    setToasts((prev) => [...prev, next]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto rounded-lg border bg-card p-4 shadow-lg",
              t.variant === "success" &&
                "border-emerald-300 dark:border-emerald-800",
              t.variant === "error" && "border-destructive",
            )}
          >
            <div className="text-sm font-semibold">{t.title}</div>
            {t.description ? (
              <div className="mt-1 text-sm text-muted-foreground">{t.description}</div>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <Toaster>");
  return ctx;
}
