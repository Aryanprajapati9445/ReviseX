import { useState, useCallback, createContext, useContext, useEffect } from "react";

/** @typedef {{ id:string, message:string, type:'success'|'error'|'info', duration?:number }} Toast */

const ToastCtx = createContext(null);

let _id = 0;

/**
 * Toast provider — wrap the app root with this to enable toasts everywhere.
 * Call `useToast()` in any child component to show notifications.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback(({ message, type = "info", duration = 4000 }) => {
    const id = String(++_id);
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) setTimeout(() => dismiss(id), duration);
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const TYPE_STYLES = {
    success: { border: "rgba(16,185,129,0.4)", icon: "✓", color: "#10b981" },
    error:   { border: "rgba(239,68,68,0.4)",  icon: "✕", color: "#ef4444" },
    info:    { border: "rgba(167,139,250,0.4)", icon: "ℹ", color: "#a78bfa" },
  };

  return (
    <ToastCtx.Provider value={{ show, dismiss }}>
      {children}
      {/* Toast container */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, maxWidth: 360 }}>
        {toasts.map(t => {
          const s = TYPE_STYLES[t.type] || TYPE_STYLES.info;
          return (
            <div key={t.id}
              style={{ background: "rgba(13,13,26,0.97)", border: `1px solid ${s.border}`, borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", backdropFilter: "blur(16px)", animation: "slideDown 0.25s ease", cursor: "pointer" }}
              onClick={() => dismiss(t.id)}
            >
              <span style={{ color: s.color, fontSize: 16, lineHeight: 1, flexShrink: 0, fontWeight: 700, marginTop: 1 }}>{s.icon}</span>
              <span style={{ color: "#e2e2f0", fontSize: 14, lineHeight: 1.5 }}>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

/** Returns `{ success, error, info }` — call these to show a toast notification. */
export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return {
    success: (message, opts) => ctx.show({ message, type: "success", ...opts }),
    error:   (message, opts) => ctx.show({ message, type: "error",   ...opts }),
    info:    (message, opts) => ctx.show({ message, type: "info",    ...opts }),
    dismiss: ctx.dismiss,
  };
}
