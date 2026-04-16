import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

const BRAND_META = {
  elev8: { label: "ELEV8", color: "#FF6B35" },
  faithdrive: { label: "FaithDrive", color: "#E8B458" },
  tendercards: { label: "Tender Cards", color: "#4CAF7D" },
};

const SOURCE_META = {
  stappenplan: { label: "Stappenplan", icon: "🎯" },
  checklist: { label: "Lanceerchecklist", icon: "✅" },
};

const TEAM_NAMES = ["Lucas", "Raymond", "Shihab"];

function detectTeamName(profile, user) {
  const sources = [
    profile?.display_name,
    user?.email,
    user?.user_metadata?.full_name,
    user?.user_metadata?.name,
  ].filter(Boolean).map((s) => s.toLowerCase());
  for (const name of TEAM_NAMES) {
    if (sources.some((s) => s.includes(name.toLowerCase()))) return name;
  }
  // Fallback: first token of display_name
  return (profile?.display_name || user?.email || "").trim().split(/[\s.@]+/)[0] || "";
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <div style={{ width: 32, height: 32, border: "2px solid rgba(255,255,255,0.06)", borderTopColor: "#FF6B35", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

export default function MyTasks() {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");
  const [brandFilter, setBrandFilter] = useState("all");
  const channelRef = useRef(null);

  const userFirst = useMemo(() => detectTeamName(profile, user), [profile, user]);

  const fetchTasks = async () => {
    if (!userFirst) { setTasks([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .ilike("assigned_to", `%${userFirst}%`)
      .order("status", { ascending: true })
      .order("created_at", { ascending: false });
    setTasks(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
    const channels = ["elev8", "faithdrive", "tendercards"].map((b) =>
      supabase.channel("tasks_" + b).on("broadcast", { event: "tasks_changed" }, () => fetchTasks()).subscribe()
    );
    channelRef.current = channels;
    return () => { channels.forEach((c) => supabase.removeChannel(c)); };
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

  const visible = tasks.filter((t) => {
    if (filter === "open" && t.status !== "open") return false;
    if (filter === "done" && t.status !== "done") return false;
    if (brandFilter !== "all" && t.brand !== brandFilter) return false;
    return true;
  });

  const stats = {
    total: tasks.length,
    open: tasks.filter((t) => t.status === "open").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  const brandsPresent = [...new Set(tasks.map((t) => t.brand))];

  const chipStyle = (active) => ({
    padding: "7px 14px", borderRadius: 2, border: `1px solid ${active ? "rgba(255,107,53,0.35)" : "rgba(255,255,255,0.06)"}`,
    background: active ? "rgba(255,107,53,0.08)" : "transparent",
    color: active ? "#FF6B35" : "#6E6E72",
    fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
    letterSpacing: 0.5, textTransform: "uppercase", transition: "all 0.2s",
  });

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE", padding: "32px 24px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both", marginBottom: 28 }}>
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

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24, animation: "fadeUp 0.6s 0.1s cubic-bezier(.22,1,.36,1) both" }}>
          {[
            { label: "Totaal", value: stats.total, color: "#F5F3EE" },
            { label: "Open", value: stats.open, color: "#FF6B35" },
            { label: "Afgerond", value: stats.done, color: "#4CAF7D" },
          ].map((s) => (
            <div key={s.label} style={{ padding: "14px 16px", borderRadius: 2, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: 10, color: "#6E6E72", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20, animation: "fadeUp 0.6s 0.12s cubic-bezier(.22,1,.36,1) both" }}>
          <button onClick={() => setFilter("open")} style={chipStyle(filter === "open")}>Open ({stats.open})</button>
          <button onClick={() => setFilter("done")} style={chipStyle(filter === "done")}>Afgerond ({stats.done})</button>
          <button onClick={() => setFilter("all")} style={chipStyle(filter === "all")}>Alles</button>
          <div style={{ width: 1, background: "rgba(255,255,255,0.06)", margin: "0 6px" }} />
          <button onClick={() => setBrandFilter("all")} style={chipStyle(brandFilter === "all")}>Alle merken</button>
          {brandsPresent.map((b) => (
            <button key={b} onClick={() => setBrandFilter(b)} style={chipStyle(brandFilter === b)}>{BRAND_META[b]?.label || b}</button>
          ))}
        </div>

        {loading && <Spinner />}

        {!loading && visible.length === 0 && (
          <div style={{ padding: "48px 20px", borderRadius: 2, border: "1px solid rgba(255,255,255,0.04)", textAlign: "center", animation: "fadeUp 0.6s 0.15s cubic-bezier(.22,1,.36,1) both" }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>🎉</div>
            <div style={{ fontSize: 15, color: "#6E6E72", fontWeight: 400 }}>
              {tasks.length === 0 ? "Nog geen taken toegewezen" : "Niks open in deze view"}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.15)", marginTop: 4, fontWeight: 300 }}>
              {tasks.length === 0 ? "Open een merk-dashboard om taken te laten scannen." : "Probeer een ander filter."}
            </div>
          </div>
        )}

        {!loading && visible.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, animation: "fadeUp 0.6s 0.15s cubic-bezier(.22,1,.36,1) both" }}>
            {visible.map((t) => {
              const brand = BRAND_META[t.brand] || { label: t.brand, color: "#6E6E72" };
              const source = SOURCE_META[t.source] || { label: t.source, icon: "•" };
              const isDone = t.status === "done";
              const isShared = (t.assigned_to || "").includes("+");
              return (
                <div key={t.id} style={{
                  display: "flex", gap: 14, padding: "14px 16px", borderRadius: 2,
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
                  opacity: isDone ? 0.5 : 1, transition: "opacity 0.2s",
                }}>
                  <button
                    onClick={() => toggleTask(t)}
                    style={{
                      width: 22, height: 22, borderRadius: 3,
                      border: `1.5px solid ${isDone ? "#4CAF7D" : "rgba(255,107,53,0.4)"}`,
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
                        <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 999, background: "rgba(255,107,53,0.08)", color: "#FF6B35", letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 600 }}>
                          gedeeld
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#F5F3EE", marginBottom: t.description ? 3 : 0, textDecoration: isDone ? "line-through" : "none" }}>
                      {t.title}
                    </div>
                    {t.description && (
                      <div style={{ fontSize: 12, color: "#6E6E72", fontWeight: 300, lineHeight: 1.4 }}>{t.description}</div>
                    )}
                    {t.assigned_reason && !isDone && (
                      <div style={{ fontSize: 10, color: "rgba(255,107,53,0.6)", marginTop: 6, fontStyle: "italic" }}>
                        Match: {t.assigned_reason}
                      </div>
                    )}
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
