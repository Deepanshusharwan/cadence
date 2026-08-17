"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { SparkleIcon } from "./icons";

type ToastVariant = "default" | "celebrate-met" | "celebrate-exceeded";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (message: string) => void;
  celebrate: (message: string, tier?: "met" | "exceeded") => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

// Fixed confetti burst pattern, cycling through the shared accent palette —
// deliberately not randomized so the celebration feels designed, not noisy.
const CONFETTI_DOTS: { dx: string; dy: string; color: string }[] = [
  { dx: "-28px", dy: "-20px", color: "bg-signal-blue" },
  { dx: "30px", dy: "-16px", color: "bg-orchid" },
  { dx: "-36px", dy: "10px", color: "bg-sky-wash" },
  { dx: "36px", dy: "12px", color: "bg-terracotta" },
  { dx: "2px", dy: "-32px", color: "bg-marigold" },
  { dx: "-4px", dy: "26px", color: "bg-midnight-ink" },
];

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissAfter = useCallback((id: number, ms: number) => {
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id));
    }, ms);
  }, []);

  const show = useCallback(
    (message: string) => {
      const id = nextId++;
      setToasts((t) => [...t, { id, message, variant: "default" }]);
      dismissAfter(id, 2600);
    },
    [dismissAfter]
  );

  const celebrate = useCallback(
    (message: string, tier: "met" | "exceeded" = "met") => {
      const id = nextId++;
      setToasts((t) => [
        ...t,
        { id, message, variant: tier === "exceeded" ? "celebrate-exceeded" : "celebrate-met" },
      ]);
      dismissAfter(id, 3400);
    },
    [dismissAfter]
  );

  const value = useMemo(() => ({ show, celebrate }), [show, celebrate]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => {
          const isCelebration = toast.variant !== "default";
          return (
            <div
              key={toast.id}
              className={`relative flex items-center gap-2 rounded-lg border px-4 py-2.5 text-body-sm font-medium shadow-[0px_4px_12px_rgba(0,0,0,0.12)] ${
                toast.variant === "celebrate-exceeded"
                  ? "animate-celebrate-in border-terracotta bg-terracotta text-pure-white"
                  : toast.variant === "celebrate-met"
                    ? "animate-celebrate-in border-marigold bg-marigold text-ink-black"
                    : "animate-word-in border-ink-black/8 bg-pure-white text-ink-black"
              }`}
            >
              {isCelebration ? (
                <>
                  {CONFETTI_DOTS.map((dot, i) => (
                    <span
                      key={i}
                      aria-hidden
                      className={`animate-confetti-burst pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full ${dot.color}`}
                      style={{ "--dx": dot.dx, "--dy": dot.dy } as CSSProperties}
                    />
                  ))}
                  <SparkleIcon className="h-4 w-4 shrink-0" />
                </>
              ) : (
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-marigold text-[10px] text-ink-black">
                  ✓
                </span>
              )}
              {toast.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
