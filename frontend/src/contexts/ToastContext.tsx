"use client";
import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export type ToastType = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  leaving: boolean;
  action?: ToastAction;
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType, action?: ToastAction) => void;
  removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, string> = {
  success: "✓",
  error:   "✗",
  info:    "·",
};

const COLORS: Record<ToastType, { border: string; icon: string; bg: string }> = {
  success: { border: "rgba(34,197,94,0.25)",  icon: "#22c55e", bg: "rgba(34,197,94,0.07)"  },
  error:   { border: "rgba(239,68,68,0.25)",  icon: "#ef4444", bg: "rgba(239,68,68,0.07)"  },
  info:    { border: "rgba(91,103,248,0.25)", icon: "#5b67f8", bg: "rgba(91,103,248,0.07)" },
};

const DURATION = 6000; // Um pouco mais longo para dar tempo de clicar "Desfazer"
const ANIM_OUT = 320;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts]   = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);
  const counter = useRef(0);

  useEffect(() => { setMounted(true); }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, ANIM_OUT);
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = "success", action?: ToastAction) => {
      const id = ++counter.current;
      setToasts((prev) => [...prev, { id, message, type, leaving: false, action }]);
      // Se tem ação (ex: Desfazer), o timer é mais longo
      const duration = action ? DURATION : DURATION - 2000;
      setTimeout(() => removeToast(id), duration);
      return id;
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {mounted &&
        createPortal(
          <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 99999, display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none" }}>
            <style>{`
              @keyframes toastIn  { from { opacity:0; transform:translateY(10px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
              @keyframes toastOut { from { opacity:1; transform:translateX(0);   } to { opacity:0; transform:translateX(16px); } }
            `}</style>
            {toasts.map((t) => {
              const c = COLORS[t.type];
              return (
                <div
                  key={t.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "11px 14px",
                    background: "#111114",
                    border: `1px solid ${c.border}`,
                    borderRadius: 10,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
                    backdropFilter: "blur(8px)",
                    minWidth: 260, maxWidth: 380,
                    pointerEvents: "auto", cursor: "pointer",
                    animation: t.leaving
                      ? `toastOut ${ANIM_OUT}ms ease forwards`
                      : "toastIn 0.25s ease forwards",
                  }}
                  onClick={() => !t.action && removeToast(t.id)}
                >
                  {/* Ícone */}
                  <span style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: c.bg, border: `1px solid ${c.border}`,
                    display: "grid", placeItems: "center",
                    fontSize: 11, fontWeight: 700, color: c.icon, flexShrink: 0,
                  }}>
                    {ICONS[t.type]}
                  </span>

                  {/* Mensagem */}
                  <span style={{ color: "#c2c2cc", fontSize: 13, fontFamily: "'Geist'", lineHeight: 1.4, flex: 1 }}>
                    {t.message}
                  </span>

                  {/* Botão de ação (ex: Desfazer) */}
                  {t.action && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        t.action!.onClick();
                        removeToast(t.id);
                      }}
                      style={{
                        flexShrink: 0,
                        padding: "4px 10px",
                        fontSize: 11, fontFamily: "'Geist'", fontWeight: 600,
                        background: "transparent",
                        border: `1px solid ${c.border}`,
                        borderRadius: 6, color: c.icon, cursor: "pointer",
                        whiteSpace: "nowrap",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = c.bg)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {t.action.label}
                    </button>
                  )}

                  {/* X para fechar */}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeToast(t.id); }}
                    style={{
                      flexShrink: 0, width: 18, height: 18,
                      background: "transparent", border: "none",
                      color: "#525264", fontSize: 14, cursor: "pointer",
                      display: "grid", placeItems: "center", borderRadius: 4,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}