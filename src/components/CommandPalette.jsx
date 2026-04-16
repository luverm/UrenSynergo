import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const QUICK_ACTIONS = [
  { id: "a-home", label: "Uren", hint: "Ga naar Uren / Dashboard", icon: "⏱", path: "/" },
  { id: "a-holding", label: "Holding overview", hint: "Alle merken in één beeld", icon: "🏛", path: "/holding" },
  { id: "a-tasks", label: "Mijn taken", hint: "Toegewezen taken + deadlines", icon: "✓", path: "/mijn-taken" },
  { id: "a-calendar", label: "Kalender", hint: "Alle deadlines op een kalender", icon: "📅", path: "/kalender" },
  { id: "a-week", label: "Week digest", hint: "Samenvatting van deze week", icon: "📊", path: "/week" },
  { id: "a-chat", label: "Chat", hint: "Open team chat", icon: "💬", path: "/chat" },
  { id: "a-groups", label: "Projecten", hint: "Bekijk alle projecten", icon: "📁", path: "/groups" },
  { id: "a-sales", label: "Sales dashboards", hint: "ELEV8 · FaithDrive · Tender Cards", icon: "📈", path: "/sales" },
  { id: "a-profile", label: "Profiel", hint: "Je account instellingen", icon: "👤", path: "/profile" },
];

const BRAND_META = {
  elev8: { label: "ELEV8", color: "#FF6B35" },
  faithdrive: { label: "FaithDrive", color: "#E8B458" },
  tendercards: { label: "Tender Cards", color: "#4CAF7D" },
};

