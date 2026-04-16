import { useFocusTimer } from "../context/FocusTimerContext";
import { useState } from "react";

const BRAND_COLORS = { elev8: "#FF6B35", faithdrive: "#E8B458", tendercards: "#4CAF7D" };
const BRAND_LABELS = { elev8: "ELEV8", faithdrive: "FaithDrive", tendercards: "Tender Cards" };

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function FocusTimerWidget() {
  const { active, state, pause, resume, stop, discard, getElapsedMs, isPaused } = useFocusTimer();
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);

  if (!active && !result) return null;

  if (result) {
    return (
      <div style={widgetBox}>
        <style>{keyframeCSS}</style>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, background: "rgba(76,175,125,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#4CAF7D", flexShrink: 0 }}>✓</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "#4CAF7D", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>Sessie opgeslagen</div>
            <div style={{ fontSize: 12, color: "#F5F3EE", marginTop: 2 }}>{result.hours}u toegevoegd aan Uren</div>
          </div>
          <button onClick={() => setResult(null)} style={closeBtn}>✕</button>
        </div>
      </div>
    );
  }

  const elapsedMs = getElapsedMs();
  const brandColor = BRAND_COLORS[state.brand] || "#FF6B35";
  const brandLabel = BRAND_LABELS[state.brand] || state.brand;

  const onStop = async (save) => {
    const r = await stop({ saveEntry: save });
    if (save && r) {
      setResult(r);
      setTimeout(() => setResult(null), 6000);
    }
    setConfirming(false);
  };

  if (confirming) {
    const elapsedH = elapsedMs / 3600000;
    const rounded = Math.max(0.25, Math.round(elapsedH / 0.25) * 0.25).toFixed(2);
    return (
      <div style={widgetBox}>
        <style>{keyframeCSS}</style>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "#6E6E72", letterSpacing: 1, textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Sessie beëindigen</div>
          <div style={{ fontSize: 13, color: "#F5F3EE", fontWeight: 500, lineHeight: 1.3, marginBottom: 2 }}>{state.taskTitle}</div>
          <div style={{ fontSize: 11, color: "#6E6E72" }}>
            Gewerkt: <strong style={{ color: brandColor }}>{formatTime(elapsedMs)}</strong> · Opslaan als: <strong style={{ color: "#F5F3EE" }}>{rounded}u</strong>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => onStop(true)}
            style={{ flex: 1, padding: "8px 10px", borderRadius: 4, border: "none", background: "#4CAF7D", color: "#0E0E10", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5 }}
          >
            ✓ Opslaan in Uren
          </button>
          <button
            onClick={() => onStop(false)}
            style={{ padding: "8px 10px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#6E6E72", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
          >
            Verwerp
          </button>
          <button
            onClick={() => setConfirming(false)}
            style={{ padding: "8px 10px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#6E6E72", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
          >
            Terug
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...widgetBox, borderLeft: `3px solid ${isPaused ? "#6E6E72" : brandColor}` }}>
      <style>{keyframeCSS}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: isPaused ? "rgba(110,110,114,0.15)" : brandColor + "1E",
          color: isPaused ? "#6E6E72" : brandColor,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
          animation: isPaused ? "none" : "pulse 2s ease-in-out infinite",
        }}>
          {isPaused ? "⏸" : "●"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 9, color: brandColor, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{brandLabel}</span>
            <span style={{ fontSize: 9, color: "#6E6E72", letterSpacing: 1, textTransform: "uppercase", fontWeight: 500 }}>{isPaused ? "· Gepauzeerd" : "· Focus"}</span>
          </div>
          <div style={{ fontSize: 12, color: "#F5F3EE", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{state.taskTitle}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, color: isPaused ? "#6E6E72" : "#F5F3EE", fontVariantNumeric: "tabular-nums" }}>
          {formatTime(elapsedMs)}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {isPaused ? (
            <button onClick={resume} title="Hervatten" style={iconBtn(brandColor)}>▶</button>
          ) : (
            <button onClick={pause} title="Pauzeren" style={iconBtn("#6E6E72")}>⏸</button>
          )}
          <button onClick={() => setConfirming(true)} title="Stop & opslaan" style={iconBtn("#4CAF7D")}>⏹</button>
        </div>
      </div>
    </div>
  );
}

const widgetBox = {
  position: "fixed", bottom: 20, right: 20,
  width: 320, maxWidth: "calc(100vw - 40px)",
  background: "#14161A", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10, padding: "14px 16px",
  boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
  fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE",
  zIndex: 9998,
  animation: "slideInUp 0.3s cubic-bezier(.22,1,.36,1) both",
};

const iconBtn = (color) => ({
  width: 30, height: 30, borderRadius: 6,
  background: color + "14", color, border: `1px solid ${color}33`,
  cursor: "pointer", fontSize: 11, fontFamily: "inherit",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  transition: "all 0.15s",
});

const closeBtn = {
  background: "none", border: "none", color: "#6E6E72",
  cursor: "pointer", fontSize: 14, padding: 4,
};

const keyframeCSS = `
  @keyframes pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.95); } }
  @keyframes slideInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
`;
