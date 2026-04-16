import { useNotifications } from "../context/NotificationContext";
import { useNavigate } from "react-router-dom";

export default function NotificationToasts() {
  const { toasts, dismiss } = useNotifications();
  const navigate = useNavigate();

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 10050,
      display: "flex", flexDirection: "column", gap: 8,
      maxWidth: 360, width: "calc(100vw - 40px)", pointerEvents: "none",
    }}>
      <style>{`
        @keyframes toast-in { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => {
            if (t.link) navigate(t.link);
            else if (t.onClick) t.onClick();
            dismiss(t.id);
          }}
          style={{
            pointerEvents: "auto",
            background: "#14161A", border: "1px solid rgba(255,255,255,0.08)",
            borderLeft: `3px solid ${t.color || "#FF6B35"}`,
            borderRadius: 8, padding: "12px 14px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
            cursor: t.link || t.onClick ? "pointer" : "default",
            animation: "toast-in 0.25s cubic-bezier(.22,1,.36,1) both",
            fontFamily: "'DM Sans', sans-serif",
            transition: "transform 0.15s",
            position: "relative",
          }}
          onMouseEnter={(e) => { if (t.link || t.onClick) e.currentTarget.style.transform = "translateX(-2px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateX(0)"; }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); dismiss(t.id); }}
            style={{ position: "absolute", top: 6, right: 8, background: "none", border: "none", color: "#6E6E72", cursor: "pointer", fontSize: 12, padding: 4, lineHeight: 1 }}
          >✕</button>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#F5F3EE", marginBottom: 4, paddingRight: 20, lineHeight: 1.3 }}>
            {t.title}
          </div>
          {t.body && (
            <div style={{ fontSize: 11, color: "#6E6E72", lineHeight: 1.4, paddingRight: 20 }}>
              {t.body}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