function scoreMatch(q, text) {
  if (!q) return 1;
  if (!text) return 0;
  const lq = q.toLowerCase();
  const lt = text.toLowerCase();
  if (lt === lq) return 1000;
  if (lt.startsWith(lq)) return 500;
  if (lt.includes(lq)) return 200;
  // naive fuzzy: all chars appear in order
  let i = 0;
  for (const c of lt) { if (c === lq[i]) i++; if (i === lq.length) return 50; }
  return 0;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [items, setItems] = useState({ tasks: [], requests: [], ideas: [], groups: [] });
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  // Trigger: Cmd/Ctrl+K from anywhere
  useEffect(() => {
    const onKey = (e) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Auto-focus input when opening
  useEffect(() => {
    if (open) {
      setQ("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Load data once when opening (and refresh cached)
  const loadData = useCallback(async () => {
    const [tasksRes, requestsRes, ideasRes, groupsRes] = await Promise.all([
      supabase.from("tasks").select("id, title, brand, source, assigned_to, status").limit(200),
      supabase.from("requests").select("id, subject, from_name, from_email, brand, stage, status").order("received_at", { ascending: false }).limit(100),
      supabase.from("ideas").select("id, text, brand, category, author").order("created_at", { ascending: false }).limit(100),
      supabase.from("groups").select("id, name, description").limit(50),
    ]);
    setItems({
      tasks: tasksRes.data || [],
      requests: requestsRes.data || [],
      ideas: ideasRes.data || [],
      groups: groupsRes.data || [],
    });
  }, []);

  useEffect(() => {
    if (open) loadData();
  }, [open, loadData]);

  // Build search results
  const results = useMemo(() => {
    const groups = [];

    // Quick actions (always visible when empty, filtered when typing)
    const actionMatches = QUICK_ACTIONS
      .map((a) => ({ ...a, score: scoreMatch(q, a.label) + scoreMatch(q, a.hint) * 0.3 }))
      .filter((a) => a.score > 0)
      .sort((a, b) => b.score - a.score);
    if (actionMatches.length) groups.push({ title: "Acties", type: "action", items: actionMatches.slice(0, 6) });

    if (q) {
      // Tasks
      const taskMatches = items.tasks
        .map((t) => ({
          id: t.id,
          label: t.title,
          hint: `${BRAND_META[t.brand]?.label || t.brand} · ${t.assigned_to || 'Gezamenlijk'} · ${t.status}`,
          icon: t.status === "done" ? "✓" : "•",
          color: BRAND_META[t.brand]?.color,
          score: scoreMatch(q, t.title),
          onSelect: () => navigate("/mijn-taken"),
        }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      if (taskMatches.length) groups.push({ title: "Taken", type: "task", items: taskMatches });

      // Requests
      const reqMatches = items.requests
        .map((r) => ({
          id: r.id,
          label: r.subject || "(geen onderwerp)",
          hint: `${r.from_name || r.from_email || 'Onbekend'} · ${BRAND_META[r.brand]?.label || r.brand} · ${r.stage || 'lead'}`,
          icon: "📬",
          color: BRAND_META[r.brand]?.color,
          score: Math.max(scoreMatch(q, r.subject), scoreMatch(q, r.from_name), scoreMatch(q, r.from_email)),
          onSelect: () => navigate("/sales"),
        }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      if (reqMatches.length) groups.push({ title: "Aanvragen", type: "request", items: reqMatches });

      // Ideas
      const ideaMatches = items.ideas
        .map((i) => ({
          id: i.id,
          label: (i.text || "").slice(0, 80),
          hint: `${BRAND_META[i.brand]?.label || i.brand} · ${i.category || 'overig'} · ${i.author || 'Anoniem'}`,
          icon: "💡",
          color: BRAND_META[i.brand]?.color,
          score: scoreMatch(q, i.text),
          onSelect: () => navigate("/sales"),
        }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      if (ideaMatches.length) groups.push({ title: "Ideeën", type: "idea", items: ideaMatches });

      // Projects
      const groupMatches = items.groups
        .map((g) => ({
          id: g.id,
          label: g.name,
          hint: g.description || "Project",
          icon: "📁",
          color: "#FF6B35",
          score: Math.max(scoreMatch(q, g.name), scoreMatch(q, g.description) * 0.5),
          onSelect: () => navigate(`/groups/${g.id}`),
        }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      if (groupMatches.length) groups.push({ title: "Projecten", type: "group", items: groupMatches });
    }

    return groups;
  }, [q, items, navigate]);

  const flat = useMemo(() => results.flatMap((g) => g.items), [results]);

  // Keep activeIdx in bounds
  useEffect(() => {
    if (activeIdx >= flat.length) setActiveIdx(Math.max(0, flat.length - 1));
  }, [flat.length, activeIdx]);

  // Scroll active into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const handleSelect = useCallback((item) => {
    if (!item) return;
    if (item.path) navigate(item.path);
    else if (item.onSelect) item.onSelect();
    setOpen(false);
  }, [navigate]);

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(flat[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  if (!open) return null;

  let runningIdx = -1;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
        zIndex: 10000, display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "10vh 20px 20px", animation: "cmdk-fade 0.18s ease-out",
      }}
    >
      <style>{`
        @keyframes cmdk-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cmdk-slide { from { transform: translateY(-12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .cmdk-item:hover { background: rgba(255,107,53,0.06) !important; }
      `}</style>
      <div style={{
        width: "100%", maxWidth: 640, background: "#14161A", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", overflow: "hidden",
        animation: "cmdk-slide 0.25s cubic-bezier(.22,1,.36,1) both",
        fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE",
        display: "flex", flexDirection: "column", maxHeight: "70vh",
      }}>
        {/* Input */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6E6E72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActiveIdx(0); }}
            onKeyDown={onKeyDown}
            placeholder="Zoek taken, aanvragen, ideeën, projecten… of typ een actie"
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "#F5F3EE", fontSize: 15, fontFamily: "inherit", fontWeight: 400,
            }}
          />
          <kbd style={{ fontSize: 10, color: "#6E6E72", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "3px 6px", borderRadius: 3, fontFamily: "inherit", letterSpacing: 0.5 }}>ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ overflowY: "auto", padding: "6px 0", flex: 1 }}>
          {results.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#6E6E72" }}>
              <div style={{ fontSize: 32, opacity: 0.3, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 14 }}>Geen resultaten voor "{q}"</div>
            </div>
          )}
          {results.map((group) => (
            <div key={group.title} style={{ marginTop: 4 }}>
              <div style={{ padding: "8px 18px 4px", fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: "#6E6E72", fontWeight: 600 }}>
                {group.title}
              </div>
              {group.items.map((item) => {
                runningIdx++;
                const isActive = runningIdx === activeIdx;
                const thisIdx = runningIdx;
                return (
                  <div
                    key={item.id}
                    data-idx={thisIdx}
                    className="cmdk-item"
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setActiveIdx(thisIdx)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 18px",
                      cursor: "pointer",
                      background: isActive ? "rgba(255,107,53,0.08)" : "transparent",
                      borderLeft: `2px solid ${isActive ? "#FF6B35" : "transparent"}`,
                      transition: "background 0.08s",
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: isActive ? "rgba(255,107,53,0.15)" : "rgba(255,255,255,0.04)",
                      color: item.color || (isActive ? "#FF6B35" : "#6E6E72"),
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, flexShrink: 0,
                    }}>
                      {item.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#F5F3EE", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.label}
                      </div>
                      {item.hint && (
                        <div style={{ fontSize: 11, color: "#6E6E72", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.hint}
                        </div>
                      )}
                    </div>
                    {isActive && (
                      <div style={{ fontSize: 10, color: "#6E6E72", display: "flex", alignItems: "center", gap: 4 }}>
                        <kbd style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "2px 5px", borderRadius: 3, fontSize: 10 }}>↵</kbd>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 18px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 10, color: "#6E6E72" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <kbd style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 3, fontSize: 10 }}>↑↓</kbd> navigeer
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <kbd style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 3, fontSize: 10 }}>↵</kbd> open
          </span>
          <span style={{ marginLeft: "auto" }}>
            <kbd style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 3, fontSize: 10 }}>⌘K</kbd> sluiten
          </span>
        </div>
      </div>
    </div>
  );
}
