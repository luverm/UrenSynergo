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

const PRIORITIES = {
  urgent: { color: "#CC5228", emoji: "🔥" },
  high:   { color: "#FF8A3D", emoji: "⚡" },
  normal: { color: "#F5F3EE", emoji: "" },
  low:    { color: "#6E6E72", emoji: "↓" },
};

const TEAM_NAMES = ["Lucas", "Raymond", "Shihab"];
const WEEKDAYS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

function detectTeamName(profile, user) {
  const sources = [
    profile?.display_name, user?.email,
    user?.user_metadata?.full_name, user?.user_metadata?.name,
  ].filter(Boolean).map((s) => s.toLowerCase());
  for (const name of TEAM_NAMES) {
    if (sources.some((s) => s.includes(name.toLowerCase()))) return name;
  }
  return "";
}

function isoForDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday as start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const firstWeekStart = startOfWeek(first);
  const weeks = [];
  const cursor = new Date(firstWeekStart);
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    // Stop early if we've passed end of month and filled at least 1 week after
    if (week[6].getMonth() !== month && w >= 4) break;
  }
  return weeks;
}

function buildWeek(date) {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export default function Calendar() {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [view, setView] = useState("month"); // month | week
  const [scopeFilter, setScopeFilter] = useState("mine"); // mine | all
  const [brandFilter, setBrandFilter] = useState("all");
  const [activeTask, setActiveTask] = useState(null);
  const [newTaskDate, setNewTaskDate] = useState(null);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const channelsRef = useRef([]);
  const focus = useFocusTimer();

  const rescheduleTask = async (taskId, newIso) => {
    const t = tasks.find((x) => x.id === taskId);
    if (!t || t.due_date === newIso) return;
    // Optimistic update
    setTasks((prev) => prev.map((x) => x.id === taskId ? { ...x, due_date: newIso } : x));
    await supabase.from("tasks").update({ due_date: newIso }).eq("id", taskId);
    supabase.channel("tasks_" + t.brand).send({ type: "broadcast", event: "tasks_changed", payload: {} });
  };

  const userFirst = useMemo(() => detectTeamName(profile, user), [profile, user]);

  const load = async () => {
    const { data } = await supabase.from("tasks").select("*").not("due_date", "is", null);
    setTasks(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channels = ["elev8", "faithdrive", "tendercards"].map((b) =>
      supabase.channel("tasks_" + b).on("broadcast", { event: "tasks_changed" }, load).subscribe()
    );
    channelsRef.current = channels;
    return () => { channels.forEach((c) => supabase.removeChannel(c)); };
  }, []);

  // Filter tasks
  const filteredTasks = useMemo(() => tasks.filter((t) => {
    if (scopeFilter === "mine" && userFirst && !(t.assigned_to || "").includes(userFirst)) return false;
    if (brandFilter !== "all" && t.brand !== brandFilter) return false;
    return true;
  }), [tasks, scopeFilter, userFirst, brandFilter]);

  // Group by date
  const tasksByDate = useMemo(() => {
    const map = {};
    filteredTasks.forEach((t) => {
      if (!t.due_date) return;
      if (!map[t.due_date]) map[t.due_date] = [];
      map[t.due_date].push(t);
    });
    // Sort by priority per date
    const prioOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => (prioOrder[a.priority || "normal"] - prioOrder[b.priority || "normal"]));
    });
    return map;
  }, [filteredTasks]);

  const overdueTasks = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayISO = isoForDate(today);
    return filteredTasks.filter((t) => t.due_date && t.due_date < todayISO && t.status === "open")
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
  }, [filteredTasks]);

  const grid = useMemo(() => {
    if (view === "month") return buildMonthGrid(cursor.getFullYear(), cursor.getMonth());
    return [buildWeek(cursor)];
  }, [cursor, view]);

  const todayISO = isoForDate(new Date());
  const currentMonth = cursor.getMonth();

  const navigatePrev = () => {
    const d = new Date(cursor);
    if (view === "month") d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    setCursor(d);
  };
  const navigateNext = () => {
    const d = new Date(cursor);
    if (view === "month") d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    setCursor(d);
  };
  const navigateToday = () => {
    const d = new Date();
    if (view === "month") d.setDate(1);
    setCursor(d);
  };

  const headerLabel = view === "month"
    ? `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
    : (() => {
        const w = buildWeek(cursor);
        const start = w[0], end = w[6];
        if (start.getMonth() === end.getMonth()) return `${start.getDate()}–${end.getDate()} ${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
        return `${start.getDate()} ${MONTHS[start.getMonth()]} – ${end.getDate()} ${MONTHS[end.getMonth()]} ${start.getFullYear()}`;
      })();

  const chip = (active, color = "#FF6B35") => ({
    padding: "7px 14px", borderRadius: 2,
    border: `1px solid ${active ? color + "55" : "rgba(255,255,255,0.06)"}`,
    background: active ? color + "14" : "transparent",
    color: active ? color : "#6E6E72",
    fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
    letterSpacing: 0.5, textTransform: "uppercase", transition: "all 0.2s",
  });

  const updateStatus = async (t) => {
    const newStatus = t.status === "done" ? "open" : "done";
    await supabase.from("tasks").update({
      status: newStatus,
      completed_at: newStatus === "done" ? new Date().toISOString() : null,
      completed_by: newStatus === "done" ? userFirst : null,
    }).eq("id", t.id);
    await load();
    supabase.channel("tasks_" + t.brand).send({ type: "broadcast", event: "tasks_changed", payload: {} });
    if (activeTask?.id === t.id) setActiveTask({ ...t, status: newStatus });
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE", padding: "32px 24px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes cmdk-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cmdk-slide { from { transform: translateY(-12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .cal-day { cursor: pointer; }
        .cal-day:hover .cal-day-num { color: #FF6B35 !important; }
        .cal-day:hover .cal-add { opacity: 1 !important; }
        .cal-task-pill:hover { filter: brightness(1.15); transform: translateX(1px); }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both", marginBottom: 8, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, color: "#F5F3EE", letterSpacing: "-0.01em" }}>Kalender</div>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6E6E72", fontWeight: 300 }}>Alle deadlines in één beeld.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={navigatePrev} style={navBtn}>‹</button>
            <button onClick={navigateToday} style={{ ...navBtn, padding: "6px 14px", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 500 }}>Vandaag</button>
            <button onClick={navigateNext} style={navBtn}>›</button>
            <div style={{ minWidth: 200, textAlign: "center", fontSize: 15, fontWeight: 600, color: "#F5F3EE", padding: "0 12px", fontFamily: "'Syne', sans-serif", letterSpacing: "-0.01em" }}>{headerLabel}</div>
            <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", borderRadius: 2, padding: 2, border: "1px solid rgba(255,255,255,0.06)" }}>
              <button onClick={() => setView("month")} style={{ ...toggleBtn, background: view === "month" ? "rgba(255,107,53,0.14)" : "transparent", color: view === "month" ? "#FF6B35" : "#6E6E72" }}>Maand</button>
              <button onClick={() => setView("week")} style={{ ...toggleBtn, background: view === "week" ? "rgba(255,107,53,0.14)" : "transparent", color: view === "week" ? "#FF6B35" : "#6E6E72" }}>Week</button>
            </div>
          </div>
        </div>
        <div style={{ width: 40, height: 1, background: "#FF6B35", margin: "12px 0 24px", opacity: 0.3 }} />

        {/* Filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20, animation: "fadeUp 0.6s 0.1s cubic-bezier(.22,1,.36,1) both" }}>
          <button onClick={() => setScopeFilter("mine")} style={chip(scopeFilter === "mine")}>{userFirst ? `Mijn (${userFirst})` : "Mijn taken"}</button>
          <button onClick={() => setScopeFilter("all")} style={chip(scopeFilter === "all")}>Heel team</button>
          <div style={{ width: 1, background: "rgba(255,255,255,0.06)", margin: "0 6px" }} />
          <button onClick={() => setBrandFilter("all")} style={chip(brandFilter === "all")}>Alle merken</button>
          {Object.keys(BRAND_META).map((b) => (
            <button key={b} onClick={() => setBrandFilter(b)} style={chip(brandFilter === b, BRAND_META[b].color)}>{BRAND_META[b].label}</button>
          ))}
        </div>

        {/* Overdue alert */}
        {overdueTasks.length > 0 && (
          <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 4, background: "rgba(204,82,40,0.06)", border: "1px solid rgba(204,82,40,0.2)", animation: "fadeUp 0.6s 0.12s cubic-bezier(.22,1,.36,1) both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 14 }}>🔥</span>
              <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "#CC5228", fontWeight: 700 }}>Over deadline — {overdueTasks.length}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {overdueTasks.map((t) => {
                const brand = BRAND_META[t.brand];
                const prio = PRIORITIES[t.priority || "normal"];
                return (
                  <button key={t.id} onClick={() => setActiveTask(t)} className="cal-task-pill" style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "5px 10px", borderRadius: 3,
                    background: "rgba(204,82,40,0.08)", border: `1px solid ${brand?.color || "#CC5228"}33`,
                    color: "#F5F3EE", fontSize: 11, cursor: "pointer",
                    fontFamily: "inherit", fontWeight: 500, transition: "all 0.15s",
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: 99, background: brand?.color }} />
                    {prio.emoji && <span>{prio.emoji}</span>}
                    <span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                    <span style={{ color: "#CC5228", fontSize: 10, fontWeight: 700 }}>{t.due_date.slice(8, 10)}/{t.due_date.slice(5, 7)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Grid */}
        <div style={{ animation: "fadeUp 0.6s 0.15s cubic-bezier(.22,1,.36,1) both" }}>
          {/* Weekday headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
            {WEEKDAYS.map((d) => (
              <div key={d} style={{ fontSize: 10, color: "#6E6E72", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600, textAlign: "center", padding: "6px 0" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {grid.map((week, wi) => (
            <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
              {week.map((day) => {
                const iso = isoForDate(day);
                const inCurrentMonth = view === "week" || day.getMonth() === currentMonth;
                const isToday = iso === todayISO;
                const dayTasks = tasksByDate[iso] || [];
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                return (
                  <div
                    key={iso}
                    className="cal-day"
                    onClick={() => setNewTaskDate(iso)}
                    onDragOver={(e) => { if (draggedTaskId) { e.preventDefault(); setDragOverDate(iso); } }}
                    onDragLeave={() => setDragOverDate(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedTaskId) {
                        rescheduleTask(draggedTaskId, iso);
                        setDraggedTaskId(null);
                        setDragOverDate(null);
                      }
                    }}
                    style={{
                      minHeight: view === "month" ? 100 : 180,
                      padding: "8px 8px 6px",
                      borderRadius: 3,
                      background: dragOverDate === iso
                        ? "rgba(255,107,53,0.14)"
                        : (isToday ? "rgba(255,107,53,0.05)" : (inCurrentMonth ? "rgba(255,255,255,0.015)" : "rgba(255,255,255,0.005)")),
                      border: `1px solid ${dragOverDate === iso ? "#FF6B35" : (isToday ? "rgba(255,107,53,0.25)" : "rgba(255,255,255,0.04)")}`,
                      opacity: inCurrentMonth ? 1 : 0.4,
                      display: "flex", flexDirection: "column", gap: 4, overflow: "hidden",
                      position: "relative",
                      transition: "background 0.15s, border-color 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                      <span
                        className="cal-day-num"
                        style={{
                          fontSize: 12, fontWeight: isToday ? 700 : 500,
                          color: isToday ? "#FF6B35" : (isWeekend ? "#6E6E72" : "#F5F3EE"),
                          transition: "color 0.15s",
                          fontFamily: "'Syne', sans-serif",
                        }}
                      >
                        {day.getDate()}
                      </span>
                      {dayTasks.length > 3 ? (
                        <span style={{ fontSize: 9, color: "#6E6E72", fontWeight: 500 }}>+{dayTasks.length - 3}</span>
                      ) : (
                        <span className="cal-add" style={{ opacity: 0, fontSize: 12, color: "#FF6B35", fontWeight: 700, transition: "opacity 0.15s", lineHeight: 1 }}>+</span>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, overflow: "hidden" }}>
                      {dayTasks.slice(0, view === "month" ? 3 : 10).map((t) => {
                        const brand = BRAND_META[t.brand] || { color: "#6E6E72" };
                        const prio = PRIORITIES[t.priority || "normal"];
                        const isDone = t.status === "done";
                        return (
                          <button
                            key={t.id}
                            onClick={(e) => { e.stopPropagation(); setActiveTask(t); }}
                            draggable={!isDone}
                            onDragStart={(e) => { e.stopPropagation(); setDraggedTaskId(t.id); e.dataTransfer.effectAllowed = "move"; }}
                            onDragEnd={() => { setDraggedTaskId(null); setDragOverDate(null); }}
                            className="cal-task-pill"
                            style={{
                              display: "flex", alignItems: "center", gap: 4,
                              padding: "3px 6px", borderRadius: 2,
                              background: brand.color + (isDone ? "08" : "1A"),
                              borderLeft: `2px solid ${prio.color === "#F5F3EE" ? brand.color : prio.color}`,
                              color: isDone ? "#6E6E72" : "#F5F3EE",
                              fontSize: 10, fontWeight: 500, cursor: isDone ? "pointer" : "grab",
                              fontFamily: "inherit", textAlign: "left",
                              textDecoration: isDone ? "line-through" : "none",
                              overflow: "hidden", whiteSpace: "nowrap",
                              transition: "all 0.15s", width: "100%", border: "none",
                              minWidth: 0,
                              opacity: draggedTaskId === t.id ? 0.4 : 1,
                            }}
                            title={isDone ? t.title : `${t.title}\n(sleep naar een andere dag om te verplaatsen)`}
                          >
                            {prio.emoji && <span style={{ fontSize: 8, flexShrink: 0 }}>{prio.emoji}</span>}
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginTop: 20, flexWrap: "wrap", fontSize: 11, color: "#6E6E72" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(255,107,53,0.1)", border: "1px solid rgba(255,107,53,0.25)" }} /> Vandaag
          </div>
          {Object.entries(BRAND_META).map(([k, b]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: b.color + "33", borderLeft: `2px solid ${b.color}` }} /> {b.label}
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "#CC522822", borderLeft: "2px solid #CC5228" }} /> 🔥 Urgent
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "#FF8A3D22", borderLeft: "2px solid #FF8A3D" }} /> ⚡ Hoog
          </div>
        </div>

        {loading && <div style={{ textAlign: "center", padding: 40, color: "#6E6E72", fontSize: 13 }}>Laden…</div>}
        {!loading && filteredTasks.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#6E6E72", fontSize: 13, marginTop: 20 }}>
            <div style={{ fontSize: 32, opacity: 0.3, marginBottom: 8 }}>📅</div>
            Geen taken met deadline in deze view.
          </div>
        )}
      </div>

      <NewTaskModal
        open={!!newTaskDate}
        onClose={() => setNewTaskDate(null)}
        defaultDate={newTaskDate}
        defaultAssignee={userFirst || "Lucas"}
        onCreated={load}
      />

      {/* Task detail modal */}
      {activeTask && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setActiveTask(null); }}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
            zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
        >
          <div style={{
            background: "#14161A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
            maxWidth: 520, width: "100%", padding: "24px 28px", position: "relative",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}>
            <button onClick={() => setActiveTask(null)} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", color: "#6E6E72", cursor: "pointer", fontSize: 16, padding: 6 }}>✕</button>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: BRAND_META[activeTask.brand]?.color, fontWeight: 700 }}>{BRAND_META[activeTask.brand]?.label}</span>
              <span style={{ fontSize: 10, color: "#6E6E72" }}>·</span>
              <span style={{ fontSize: 10, color: "#6E6E72", letterSpacing: 1, textTransform: "uppercase" }}>{activeTask.source}</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#F5F3EE", marginBottom: 8, textDecoration: activeTask.status === "done" ? "line-through" : "none" }}>{activeTask.title}</div>
            {activeTask.description && <div style={{ fontSize: 13, color: "#6E6E72", lineHeight: 1.5, marginBottom: 16 }}>{activeTask.description}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
              <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 4 }}>
                <div style={{ fontSize: 9, color: "#6E6E72", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>Toegewezen aan</div>
                <div style={{ fontSize: 13, color: "#F5F3EE", fontWeight: 500 }}>{activeTask.assigned_to || "Gezamenlijk"}</div>
              </div>
              <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 4 }}>
                <div style={{ fontSize: 9, color: "#6E6E72", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>Deadline</div>
                <div style={{ fontSize: 13, color: "#F5F3EE", fontWeight: 500 }}>{new Date(activeTask.due_date + "T00:00:00").toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}</div>
              </div>
              <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 4 }}>
                <div style={{ fontSize: 9, color: "#6E6E72", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>Prioriteit</div>
                <div style={{ fontSize: 13, color: PRIORITIES[activeTask.priority || "normal"].color, fontWeight: 500 }}>
                  {PRIORITIES[activeTask.priority || "normal"].emoji} {(activeTask.priority || "normal").charAt(0).toUpperCase() + (activeTask.priority || "normal").slice(1)}
                </div>
              </div>
              <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 4 }}>
                <div style={{ fontSize: 9, color: "#6E6E72", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>Status</div>
                <div style={{ fontSize: 13, color: activeTask.status === "done" ? "#4CAF7D" : "#FF6B35", fontWeight: 500 }}>
                  {activeTask.status === "done" ? "✓ Afgerond" : "● Open"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {activeTask.status !== "done" && (
                <button
                  onClick={() => {
                    focus.start({ id: activeTask.id, title: activeTask.title, brand: activeTask.brand });
                    setActiveTask(null);
                  }}
                  style={{
                    flex: 1, padding: "12px", borderRadius: 4, border: "1px solid rgba(76,175,125,0.3)",
                    background: "rgba(76,175,125,0.1)", color: "#4CAF7D",
                    fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    letterSpacing: 0.5,
                  }}
                >
                  ▶ Start focus
                </button>
              )}
              <button
                onClick={() => updateStatus(activeTask)}
                style={{
                  flex: 2, padding: "12px", borderRadius: 4, border: "none",
                  background: activeTask.status === "done" ? "rgba(255,255,255,0.04)" : "#FF6B35",
                  color: activeTask.status === "done" ? "#F5F3EE" : "#0E0E10",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  letterSpacing: 0.5,
                }}
              >
                {activeTask.status === "done" ? "↺ Heropenen" : "✓ Markeer als afgerond"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtn = {
  padding: "6px 10px", borderRadius: 2, border: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(255,255,255,0.02)", color: "#F5F3EE", cursor: "pointer",
  fontSize: 16, fontFamily: "inherit", lineHeight: 1, transition: "all 0.15s",
};

const toggleBtn = {
  padding: "5px 12px", borderRadius: 2, border: "none", cursor: "pointer",
  fontSize: 10, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
  letterSpacing: 0.8, textTransform: "uppercase", transition: "all 0.2s",
};
