import { useNotifications } from "../context/NotificationContext";
import { useNavigate } from "react-router-dom";

const BRAND_META = {
  elev8: { label: "ELEV8", color: "#FF6B35" },
  faithdrive: { label: "FaithDrive", color: "#E8B458" },
  tendercards: { label: "Tender Cards", color: "#4CAF7D" },
};

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return Math.floor(diff / 60) + "m";
  if (diff < 86400) return Math.floor(diff / 3600) + "u";
  return Math.floor(diff / 86400) + "d";
}

export default function DailyBriefing() {
  const { briefing, dismissBriefing, permission, requestPermission, myFirstName } = useNotifications();
  const navigate = useNavigate();

  if (!briefing) return null;

  const total = briefing.newRequests.length + briefing.mentions.length;
  const greeting = (() => {
    const h = new Date().getHours();
    return h < 6 ? "Goedenacht" : h < 12 ? "Goedemorgen" : h < 18 ? "Goedemiddag" : "Goedenavond";
  })();

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) dismissBriefing(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
        zIndex: 10040, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        animation: "briefing-fade 0.2s ease-out",
      }}
    >
      <style>{`
        @keyframes briefing-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes briefing-slide { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={{
        background: "#14161A", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12, maxWidth: 560, width: "100%",
        boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
        fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE",
        animation: "briefing-slide 0.3s cubic-bezier(.22,1,.36,1) both",
        position: "relative", overflow: "hidden",
      }}>
        {/* Gradient overlay */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(600px circle at top left, rgba(255,107,53,0.08), transparent 50%)", pointerEvents: "none" }} />

        <div style={{ padding: "28px 32px 20px", position: "relative" }}>
          <div style={{ fontSize: 11, color: "#FF6B35", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>
            ☀ Daily briefing
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, color: "#F5F3EE", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 8 }}>
            {greeting}{myFirstName ? `, ${myFirstName}` : ""}.
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#6E6E72", lineHeight: 1.5 }}>
            Je miste <strong style={{ color: "#F5F3EE", fontWeight: 500 }}>{total} {total === 1 ? "ding" : "dingen"}</strong> sinds je laatst online was.
          </p>
        </div>

        <div style={{ maxHeight: "50vh", overflowY: "auto", padding: "0 32px" }}>
          {/* @Mentions */}
          {briefing.mentions.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#6E6E72", fontWeight: 600, marginBottom: 10 }}>
                💬 {briefing.mentions.length} chat mention{briefing.mentions.length === 1 ? "" : "s"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {briefing.mentions.slice(0, 5).map((m) => (
                  <div key={m.id} onClick={() => { navigate("/chat"); dismissBriefing(); }} style={{
                    padding: "10px 14px", borderRadius: 6,
                    background: "rgba(255,107,53,0.05)", border: "1px solid rgba(255,107,53,0.15)",
                    cursor: "pointer", transition: "all 0.15s",
                  }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#FF6B35" }}>{m.senderName}</span>
                      <span style={{ fontSize: 10, color: "#6E6E72" }}>{timeAgo(m.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#F5F3EE", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {briefing.mentions.length > 5 && (
                  <div style={{ fontSize: 11, color: "#6E6E72", textAlign: "center", padding: "4px 0" }}>+{briefing.mentions.length - 5} meer in chat</div>
                )}
              </div>
            </div>
          )}

          {/* New requests */}
          {briefing.newRequests.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#6E6E72", fontWeight: 600, marginBottom: 10 }}>
                📬 {briefing.newRequests.length} nieuwe aanvraag{briefing.newRequests.length === 1 ? "" : "en"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {briefing.newRequests.slice(0, 5).map((r) => {
                  const brand = BRAND_META[r.brand] || { label: r.brand, color: "#6E6E72" };
                  return (
                    <div key={r.id} onClick={() => { navigate(`/sales?brand=${r.brand}&tab=aanvragen`); dismissBriefing(); }} style={{
                      padding: "10px 14px", borderRadius: 6,
                      background: "rgba(232,180,88,0.04)", border: `1px solid ${brand.color}22`,
                      borderLeft: `2px solid ${brand.color}`,
                      cursor: "pointer", transition: "all 0.15s",
                    }}>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: brand.color, fontWeight: 700 }}>{brand.label}</span>
                        <span style={{ fontSize: 10, color: "#6E6E72" }}>{timeAgo(r.received_at)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "#F5F3EE", fontWeight: 500, marginBottom: 1 }}>
                        {r.from_name || r.from_email || "Onbekend"}
                      </div>
                      <div style={{ fontSize: 11, color: "#6E6E72", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.subject || "(geen onderwerp)"}
                      </div>
                    </div>
                  );
                })}
                {briefing.newRequests.length > 5 && (
                  <div style={{ fontSize: 11, color: "#6E6E72", textAlign: "center", padding: "4px 0" }}>+{briefing.newRequests.length - 5} meer</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: "16px 32px 24px", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {permission !== "granted" && (
            <button
              onClick={() => requestPermission()}
              style={{
                padding: "10px 16px", borderRadius: 4, border: "1px solid rgba(255,107,53,0.25)",
                background: "rgba(255,107,53,0.06)", color: "#FF6B35",
                fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                letterSpacing: 0.5, textTransform: "uppercase",
              }}
            >
              🔔 Zet desktop notificaties aan
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={dismissBriefing}
            style={{
              padding: "10px 20px", borderRadius: 4, border: "none",
              background: "#FF6B35", color: "#0E0E10",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit", letterSpacing: 0.5, textTransform: "uppercase",
            }}
          >
            Aan de slag
          </button>
        </div>
      </div>
    </div>
  );
}
