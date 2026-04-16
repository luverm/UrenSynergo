import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const BRANDS = [
  { key: "elev8",       name: "ELEV8",        color: "#FF6B35" },
  { key: "faithdrive",  name: "FaithDrive",   color: "#E8B458" },
  { key: "tendercards", name: "Tender Cards", color: "#4CAF7D" },
];

const TEAM = [
  { short: "Lucas",   color: "#FF6B35" },
  { short: "Raymond", color: "#FFB86B" },
  { short: "Shihab",  color: "#8BC34A" },
];

const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function weekRange(offset = 0) {
  // ISO week: Monday start
  const now = new Date();
  now.setDate(now.getDate() + offset * 7);
  const day = now.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function isoWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function formatDateRange({ start, end }) {
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} — ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
  }
  return `${start.getDate()} ${MONTHS[start.getMonth()]} — ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
}

function Spinner() {
  return <div style={{ textAlign: "center", padding: 40, color: "#6E6E72" }}>Laden…</div>;
}

export default function WeeklyDigest() {
  const navigate = useNavigate();
  const [weekOffset, setWeekOffset] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  const range = useMemo(() => weekRange(weekOffset), [weekOffset]);
  const weekNum = useMemo(() => isoWeekNumber(range.start), [range]);

  const load = async () => {
    setLoading(true);
    const startISO = range.start.toISOString();
    const endISO = range.end.toISOString();

    const [tasksRes, doneRes, ideasRes, reqRes, entriesRes] = await Promise.all([
      supabase.from("tasks").select("*"),
      supabase.from("tasks").select("*").eq("status", "done").gte("completed_at", startISO).lte("completed_at", endISO),
      supabase.from("ideas").select("*").gte("created_at", startISO).lte("created_at", endISO),
      supabase.from("requests").select("*").gte("received_at", startISO).lte("received_at", endISO),
      supabase.from("entries").select("user_id, task, hours, created_at, color, icon").gte("created_at", startISO).lte("created_at", endISO),
    ]);

    setData({
      allTasks: tasksRes.data || [],
      completedTasks: doneRes.data || [],
      ideas: ideasRes.data || [],
      requests: reqRes.data || [],
      entries: entriesRes.data || [],
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, [weekOffset]);

  const stats = useMemo(() => {
    if (!data) return null;
    const hoursTotal = data.entries.reduce((s, e) => s + (Number(e.hours) || 0), 0);

    // Per person
    const perPerson = {};
    TEAM.forEach((m) => { perPerson[m.short] = { done: 0, hours: 0 }; });
    data.completedTasks.forEach((t) => {
      TEAM.forEach((m) => {
        if ((t.completed_by || t.assigned_to || "").includes(m.short)) perPerson[m.short].done++;
      });
    });

    // Per brand
    const perBrand = {};
    BRANDS.forEach((b) => {
      perBrand[b.key] = {
        done: data.completedTasks.filter((t) => t.brand === b.key).length,
        ideas: data.ideas.filter((i) => i.brand === b.key).length,
        requests: data.requests.filter((r) => r.brand === b.key).length,
        customers: data.requests.filter((r) => r.brand === b.key && r.stage === "customer").length,
      };
    });

    // Ideas per day
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(range.start);
      d.setDate(range.start.getDate() + i);
      return d;
    });
    const ideasByDay = days.map((d) => {
      const dISO = d.toISOString().slice(0, 10);
      return data.ideas.filter((i) => i.created_at.slice(0, 10) === dISO).length;
    });

    // New customers
    const newCustomers = data.requests.filter((r) => r.stage === "customer");
    const newLeads = data.requests;

    return { hoursTotal, perPerson, perBrand, ideasByDay, days, newCustomers, newLeads };
  }, [data, range]);

  const copyToClipboard = () => {
    if (!data || !stats) return;
    const rangeLabel = formatDateRange(range);
    const lines = [];
    lines.push(`📊 Week ${weekNum} · ${rangeLabel}`);
    lines.push("");
    lines.push(`✅ ${data.completedTasks.length} taken afgerond`);
    lines.push(`💡 ${data.ideas.length} nieuwe ideeën`);
    lines.push(`📬 ${data.requests.length} nieuwe aanvragen`);
    if (stats.newCustomers.length > 0) lines.push(`🎉 ${stats.newCustomers.length} nieuwe klant${stats.newCustomers.length === 1 ? "" : "en"}`);
    lines.push(`⏱ ${stats.hoursTotal.toFixed(1)} uur gelogd`);
    lines.push("");
    lines.push("Team:");
    TEAM.forEach((m) => {
      const p = stats.perPerson[m.short];
      if (p.done > 0) lines.push(`  • ${m.short}: ${p.done} taken af`);
    });
    lines.push("");
    lines.push("Per merk:");
    BRANDS.forEach((b) => {
      const bd = stats.perBrand[b.key];
      const parts = [];
      if (bd.done) parts.push(`${bd.done} taken`);
      if (bd.ideas) parts.push(`${bd.ideas} ideeën`);
      if (bd.requests) parts.push(`${bd.requests} leads`);
      if (parts.length) lines.push(`  • ${b.name}: ${parts.join(" · ")}`);
    });
    navigator.clipboard.writeText(lines.join("\n"));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const rangeLabel = formatDateRange(range);
  const isCurrentWeek = weekOffset === 0;

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE", padding: "32px 24px", boxSizing: "border-box" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Hero */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both", marginBottom: 8, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: "#6E6E72", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontWeight: 500 }}>Weekly digest</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 36, fontWeight: 800, color: "#F5F3EE", letterSpacing: "-0.02em", lineHeight: 1 }}>
              Week <span style={{ color: "#FF6B35" }}>{weekNum}</span>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 14, color: "#6E6E72", fontWeight: 300 }}>{rangeLabel}{isCurrentWeek ? " · lopende week" : ""}</p>
          </div>
          <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => setWeekOffset(weekOffset - 1)} style={navBtn}>‹ Vorige</button>
            {!isCurrentWeek && <button onClick={() => setWeekOffset(0)} style={navBtn}>Deze week</button>}
            <button onClick={() => setWeekOffset(weekOffset + 1)} disabled={isCurrentWeek} style={{ ...navBtn, opacity: isCurrentWeek ? 0.3 : 1, cursor: isCurrentWeek ? "default" : "pointer" }}>Volgende ›</button>
          </div>
        </div>
        <div style={{ width: 80, height: 1, background: "#FF6B35", margin: "16px 0 32px", opacity: 0.3 }} />

        {loading && <Spinner />}

        {!loading && stats && (
          <>
            {/* Top KPI banner */}
            <div style={{ padding: "28px 32px", borderRadius: 4, background: "linear-gradient(135deg, rgba(255,107,53,0.06), rgba(232,180,88,0.04))", border: "1px solid rgba(255,107,53,0.15)", marginBottom: 28, animation: "fadeUp 0.6s 0.1s cubic-bezier(.22,1,.36,1) both" }}>
              <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#FF6B35", fontWeight: 600, marginBottom: 12 }}>Week in het kort</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 24 }}>
                <StatBig value={data.completedTasks.length} label="Taken afgerond" color="#4CAF7D" />
                <StatBig value={data.ideas.length} label="Ideeën" color="#E8B458" />
                <StatBig value={data.requests.length} label="Nieuwe leads" color="#FF6B35" />
                {stats.newCustomers.length > 0 && <StatBig value={stats.newCustomers.length} label="Klanten 🎉" color="#2DDB70" />}
                <StatBig value={stats.hoursTotal.toFixed(1)} label="Uren gelogd" color="#F5F3EE" />
              </div>
            </div>

            {/* Team performance */}
            <SectionTitle>Team deze week</SectionTitle>
            <div style={{ padding: "20px 24px", borderRadius: 4, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", marginBottom: 28, animation: "fadeUp 0.6s 0.15s cubic-bezier(.22,1,.36,1) both" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {TEAM.map((m) => {
                  const p = stats.perPerson[m.short];
                  const max = Math.max(...Object.values(stats.perPerson).map((x) => x.done), 1);
                  return (
                    <div key={m.short} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: m.color + "22", color: m.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                        {m.short.charAt(0)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, color: "#F5F3EE", fontWeight: 500 }}>{m.short}</span>
                          <span style={{ fontSize: 12, color: p.done > 0 ? m.color : "#6E6E72", fontWeight: 600 }}>{p.done} taken af</span>
                        </div>
                        <div style={{ height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${(p.done / max) * 100}%`, height: "100%", background: m.color, borderRadius: 3, transition: "width 0.8s cubic-bezier(.22,1,.36,1)" }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Per brand highlights */}
            <SectionTitle>Per merk</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 28, animation: "fadeUp 0.6s 0.2s cubic-bezier(.22,1,.36,1) both" }}>
              {BRANDS.map((b) => {
                const bd = stats.perBrand[b.key];
                const hasActivity = bd.done > 0 || bd.ideas > 0 || bd.requests > 0 || bd.customers > 0;
                return (
                  <div key={b.key} style={{ padding: "18px 20px", borderRadius: 4, background: b.color + "08", border: `1px solid ${b.color}22`, opacity: hasActivity ? 1 : 0.5 }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: b.color, marginBottom: 10, letterSpacing: "-0.01em" }}>{b.name}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                      <Row label="Taken af" value={bd.done} accent="#4CAF7D" />
                      <Row label="Ideeën" value={bd.ideas} accent="#E8B458" />
                      <Row label="Nieuwe leads" value={bd.requests} accent="#FF6B35" />
                      {bd.customers > 0 && <Row label="Klanten" value={bd.customers} accent="#2DDB70" highlight />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Daily ideas spark + completed tasks list */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28, animation: "fadeUp 0.6s 0.25s cubic-bezier(.22,1,.36,1) both" }}>
              {/* Ideas spark */}
              <div style={{ padding: "18px 22px", borderRadius: 4, background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#6E6E72", fontWeight: 600, marginBottom: 12 }}>Ideeën per dag</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 64, marginBottom: 8 }}>
                  {stats.ideasByDay.map((v, i) => {
                    const max = Math.max(...stats.ideasByDay, 1);
                    const h = (v / max) * 100;
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                          <div style={{ width: "100%", height: v > 0 ? Math.max(h, 12) + "%" : "2px", background: v > 0 ? "#E8B458" : "rgba(255,255,255,0.08)", borderRadius: "3px 3px 0 0", transition: "height 0.6s" }} />
                        </div>
                        <div style={{ fontSize: 9, color: "#6E6E72", fontWeight: 500 }}>{["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"][i]}</div>
                        {v > 0 && <div style={{ fontSize: 10, color: "#E8B458", fontWeight: 700, marginTop: -16 }}>{v}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Latest wins */}
              <div style={{ padding: "18px 22px", borderRadius: 4, background: "rgba(76,175,125,0.06)", border: "1px solid rgba(76,175,125,0.2)" }}>
                <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#4CAF7D", fontWeight: 600, marginBottom: 12 }}>✓ Wins deze week</div>
                {data.completedTasks.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#6E6E72", fontStyle: "italic" }}>Nog geen taken afgerond</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto" }}>
                    {data.completedTasks.slice(0, 8).map((t) => {
                      const brand = BRANDS.find((b) => b.key === t.brand);
                      return (
                        <div key={t.id} style={{ fontSize: 12, color: "#F5F3EE", display: "flex", gap: 8, alignItems: "baseline" }}>
                          <span style={{ color: brand?.color, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", flexShrink: 0, paddingTop: 1 }}>{brand?.name.slice(0, 3)}</span>
                          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                          <span style={{ color: "#6E6E72", fontSize: 10, flexShrink: 0 }}>{t.completed_by || ""}</span>
                        </div>
                      );
                    })}
                    {data.completedTasks.length > 8 && <div style={{ fontSize: 10, color: "#6E6E72", textAlign: "center", marginTop: 4 }}>+{data.completedTasks.length - 8} meer</div>}
                  </div>
                )}
              </div>
            </div>

            {/* New customers highlight */}
            {stats.newCustomers.length > 0 && (
              <div style={{ padding: "20px 24px", borderRadius: 4, background: "linear-gradient(135deg, rgba(45,219,112,0.1), rgba(76,175,125,0.05))", border: "1px solid rgba(45,219,112,0.25)", marginBottom: 28, animation: "popIn 0.5s cubic-bezier(.22,1,.36,1) both" }}>
                <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#2DDB70", fontWeight: 700, marginBottom: 10 }}>🎉 Nieuwe klanten</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {stats.newCustomers.map((r) => (
                    <div key={r.id} style={{ fontSize: 13, color: "#F5F3EE", fontWeight: 500 }}>
                      {r.from_name || r.from_email || "Onbekend"} — <span style={{ color: "#6E6E72", fontWeight: 400 }}>{r.subject || ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Share actions */}
            <div className="no-print" style={{ display: "flex", gap: 10, flexWrap: "wrap", animation: "fadeUp 0.6s 0.3s cubic-bezier(.22,1,.36,1) both" }}>
              <button onClick={copyToClipboard} style={{
                padding: "12px 20px", borderRadius: 2, border: "none",
                background: copySuccess ? "#4CAF7D" : "#FF6B35", color: "#0E0E10",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit", letterSpacing: 0.5, transition: "all 0.2s",
              }}>
                {copySuccess ? "✓ Gekopieerd!" : "📋 Kopieer samenvatting"}
              </button>
              <button onClick={() => window.print()} style={{
                padding: "12px 20px", borderRadius: 2, border: "1px solid rgba(255,255,255,0.08)",
                background: "transparent", color: "#F5F3EE",
                fontSize: 13, fontWeight: 500, cursor: "pointer",
                fontFamily: "inherit", letterSpacing: 0.5,
              }}>
                🖨 Print / PDF export
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatBig({ value, label, color }) {
  return (
    <div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 44, fontWeight: 800, color, lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#6E6E72", marginTop: 6, letterSpacing: 0.5, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <div style={{ width: 12, height: 1, background: "#FF6B35" }} />
      <span style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", textTransform: "uppercase", letterSpacing: 1.5 }}>{children}</span>
    </div>
  );
}

function Row({ label, value, accent, highlight }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
      <span style={{ color: "#6E6E72" }}>{label}</span>
      <span style={{ color: value > 0 ? accent : "#3a3a3d", fontWeight: highlight ? 700 : 500, fontSize: highlight ? 14 : 12 }}>{value || "—"}</span>
    </div>
  );
}

const navBtn = {
  padding: "6px 12px", borderRadius: 2, border: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(255,255,255,0.02)", color: "#F5F3EE", cursor: "pointer",
  fontSize: 11, fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.5, fontWeight: 500,
  textTransform: "uppercase", transition: "all 0.15s",
};
