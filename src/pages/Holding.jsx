import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const BRANDS = [
  { key: "elev8",       name: "ELEV8",        color: "#FF6B35", bg: "rgba(255,107,53,0.06)",  tagline: "Holding & merkenhuis" },
  { key: "faithdrive",  name: "FaithDrive",   color: "#E8B458", bg: "rgba(232,180,88,0.06)",  tagline: "Faith-based automotive" },
  { key: "tendercards", name: "Tender Cards", color: "#4CAF7D", bg: "rgba(76,175,125,0.06)",  tagline: "HR & verzuimbegeleiding" },
];

const TEAM = [
  { short: "Lucas",   color: "#FF6B35" },
  { short: "Raymond", color: "#FFB86B" },
  { short: "Shihab",  color: "#8BC34A" },
];

const STAGES = [
  { key: "lead",           color: "#E8B458" },
  { key: "contacted",      color: "#5AA9E6" },
  { key: "demo_scheduled", color: "#C44FFF" },
  { key: "demo_done",      color: "#FF8A3D" },
  { key: "offer_sent",     color: "#4CAF7D" },
  { key: "customer",       color: "#2DDB70" },
  { key: "lost",           color: "#6E6E72" },
];

function Sparkbar({ values, color, height = 28 }) {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height, marginTop: 4 }}>
      {values.map((v, i) => (
        <div key={i} style={{
          flex: 1,
          height: `${(v / max) * 100}%`,
          minHeight: v > 0 ? 3 : 1,
          background: v > 0 ? color : "rgba(255,255,255,0.06)",
          borderRadius: "2px 2px 0 0",
          transition: "height 0.4s cubic-bezier(.22,1,.36,1)",
        }} />
      ))}
    </div>
  );
}

