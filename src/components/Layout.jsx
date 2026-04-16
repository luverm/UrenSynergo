import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useIsMobile } from "../hooks/useIsMobile";
import CommandPalette from "./CommandPalette";

const NAV_ITEMS = [
  {
    path: "/",
    label: "Uren",
    match: (p) => p === "/",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    path: "/chat",
    label: "Chat",
    match: (p) => p === "/chat",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    path: "/groups",
    label: "Projecten",
    match: (p) => p.startsWith("/groups"),
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    path: "/sales",
    label: "Sales",
    match: (p) => p === "/sales",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    path: "/mijn-taken",
    label: "Mijn taken",
    match: (p) => p === "/mijn-taken",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
];

const ADMIN_ITEMS = [
  {
    path: "/admin",
    label: "Admin",
    match: (p) => p === "/admin",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    path: "/settings",
    label: "Instellingen",
    match: (p) => p === "/settings",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

const PROFILE_ITEM = {
  path: "/profile",
  match: (p) => p === "/profile",
};

function Avatar({ url, name, size = 32 }) {
  if (url) return <div style={{ width: size, height: size, borderRadius: 2, background: `url(${url}) center/cover`, flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: 2, background: "rgba(255,107,53,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", fontSize: size * 0.4, fontWeight: 700, color: "#FF6B35", flexShrink: 0 }}>
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

const VIEWER_ITEMS = [
  {
    path: "/",
    label: "Uren overzicht",
    match: (p) => p === "/" || p === "/family",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

export default function Layout() {
  const { user, profile, signOut, isAdmin, isViewer } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Gebruiker";
  const items = isViewer ? VIEWER_ITEMS : (isAdmin ? [...NAV_ITEMS, ...ADMIN_ITEMS] : NAV_ITEMS);

  if (isMobile) {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@200;300;400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`
          @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
          @keyframes slideDown { from { opacity:0; max-height:0; } to { opacity:1; max-height:600px; } }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
          ::-webkit-scrollbar { width: 0; }
        `}</style>

        {/* Content */}
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 64, background: "#0E0E10", overflowY: "auto" }}>
          <Outlet />
        </div>

        <CommandPalette />

        {/* Bottom tab bar */}
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, height: 64,
          background: "#0E0E10", borderTop: "1px solid rgba(255,255,255,0.04)",
          display: "flex", alignItems: "center", justifyContent: "space-around",
          paddingBottom: "env(safe-area-inset-bottom, 0px)", zIndex: 50,
        }}>
          {items.map((item) => {
            const active = item.match(location.pathname);
            return (
              <button key={item.path} onClick={() => navigate(item.path)} style={{
                background: "none", border: "none", cursor: "pointer", padding: "8px 16px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                color: active ? "#FF6B35" : "#6E6E72", transition: "color 0.15s ease",
                transform: active ? "scale(1.05)" : "scale(1)",
              }}>
                {item.icon}
                {active && <div style={{ width: 4, height: 4, borderRadius: 99, background: "#FF6B35" }} />}
              </button>
            );
          })}
          {/* Profile tab */}
          <button onClick={() => navigate("/profile")} style={{
            background: "none", border: "none", cursor: "pointer", padding: "8px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          }}>
            <Avatar url={profile?.avatar_url} name={displayName} size={24} />
            {PROFILE_ITEM.match(location.pathname) && <div style={{ width: 4, height: 4, borderRadius: 99, background: "#FF6B35" }} />}
          </button>
        </div>
      </>
    );
  }

  // Desktop layout
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@200;300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideDown { from { opacity:0; max-height:0; } to { opacity:1; max-height:600px; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>

      {/* Sidebar */}
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: 240,
        background: "#0E0E10", borderRight: "1px solid rgba(255,255,255,0.04)",
        display: "flex", flexDirection: "column", zIndex: 50,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: "#F5F3EE", letterSpacing: "-0.03em" }}>ELEV</span>
          <svg width="30" height="40" viewBox="0 0 60 80" fill="none" style={{ marginTop: -2 }}>
            <path d="M30 4 C46 4,52 10,52 24 C52 34,46 38,36 40 C48 42,56 48,56 60 C56 72,46 78,30 78 C14 78,4 72,4 60 C4 48,12 42,24 40 C14 38,8 34,8 24 C8 10,14 4,30 4Z" stroke="#FF6B35" strokeWidth="4" fill="none"/>
          </svg>
          <svg width="14" height="36" viewBox="0 0 32 80" fill="none" style={{ marginLeft: -6, marginTop: -2 }}>
            <line x1="16" y1="76" x2="16" y2="8" stroke="#FF6B35" strokeWidth="4" strokeLinecap="round"/>
            <polyline points="4,24 16,6 28,24" fill="none" stroke="#FF6B35" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Command palette trigger */}
        <div style={{ padding: "0 12px 12px" }}>
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: !navigator.platform.toUpperCase().includes("MAC"), metaKey: navigator.platform.toUpperCase().includes("MAC") }))}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 2,
              border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)",
              color: "#6E6E72", fontSize: 12, fontWeight: 400, fontFamily: "'DM Sans', sans-serif",
              cursor: "pointer", transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: 8,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,107,53,0.15)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.015)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <span style={{ flex: 1, textAlign: "left" }}>Zoeken…</span>
            <kbd style={{ fontSize: 9.5, color: "#6E6E72", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 3, fontFamily: "inherit", letterSpacing: 0.3 }}>⌘K</kbd>
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "4px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {items.map((item) => {
            const active = item.match(location.pathname);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 16px", borderRadius: 2, border: "none",
                  background: active ? "rgba(255,107,53,0.06)" : "transparent",
                  borderLeft: active ? "2px solid #FF6B35" : "2px solid transparent",
                  color: active ? "#F5F3EE" : "#6E6E72",
                  fontSize: 14, fontWeight: active ? 500 : 400,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: "pointer", transition: "all 0.15s ease",
                  textAlign: "left", width: "100%",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User block */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "16px" }}>
          <div
            onClick={() => navigate("/profile")}
            style={{
              display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
              padding: "8px 8px", borderRadius: 2, transition: "background 0.15s ease",
              background: PROFILE_ITEM.match(location.pathname) ? "rgba(255,107,53,0.06)" : "transparent",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = PROFILE_ITEM.match(location.pathname) ? "rgba(255,107,53,0.06)" : "transparent"; }}
          >
            <Avatar url={profile?.avatar_url} name={displayName} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#F5F3EE", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
              <div style={{ fontSize: 11, color: "#6E6E72", fontWeight: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); signOut(); }}
              title="Uitloggen"
              style={{
                background: "none", border: "none", cursor: "pointer", padding: 4,
                color: "#6E6E72", transition: "color 0.15s ease", flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#FF6B35"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#6E6E72"; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{
        marginLeft: 240, height: "100vh", background: "#0E0E10",
        overflow: "auto",
      }}>
        <Outlet />
      </div>

      <CommandPalette />
    </>
  );
}
