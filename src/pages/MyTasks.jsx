import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import NewTaskModal from "../components/NewTaskModal";
import { useFocusTimer } from "../context/FocusTimerContext";

const BRAND_META = {
  elev8: { label: "ELEV8", color: "#FF6B35" },
  faithdrive: { label: "FaithDrive", color: "#E8B458" },
  tendercards: { label: "Tender Cards", color: "#4CAF7D" },
};

const SOURCE_META = {
  stappenplan: { label: "Stappenplan", icon: "🎯" },
  checklist: { label: "Lanceerchecklist", icon: "✅" },
  custom: { label: "Zelf toegevoegd", icon: "✍" },
};

const PRIORITIES = [
  { key: "urgent", label: "Urgent",   color: "#CC5228", emoji: "🔥", sort: 0 },
  { key: "high",   label: "Hoog",     color: "#FF8A3D", emoji: "⚡", sort: 1 },
  { key: "normal", label: "Normaal",  color: "#F5F3EE", emoji: "•",  sort: 2 },
  { key: "low",    label: "Laag",     color: "#6E6E72", emoji: "↓",  sort: 3 },
];
const PRIO_MAP = Object.fromEntries(PRIORITIES.map((p) => [p.key, p]));

const TEAM_NAMES = ["Lucas", "Raymond", "Shihab"];

function detectTeamName(profile, user) {
  const sources = [
    profile?.display_name, user?.email,
    user?.user_metadata?.full_name, user?.user_metadata?.name,
  ].filter(Boolean).map((s) => s.toLowerCase());
  for (const name of TEAM_NAMES) {
    if (sources.some((s) => s.includes(name.toLowerCase()))) return name;
  }
  return (profile?.display_name || user?.email || "").trim().split(/[\s.@]+/)[0] || "";
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDaysISO(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function nextFridayISO() {
  const d = new Date();
  const day = d.getDay();
  const delta = (5 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  return Math.round((d - now) / 86400000);
}
function formatDue(dateStr) {
  if (!dateStr) return null;
  const d = daysUntil(dateStr);
  if (d < 0) return `${Math.abs(d)}d te laat`;
  if (d === 0) return "Vandaag";
  if (d === 1) return "Morgen";
  if (d <= 7) return `Over ${d}d`;
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}
function dueColor(dateStr, isDone) {
  if (!dateStr || isDone) return "#6E6E72";
  const d = daysUntil(dateStr);
  if (d < 0) return "#CC5228";
  if (d <= 1) return "#FF8A3D";
  if (d <= 7) return "#E8B458";
  return "#6E6E72";
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <div style={{ width: 32, height: 32, border: "2px solid rgba(255,255,255,0.06)", borderTopColor: "#FF6B35", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

function DuePopover({ task, onSet, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener("mousedown", onClick), 0);
    return () => document.removeEventListener("mousedown", onClick);
  }, [onClose]);

  const shortcuts = [
    { label: "Vandaag",     value: todayISO(), icon: "●" },
    { label: "Morgen",      value: addDaysISO(1), icon: "→" },
    { label: "Deze vrijdag", value: nextFridayISO(), icon: "⇒" },
    { label: "Volgende week", value: addDaysISO(7), icon: "»" },
  ];

  return (
    <div ref={ref} style={{
      position: "absolute", top: "100%", right: 0, marginTop: 4, zIndex: 100,
      width: 260, background: "#14161A", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", padding: 8,
      animation: "fadeUp 0.2s cubic-bezier(.22,1,.36,1) both",
    }}>
      <div style={{ fontSize: 9, color: "#6E6E72", padding: "6px 10px 8px", letterSpacing: 1, textTransform: "uppercase", fontWeight: 500 }}>Deadline</div>
      {shortcuts.map((s) => (
        <button
          key={s.label}
          onClick={() => { onSet(s.value); onClose(); }}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "8px 10px", borderRadius: 4, border: "none",
            background: "transparent", color: "#F5F3EE",
            fontSize: 12, fontWeight: 400, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", textAlign: "left",
            transition: "background 0.1s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,107,53,0.08)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <span style={{ color: "#FF6B35", width: 14, textAlign: "center" }}>{s.icon}</span>
          <span style={{ flex: 1 }}>{s.label}</span>
          <span style={{ fontSize: 10, color: "#6E6E72" }}>{new Date(s.value).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</span>
        </button>
      ))}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "6px 0" }} />
      <div style={{ padding: "4px 10px" }}>
        <input
          type="date"
          value={task.due_date || ""}
          onChange={(e) => onSet(e.target.value || null)}
          style={{
            width: "100%", padding: "6px 8px", borderRadius: 4,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
            color: "#F5F3EE", fontSize: 12, fontFamily: "'DM Sans', sans-serif",
            outline: "none", boxSizing: "border-box",
          }}
        />
      </div>
      {task.due_date && (
        <>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "6px 0" }} />
          <button
            onClick={() => { onSet(null); onClose(); }}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "8px 10px", borderRadius: 4, border: "none",
              background: "transparent", color: "#CC5228",
              fontSize: 12, fontWeight: 400, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", textAlign: "left",
            }}
          >
            <span style={{ width: 14, textAlign: "center" }}>×</span>
            <span>Deadline verwijderen</span>
          </button>
        </>
      )}
    </div>
  );
}