function Kpi({ label, value, sub, color = "#F5F3EE", onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, minWidth: 0, padding: "18px 20px", borderRadius: 2,
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
        textAlign: "left", cursor: onClick ? "pointer" : "default",
        fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
      }}
      onMouseEnter={(e) => { if (onClick) { e.currentTarget.style.borderColor = "rgba(255,107,53,0.2)"; } }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; }}
    >
      <div style={{ fontSize: 10, color: "#6E6E72", letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 500, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#6E6E72", marginTop: 6, fontWeight: 300 }}>{sub}</div>}
    </button>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <div style={{ width: 32, height: 32, border: "2px solid rgba(255,255,255,0.06)", borderTopColor: "#FF6B35", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

export default function Holding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ tasks: [], requests: [], ideas: [], entries: [], profiles: [] });

  const load = async () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [tasksRes, requestsRes, ideasRes, entriesRes, profilesRes] = await Promise.all([
      supabase.from("tasks").select("brand, source, status, assigned_to, completed_at, due_date, priority"),
      supabase.from("requests").select("brand, stage, status, received_at"),
      supabase.from("ideas").select("brand, created_at"),
      supabase.from("entries").select("user_id, hours, created_at").gte("created_at", weekAgo),
      supabase.from("profiles").select("id, display_name, email"),
    ]);
    setData({
      tasks: tasksRes.data || [],
      requests: requestsRes.data || [],
      ideas: ideasRes.data || [],
      entries: entriesRes.data || [],
      profiles: profilesRes.data || [],
    });
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channels = [
      supabase.channel("tasks_elev8").on("broadcast", { event: "tasks_changed" }, load).subscribe(),
      supabase.channel("tasks_faithdrive").on("broadcast", { event: "tasks_changed" }, load).subscribe(),
      supabase.channel("tasks_tendercards").on("broadcast", { event: "tasks_changed" }, load).subscribe(),
      supabase.channel("requests_tendercards").on("broadcast", { event: "requests_changed" }, load).subscribe(),
      supabase.channel("ideas_elev8").on("broadcast", { event: "ideas_changed" }, load).subscribe(),
      supabase.channel("ideas_faithdrive").on("broadcast", { event: "ideas_changed" }, load).subscribe(),
      supabase.channel("ideas_tendercards").on("broadcast", { event: "ideas_changed" }, load).subscribe(),
    ];
    const interval = setInterval(load, 60000);
    return () => {
      channels.forEach((c) => supabase.removeChannel(c));
      clearInterval(interval);
    };
  }, []);

  const byBrand = useMemo(() => {
    const out = {};
    for (const b of BRANDS) {
      const bTasks = data.tasks.filter((t) => t.brand === b.key);
      const bChecklistTasks = bTasks.filter((t) => t.source === "checklist");
      const bRequests = data.requests.filter((r) => r.brand === b.key);
      const bIdeas = data.ideas.filter((i) => i.brand === b.key);

      const done = bChecklistTasks.filter((t) => t.status === "done").length;
      const total = bChecklistTasks.length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;

      // 7-day idea velocity (day buckets)
      const now = Date.now();
      const days = Array.from({ length: 7 }, (_, i) => {
        const dayEnd = now - i * 86400000;
        const dayStart = dayEnd - 86400000;
        return bIdeas.filter((x) => {
          const t = new Date(x.created_at).getTime();
          return t >= dayStart && t < dayEnd;
        }).length;
      }).reverse();

      // Tasks per member
      const perMember = {};
      TEAM.forEach((m) => { perMember[m.short] = 0; });
      bTasks.filter((t) => t.status === "open").forEach((t) => {
        TEAM.forEach((m) => { if ((t.assigned_to || "").includes(m.short)) perMember[m.short]++; });
      });

      // Funnel stats for requests
      const stageCounts = {};
      STAGES.forEach((s) => { stageCounts[s.key] = 0; });
      bRequests.forEach((r) => { const k = r.stage || "lead"; if (stageCounts[k] != null) stageCounts[k]++; });
      const leadChain = stageCounts.lead + stageCounts.contacted + stageCounts.demo_scheduled + stageCounts.demo_done + stageCounts.offer_sent + stageCounts.customer;
      const customerPct = leadChain > 0 ? Math.round((stageCounts.customer / leadChain) * 100) : 0;

      out[b.key] = {
        checklistPct: pct,
        checklistDone: done,
        checklistTotal: total,
        openTasks: bTasks.filter((t) => t.status === "open").length,
        doneTasks: bTasks.filter((t) => t.status === "done").length,
        ideasTotal: bIdeas.length,
        ideasLast7: bIdeas.filter((i) => new Date(i.created_at).getTime() > now - 7 * 86400000).length,
        ideasVelocity: days,
        requestsNew: bRequests.filter((r) => r.status === "new").length,
        requestsTotal: bRequests.length,
        stageCounts,
        customerPct,
        customerCount: stageCounts.customer,
        leadChain,
        perMember,
      };
    }
    return out;
  }, [data]);

  const totals = useMemo(() => {
    const openTasks = data.tasks.filter((t) => t.status === "open").length;
    const newReq = data.requests.filter((r) => r.status === "new").length;
    const ideasLast7 = data.ideas.filter((i) => new Date(i.created_at).getTime() > Date.now() - 7 * 86400000).length;
    const hoursThisWeek = data.entries.reduce((s, e) => s + (Number(e.hours) || 0), 0);
    const customers = data.requests.filter((r) => r.stage === "customer").length;
    return { openTasks, newReq, ideasLast7, hoursThisWeek, customers };
  }, [data]);

  const teamAllocation = useMemo(() => {
    const out = {};
    const today = new Date(); today.setHours(0, 0, 0, 0);
    TEAM.forEach((m) => { out[m.short] = { total: 0, overdue: 0, byBrand: {} }; BRANDS.forEach((b) => out[m.short].byBrand[b.key] = 0); });
    data.tasks.filter((t) => t.status === "open").forEach((t) => {
      TEAM.forEach((m) => {
        if ((t.assigned_to || "").includes(m.short)) {
          out[m.short].total++;
          if (out[m.short].byBrand[t.brand] != null) out[m.short].byBrand[t.brand]++;
          if (t.due_date && new Date(t.due_date + "T00:00:00") < today) out[m.short].overdue++;
        }
      });
    });
    return out;
  }, [data]);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE", padding: "32px 24px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
        .brand-card:hover { transform: translateY(-2px); border-color: rgba(255,107,53,0.25) !important; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Hero header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both", marginBottom: 8, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: "#6E6E72", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontWeight: 500 }}>Holding overview</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 40, fontWeight: 800, color: "#F5F3EE", letterSpacing: "-0.02em", lineHeight: 1 }}>
              ELEV<span style={{ color: "#FF6B35" }}>8</span>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "#6E6E72", fontWeight: 300 }}>Alles wat er speelt bij alle merken in één beeld.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, background: "rgba(76,175,125,0.08)", border: "1px solid rgba(76,175,125,0.15)" }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: "#4CAF7D", animation: "shimmer 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 11, color: "#4CAF7D", fontWeight: 500, letterSpacing: 0.5 }}>Live</span>
          </div>
        </div>
        <div style={{ width: 80, height: 1, background: "#FF6B35", margin: "16px 0 32px", opacity: 0.3 }} />

        {loading && <Spinner />}

        {!loading && (
          <>
            {/* KPI row */}
            <div style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap", animation: "fadeUp 0.6s 0.1s cubic-bezier(.22,1,.36,1) both" }}>
              <Kpi label="Actieve merken" value="3" sub="ELEV8 · FaithDrive · TC" color="#FF6B35" />
              <Kpi label="Open taken" value={totals.openTasks} sub="Over alle merken" color="#FF9B73" onClick={() => navigate("/mijn-taken")} />
              <Kpi label="Nieuwe aanvragen" value={totals.newReq} sub={totals.newReq === 0 ? "Inbox leeg" : "Wachten op reactie"} color={totals.newReq > 0 ? "#E8B458" : "#F5F3EE"} onClick={() => navigate("/sales")} />
              <Kpi label="Ideeën deze week" value={totals.ideasLast7} sub="Laatste 7 dagen" color="#4CAF7D" />
              <Kpi label="Klanten" value={totals.customers} sub="Omgezet via funnel" color="#2DDB70" />
              <Kpi label="Team uren" value={totals.hoursThisWeek.toFixed(1)} sub="Laatste 7 dagen" color="#F5F3EE" />
            </div>

            {/* Per-brand comparison cards */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 12, height: 1, background: "#FF6B35" }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", textTransform: "uppercase", letterSpacing: 1.5 }}>Merken vergelijking</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, marginBottom: 36, animation: "fadeUp 0.6s 0.15s cubic-bezier(.22,1,.36,1) both" }}>
              {BRANDS.map((b) => {
                const bd = byBrand[b.key];
                if (!bd) return null;
                return (
                  <div
                    key={b.key}
                    className="brand-card"
                    onClick={() => navigate("/sales")}
                    style={{
                      padding: "20px 22px", borderRadius: 4,
                      background: b.bg, border: "1px solid " + b.color + "22",
                      cursor: "pointer", transition: "all 0.2s",
                      position: "relative", overflow: "hidden",
                    }}
                  >
                    {/* Color bar */}
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: b.color }} />
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 8 }}>
                      <div>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: b.color, letterSpacing: "-0.01em" }}>{b.name}</div>
                        <div style={{ fontSize: 11, color: "#6E6E72", marginTop: 2 }}>{b.tagline}</div>
                      </div>
                      {bd.requestsNew > 0 && (
                        <div style={{ padding: "3px 8px", borderRadius: 999, background: b.color + "26", color: b.color, fontSize: 10, fontWeight: 700, letterSpacing: 0.3 }}>
                          {bd.requestsNew} nieuw
                        </div>
                      )}
                    </div>

                    {/* Checklist progress */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6E6E72", marginBottom: 5, letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 500 }}>
                        <span>Lanceer voortgang</span>
                        <span style={{ color: b.color, fontWeight: 700 }}>{bd.checklistPct}%</span>
                      </div>
                      <div style={{ height: 4, background: "rgba(255,255,255,0.04)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: bd.checklistPct + "%", height: "100%", background: b.color, transition: "width 0.8s cubic-bezier(.22,1,.36,1)" }} />
                      </div>
                      <div style={{ fontSize: 10, color: "#6E6E72", marginTop: 3, fontWeight: 300 }}>{bd.checklistDone} / {bd.checklistTotal} afgerond</div>
                    </div>

                    {/* Mini stats grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 9, color: "#6E6E72", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Open taken</div>
                        <div style={{ fontSize: 20, fontFamily: "'Syne', sans-serif", fontWeight: 700, color: "#F5F3EE" }}>{bd.openTasks}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: "#6E6E72", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Aanvragen</div>
                        <div style={{ fontSize: 20, fontFamily: "'Syne', sans-serif", fontWeight: 700, color: "#F5F3EE" }}>{bd.requestsTotal}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: "#6E6E72", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Ideeën</div>
                        <div style={{ fontSize: 20, fontFamily: "'Syne', sans-serif", fontWeight: 700, color: "#F5F3EE" }}>{bd.ideasTotal}</div>
                        <div style={{ fontSize: 9, color: b.color, fontWeight: 500, marginTop: 1 }}>+{bd.ideasLast7} deze week</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: "#6E6E72", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Conversie</div>
                        <div style={{ fontSize: 20, fontFamily: "'Syne', sans-serif", fontWeight: 700, color: "#4CAF7D" }}>{bd.customerPct}%</div>
                        <div style={{ fontSize: 9, color: "#6E6E72", marginTop: 1 }}>{bd.customerCount} van {bd.leadChain} leads</div>
                      </div>
                    </div>

                    {/* Ideas velocity sparkbar */}
                    <div>
                      <div style={{ fontSize: 9, color: "#6E6E72", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Ideeën per dag (7d)</div>
                      <Sparkbar values={bd.ideasVelocity} color={b.color} height={24} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Team allocation */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 12, height: 1, background: "#FF6B35" }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", textTransform: "uppercase", letterSpacing: 1.5 }}>Team capaciteit</span>
            </div>
            <div style={{ padding: "20px 24px", borderRadius: 4, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", marginBottom: 36, animation: "fadeUp 0.6s 0.2s cubic-bezier(.22,1,.36,1) both" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {TEAM.map((m) => {
                  const alloc = teamAllocation[m.short];
                  const maxTotal = Math.max(...Object.values(teamAllocation).map((x) => x.total), 1);
                  return (
                    <div key={m.short} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: m.color + "22", color: m.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                        {m.short.charAt(0)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12, alignItems: "center" }}>
                          <span style={{ color: "#F5F3EE", fontWeight: 500 }}>{m.short}</span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            {alloc.overdue > 0 && (
                              <span style={{ padding: "2px 8px", borderRadius: 999, background: "rgba(204,82,40,0.12)", color: "#CC5228", fontSize: 10, fontWeight: 700, letterSpacing: 0.3 }}>
                                🔥 {alloc.overdue} te laat
                              </span>
                            )}
                            <span style={{ color: "#6E6E72" }}>{alloc.total} open taken</span>
                          </span>
                        </div>
                        {/* Stacked bar per brand */}
                        <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: "rgba(255,255,255,0.04)" }}>
                          {BRANDS.map((b) => {
                            const c = alloc.byBrand[b.key];
                            const pct = maxTotal > 0 ? (c / maxTotal) * 100 : 0;
                            if (pct === 0) return null;
                            return (
                              <div
                                key={b.key}
                                title={`${b.name}: ${c}`}
                                style={{ width: pct + "%", background: b.color, transition: "width 0.6s cubic-bezier(.22,1,.36,1)" }}
                              />
                            );
                          })}
                        </div>
                        <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 10 }}>
                          {BRANDS.map((b) => (
                            <span key={b.key} style={{ color: alloc.byBrand[b.key] > 0 ? b.color : "#3a3a3d" }}>
                              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 99, background: b.color, marginRight: 4 }} />
                              {b.name}: {alloc.byBrand[b.key]}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Funnel comparison */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 12, height: 1, background: "#FF6B35" }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", textTransform: "uppercase", letterSpacing: 1.5 }}>Sales funnel per merk</span>
            </div>
            <div style={{ padding: "20px 24px", borderRadius: 4, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", marginBottom: 36, animation: "fadeUp 0.6s 0.25s cubic-bezier(.22,1,.36,1) both" }}>
              {BRANDS.map((b) => {
                const bd = byBrand[b.key];
                if (!bd) return null;
                const activeStages = STAGES.filter((s) => s.key !== "lost");
                const maxCount = Math.max(...activeStages.map((s) => bd.stageCounts[s.key]), 1);
                return (
                  <div key={b.key} style={{ marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 99, background: b.color }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#F5F3EE" }}>{b.name}</span>
                      </div>
                      <span style={{ fontSize: 10, color: "#6E6E72" }}>
                        {bd.leadChain > 0 ? (
                          <>
                            {bd.customerCount}/{bd.leadChain} → <strong style={{ color: "#4CAF7D" }}>{bd.customerPct}%</strong>
                          </>
                        ) : "Geen leads"}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 32 }}>
                      {activeStages.map((s) => {
                        const c = bd.stageCounts[s.key];
                        const h = (c / maxCount) * 100;
                        return (
                          <div key={s.key} style={{ flex: 1, height: Math.max(h, c > 0 ? 10 : 2) + "%", background: c > 0 ? s.color : "rgba(255,255,255,0.05)", borderRadius: "2px 2px 0 0", position: "relative" }}>
                            {c > 0 && (
                              <span style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: "#F5F3EE", fontWeight: 700 }}>{c}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