function PriorityPopover({ task, onSet, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener("mousedown", onClick), 0);
    return () => document.removeEventListener("mousedown", onClick);
  }, [onClose]);

  return (
    <div ref={ref} style={{
      position: "absolute", top: "100%", right: 0, marginTop: 4, zIndex: 100,
      width: 180, background: "#14161A", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", padding: 6,
      animation: "fadeUp 0.2s cubic-bezier(.22,1,.36,1) both",
    }}>
      {PRIORITIES.map((p) => {
        const active = (task.priority || "normal") === p.key;
        return (
          <button
            key={p.key}
            onClick={() => { onSet(p.key); onClose(); }}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "8px 10px", borderRadius: 4, border: "none",
              background: active ? "rgba(255,107,53,0.06)" : "transparent",
              color: p.color, fontSize: 12, fontWeight: active ? 600 : 400,
              cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "left",
            }}
          >
            <span style={{ width: 14, textAlign: "center" }}>{p.emoji}</span>
            <span style={{ flex: 1 }}>{p.label}</span>
            {active && <span style={{ color: "#FF6B35", fontSize: 10 }}>✓</span>}
          </button>
        );
      })}
    </div>
  );
}

export default function MyTasks() {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");
  const [brandFilter, setBrandFilter] = useState("all");
  const [duePopoverId, setDuePopoverId] = useState(null);
  const [prioPopoverId, setPrioPopoverId] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const channelRef = useRef(null);
  const focus = useFocusTimer();

  const userFirst = useMemo(() => detectTeamName(profile, user), [profile, user]);

  const fetchTasks = async () => {
    if (!userFirst) { setTasks([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from("tasks").select("*")
      .ilike("assigned_to", `%${userFirst}%`)
      .order("status", { ascending: true });
    setTasks(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();

    // postgres_changes — direct listener on table
    const dbChannel = supabase
      .channel("mytasks-db-" + Math.random().toString(36).slice(2))
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => fetchTasks())
      .subscribe();

    // Broadcast fallback
    const broadcastChannels = ["elev8", "faithdrive", "tendercards"].map((b) =>
      supabase.channel("mytasks-bc-" + b).on("broadcast", { event: "tasks_changed" }, () => fetchTasks()).subscribe()
    );

    // Focus / visibility refresh
    const onFocus = () => fetchTasks();
    const onVisibility = () => { if (document.visibilityState === "visible") fetchTasks(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    channelRef.current = [dbChannel, ...broadcastChannels];
    return () => {
      supabase.removeChannel(dbChannel);
      broadcastChannels.forEach((c) => supabase.removeChannel(c));
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line
  }, [userFirst]);

  const toggleTask = async (task) => {
    const newStatus = task.status === "done" ? "open" : "done";
    await supabase.from("tasks").update({
      status: newStatus,
      completed_at: newStatus === "done" ? new Date().toISOString() : null,
      completed_by: newStatus === "done" ? userFirst : null,
    }).eq("id", task.id);
    await fetchTasks();
    supabase.channel("tasks_" + task.brand).send({ type: "broadcast", event: "tasks_changed", payload: {} });
  };

  const updateDue = async (taskId, due_date) => {
    await supabase.from("tasks").update({ due_date }).eq("id", taskId);
    await fetchTasks();
    const t = tasks.find((x) => x.id === taskId);
    if (t) supabase.channel("tasks_" + t.brand).send({ type: "broadcast", event: "tasks_changed", payload: {} });
  };
  const updatePriority = async (taskId, priority) => {
    await supabase.from("tasks").update({ priority }).eq("id", taskId);
    await fetchTasks();
    const t = tasks.find((x) => x.id === taskId);
    if (t) supabase.channel("tasks_" + t.brand).send({ type: "broadcast", event: "tasks_changed", payload: {} });
  };

  const deleteTask = async (task) => {
    if (!confirm(`Taak "${task.title}" verwijderen?`)) return;
    await supabase.from("tasks").delete().eq("id", task.id);
    await fetchTasks();
    supabase.channel("tasks_" + task.brand).send({ type: "broadcast", event: "tasks_changed", payload: {} });
  };

  // Keyboard shortcut: N for new task
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === "n" && !showNewModal) {
        e.preventDefault();
        setShowNewModal(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showNewModal]);

  // Calculate stats including overdue
  const stats = useMemo(() => {
    const open = tasks.filter((t) => t.status === "open");
    const overdue = open.filter((t) => t.due_date && daysUntil(t.due_date) < 0);
    const thisWeek = open.filter((t) => t.due_date && daysUntil(t.due_date) >= 0 && daysUntil(t.due_date) <= 7);
    return {
      total: tasks.length,
      open: open.length,
      done: tasks.filter((t) => t.status === "done").length,
      overdue: overdue.length,
      thisWeek: thisWeek.length,
    };
  }, [tasks]);

  const visible = useMemo(() => {
    let list = tasks.filter((t) => {
      if (filter === "open" && t.status !== "open") return false;
      if (filter === "done" && t.status !== "done") return false;
      if (filter === "overdue") {
        if (t.status !== "open") return false;
        if (!t.due_date || daysUntil(t.due_date) >= 0) return false;
      }
      if (filter === "thisweek") {
        if (t.status !== "open") return false;
        if (!t.due_date) return false;
        const d = daysUntil(t.due_date);
        if (d < 0 || d > 7) return false;
      }
      if (brandFilter !== "all" && t.brand !== brandFilter) return false;
      return true;
    });
    // Sort: overdue first, then by priority, then by due_date, then by created_at
    list.sort((a, b) => {
      if (a.status !== b.status) return a.status === "open" ? -1 : 1;
      const aDays = a.due_date ? daysUntil(a.due_date) : null;
      const bDays = b.due_date ? daysUntil(b.due_date) : null;
      const aOverdue = aDays !== null && aDays < 0;
      const bOverdue = bDays !== null && bDays < 0;
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      const ap = PRIO_MAP[a.priority || "normal"]?.sort ?? 2;
      const bp = PRIO_MAP[b.priority || "normal"]?.sort ?? 2;
      if (ap !== bp) return ap - bp;
      if (aDays !== null && bDays !== null) return aDays - bDays;
      if (aDays !== null) return -1;
      if (bDays !== null) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
    return list;
  }, [tasks, filter, brandFilter]);

  const brandsPresent = [...new Set(tasks.map((t) => t.brand))];

  const chipStyle = (active, accentColor = "#FF6B35") => ({
    padding: "7px 14px", borderRadius: 2,
    border: `1px solid ${active ? accentColor + "55" : "rgba(255,255,255,0.06)"}`,
    background: active ? accentColor + "14" : "transparent",
    color: active ? accentColor : "#6E6E72",
    fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
    letterSpacing: 0.5, textTransform: "uppercase", transition: "all 0.2s",
  });

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE", padding: "32px 24px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, color: "#F5F3EE", letterSpacing: "-0.01em" }}>Mijn taken</div>
              <div style={{ width: 40, height: 1, background: "#FF6B35", margin: "12px 0", opacity: 0.3 }} />
              <div style={{ fontSize: 13, color: "#6E6E72", fontWeight: 300 }}>
                {userFirst ? (
                  <>Automatisch toegewezen aan <span style={{ color: "#FF6B35", fontWeight: 500 }}>{userFirst}</span> op basis van skills.</>
                ) : (
                  <>Kan je naam niet bepalen — check je profiel.</>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              style={{
                padding: "10px 18px", borderRadius: 2, border: "none",
                background: "#FF6B35", color: "#0E0E10",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit", letterSpacing: 0.5,
                display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0,
                transition: "filter 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = "brightness(1)"; }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
              <span>Nieuwe taak</span>
              <kbd style={{ fontSize: 9, color: "rgba(14,14,16,0.6)", background: "rgba(14,14,16,0.1)", padding: "1px 5px", borderRadius: 2, fontFamily: "inherit", letterSpacing: 0.3, marginLeft: 4 }}>N</kbd>
            </button>
          </div>
        </div>

        {/* Stats including overdue */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 24, animation: "fadeUp 0.6s 0.1s cubic-bezier(.22,1,.36,1) both" }}>
          {[
            { label: "Open", value: stats.open, color: "#FF6B35" },
            { label: "Te laat", value: stats.overdue, color: stats.overdue > 0 ? "#CC5228" : "#6E6E72" },
            { label: "Deze week", value: stats.thisWeek, color: "#E8B458" },
            { label: "Afgerond", value: stats.done, color: "#4CAF7D" },
          ].map((s) => (
            <div key={s.label} style={{ padding: "14px 16px", borderRadius: 2, background: "rgba(255,255,255,0.02)", border: `1px solid ${s.label === "Te laat" && stats.overdue > 0 ? "rgba(204,82,40,0.25)" : "rgba(255,255,255,0.04)"}` }}>
              <div style={{ fontSize: 10, color: "#6E6E72", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20, animation: "fadeUp 0.6s 0.12s cubic-bezier(.22,1,.36,1) both" }}>
          <button onClick={() => setFilter("open")} style={chipStyle(filter === "open")}>Open ({stats.open})</button>
          {stats.overdue > 0 && (
            <button onClick={() => setFilter("overdue")} style={chipStyle(filter === "overdue", "#CC5228")}>🔥 Te laat ({stats.overdue})</button>
          )}
          <button onClick={() => setFilter("thisweek")} style={chipStyle(filter === "thisweek", "#E8B458")}>Deze week ({stats.thisWeek})</button>
          <button onClick={() => setFilter("done")} style={chipStyle(filter === "done", "#4CAF7D")}>Afgerond ({stats.done})</button>
          <button onClick={() => setFilter("all")} style={chipStyle(filter === "all")}>Alles</button>
          <div style={{ width: 1, background: "rgba(255,255,255,0.06)", margin: "0 6px" }} />
          <button onClick={() => setBrandFilter("all")} style={chipStyle(brandFilter === "all")}>Alle merken</button>
          {brandsPresent.map((b) => (
            <button key={b} onClick={() => setBrandFilter(b)} style={chipStyle(brandFilter === b, BRAND_META[b]?.color || "#FF6B35")}>{BRAND_META[b]?.label || b}</button>
          ))}
        </div>

        {loading && <Spinner />}

        {!loading && visible.length === 0 && (
          <div style={{ padding: "48px 20px", borderRadius: 2, border: "1px solid rgba(255,255,255,0.04)", textAlign: "center", animation: "fadeUp 0.6s 0.15s cubic-bezier(.22,1,.36,1) both" }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>{filter === "overdue" ? "🎯" : filter === "done" ? "✨" : "🎉"}</div>
            <div style={{ fontSize: 15, color: "#6E6E72", fontWeight: 400 }}>
              {tasks.length === 0 ? "Nog geen taken toegewezen" : "Niks in deze view"}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.15)", marginTop: 4, fontWeight: 300 }}>
              {tasks.length === 0 ? "Open een merk-dashboard om taken te laten scannen." : "Probeer een ander filter."}
            </div>
          </div>
        )}

        <NewTaskModal
          open={showNewModal}
          onClose={() => setShowNewModal(false)}
          defaultAssignee={userFirst || "Lucas"}
          onCreated={fetchTasks}
        />

        {!loading && visible.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, animation: "fadeUp 0.6s 0.15s cubic-bezier(.22,1,.36,1) both" }}>
            {visible.map((t) => {
              const brand = BRAND_META[t.brand] || { label: t.brand, color: "#6E6E72" };
              const source = SOURCE_META[t.source] || { label: t.source, icon: "•" };
              const prio = PRIO_MAP[t.priority || "normal"];
              const isDone = t.status === "done";
              const isShared = (t.assigned_to || "").includes("+");
              const dueDays = t.due_date ? daysUntil(t.due_date) : null;
              const isOverdue = !isDone && dueDays !== null && dueDays < 0;
              const dueClr = dueColor(t.due_date, isDone);

              return (
                <div key={t.id} style={{
                  display: "flex", gap: 14, padding: "14px 16px", borderRadius: 2,
                  background: isOverdue ? "rgba(204,82,40,0.04)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isOverdue ? "rgba(204,82,40,0.2)" : "rgba(255,255,255,0.04)"}`,
                  borderLeft: prio.key !== "normal" ? `3px solid ${prio.color}` : `1px solid rgba(255,255,255,0.04)`,
                  opacity: isDone ? 0.5 : 1, transition: "opacity 0.2s",
                  position: "relative",
                }}>
                  <button
                    onClick={() => toggleTask(t)}
                    style={{
                      width: 22, height: 22, borderRadius: 3,
                      border: `1.5px solid ${isDone ? "#4CAF7D" : (isOverdue ? "#CC5228" : "rgba(255,107,53,0.4)")}`,
                      background: isDone ? "#4CAF7D" : "transparent",
                      cursor: "pointer", flexShrink: 0, marginTop: 2,
                      display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                    }}
                    title={isDone ? "Markeer als open" : "Markeer als afgerond"}
                  >
                    {isDone && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <polyline points="2,6 5,9 10,3" stroke="#0E0E10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: brand.color, fontWeight: 700 }}>{brand.label}</span>
                      <span style={{ fontSize: 9, color: "#6E6E72" }}>·</span>
                      <span style={{ fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: "#6E6E72", fontWeight: 500 }}>
                        {source.icon} {source.label}
                      </span>
                      {isShared && (
                        <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 999, background: "rgba(255,107,53,0.08)", color: "#FF6B35", letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 600 }}>gedeeld</span>
                      )}
                      {t.source === "custom" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteTask(t); }}
                          title="Verwijder taak"
                          style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.18)", cursor: "pointer", fontSize: 12, padding: 2, transition: "color 0.15s" }}
                          onMouseEnter={(e) => e.currentTarget.style.color = "#CC5228"}
                          onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.18)"}
                        >
                          🗑
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#F5F3EE", marginBottom: t.description ? 3 : 0, textDecoration: isDone ? "line-through" : "none" }}>
                      {t.title}
                    </div>
                    {t.description && (
                      <div style={{ fontSize: 12, color: "#6E6E72", fontWeight: 300, lineHeight: 1.4 }}>{t.description}</div>
                    )}

                    {/* Action chips row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      {/* Focus timer play */}
                      {!isDone && (
                        (() => {
                          const isActive = focus.active && focus.state?.taskId === t.id;
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isActive) {
                                  if (focus.isPaused) focus.resume();
                                  else focus.pause();
                                } else {
                                  focus.start({ id: t.id, title: t.title, brand: t.brand });
                                }
                              }}
                              title={isActive ? (focus.isPaused ? "Hervatten" : "Pauzeren") : "Start focus timer"}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                padding: "3px 8px", borderRadius: 999,
                                border: `1px solid ${isActive ? (focus.isPaused ? "#6E6E7255" : "#4CAF7D55") : "rgba(76,175,125,0.22)"}`,
                                background: isActive ? (focus.isPaused ? "rgba(110,110,114,0.12)" : "rgba(76,175,125,0.14)") : "transparent",
                                color: isActive && !focus.isPaused ? "#4CAF7D" : (isActive ? "#6E6E72" : "#4CAF7D"),
                                fontSize: 10, fontWeight: 600, cursor: "pointer",
                                fontFamily: "inherit", letterSpacing: 0.3,
                              }}
                            >
                              {isActive ? (focus.isPaused ? "⏸ Pauze" : "● Focus") : "▶ Focus"}
                            </button>
                          );
                        })()
                      )}

                      {/* Priority */}
                      <div style={{ position: "relative" }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setPrioPopoverId(prioPopoverId === t.id ? null : t.id); setDuePopoverId(null); }}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "3px 8px", borderRadius: 999,
                            border: `1px solid ${prio.key !== "normal" ? prio.color + "55" : "rgba(255,255,255,0.06)"}`,
                            background: prio.key !== "normal" ? prio.color + "14" : "transparent",
                            color: prio.color, fontSize: 10, fontWeight: 600, cursor: "pointer",
                            fontFamily: "inherit", letterSpacing: 0.3, textTransform: "uppercase",
                          }}
                        >
                          <span>{prio.emoji}</span> {prio.label}
                        </button>
                        {prioPopoverId === t.id && (
                          <PriorityPopover task={t} onSet={(v) => updatePriority(t.id, v)} onClose={() => setPrioPopoverId(null)} />
                        )}
                      </div>

                      {/* Due date */}
                      <div style={{ position: "relative" }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDuePopoverId(duePopoverId === t.id ? null : t.id); setPrioPopoverId(null); }}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "3px 8px", borderRadius: 999,
                            border: `1px solid ${t.due_date ? dueClr + "55" : "rgba(255,255,255,0.06)"}`,
                            background: t.due_date ? dueClr + "14" : "transparent",
                            color: t.due_date ? dueClr : "#6E6E72",
                            fontSize: 10, fontWeight: 600, cursor: "pointer",
                            fontFamily: "inherit", letterSpacing: 0.3,
                          }}
                        >
                          {isOverdue ? "🔥" : t.due_date ? "📅" : "＋"} {t.due_date ? formatDue(t.due_date) : "Deadline"}
                        </button>
                        {duePopoverId === t.id && (
                          <DuePopover task={t} onSet={(v) => updateDue(t.id, v)} onClose={() => setDuePopoverId(null)} />
                        )}
                      </div>

                      {t.assigned_reason && !isDone && (
                        <span style={{ fontSize: 10, color: "rgba(255,107,53,0.55)", fontStyle: "italic", marginLeft: 4 }}>
                          Match: {t.assigned_reason}
                        </span>
                      )}
                    </div>

                    {isDone && t.completed_at && (
                      <div style={{ fontSize: 10, color: "#4CAF7D", marginTop: 6 }}>
                        ✓ Afgerond {new Date(t.completed_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                        {t.completed_by ? ` door ${t.completed_by}` : ""}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
