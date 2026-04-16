import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

const TEAM_NAMES = ["Lucas", "Raymond", "Shihab"];

const BRAND_LABEL = {
  elev8: "ELEV8",
  faithdrive: "FaithDrive",
  tendercards: "Tender Cards",
};

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
  return "";
}

function Widget({ icon, label, value, sub, color, onClick, loading }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, minWidth: 0, padding: "16px 18px", borderRadius: 2,
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
        color: "#F5F3EE", textAlign: "left", cursor: onClick ? "pointer" : "default",
        fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
        display: "flex", flexDirection: "column", gap: 4,
      }}
      onMouseEnter={(e) => { if (onClick) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,107,53,0.18)"; } }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 12, color: color || "#FF6B35" }}>{icon}</span>
        <span style={{ fontSize: 10, color: "#6E6E72", letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 700, color: loading ? "#3a3a3d" : (color || "#F5F3EE"), lineHeight: 1.1, transition: "color 0.3s" }}>
        {loading ? "—" : value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "#6E6E72", fontWeight: 300 }}>{sub}</div>}
    </button>
  );
}

export default function DashboardWidgets() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({
    openTasks: 0, overdueTasks: 0,
    newRequests: 0, requestsBrand: null,
    newIdeas: 0, ideasBrand: null,
    checklistPct: 0, checklistDone: 0, checklistTotal: 0,
    lowestChecklistBrand: null,
  });
  const [loading, setLoading] = useState(true);
  const channelsRef = useRef([]);

  const userFirst = useMemo(() => detectTeamName(profile, user), [profile, user]);

  const load = async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const [myTasksRes, overdueRes, requestsRes, ideasRes, checklistRes] = await Promise.all([
      userFirst
        ? supabase.from("tasks").select("id", { count: "exact", head: true }).ilike("assigned_to", `%${userFirst}%`).eq("status", "open")
        : Promise.resolve({ count: 0 }),
      userFirst
        ? supabase.from("tasks").select("id", { count: "exact", head: true }).ilike("assigned_to", `%${userFirst}%`).eq("status", "open").lt("due_date", todayISO)
        : Promise.resolve({ count: 0 }),
      supabase.from("requests").select("brand").eq("status", "new"),
      supabase.from("ideas").select("brand").gte("created_at", yesterday),
      supabase.from("tasks").select("status, brand").eq("source", "checklist"),
    ]);

    // Find which brand has the most new requests (that's where to deep-link)
    const reqsByBrand = {};
    (requestsRes.data || []).forEach((r) => { reqsByBrand[r.brand] = (reqsByBrand[r.brand] || 0) + 1; });
    const reqsBrand = Object.entries(reqsByBrand).sort((a, b) => b[1] - a[1])[0]?.[0] || "tendercards";

    const ideasByBrand = {};
    (ideasRes.data || []).forEach((i) => { ideasByBrand[i.brand] = (ideasByBrand[i.brand] || 0) + 1; });
    const ideasBrand = Object.entries(ideasByBrand).sort((a, b) => b[1] - a[1])[0]?.[0] || "elev8";

    const checklist = checklistRes.data || [];
    const done = checklist.filter((t) => t.status === "done").length;
    const total = checklist.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    // Find brand with lowest % checklist progress (priority to work on)
    const perBrand = {};
    checklist.forEach((t) => {
      if (!perBrand[t.brand]) perBrand[t.brand] = { done: 0, total: 0 };
      perBrand[t.brand].total++;
      if (t.status === "done") perBrand[t.brand].done++;
    });
    const brandPcts = Object.entries(perBrand).map(([b, v]) => ({ brand: b, pct: v.total ? v.done / v.total : 1 }));
    const lowestChecklistBrand = brandPcts.sort((a, b) => a.pct - b.pct)[0]?.brand || null;

    setData({
      openTasks: myTasksRes.count ?? 0,
      overdueTasks: overdueRes.count ?? 0,
      newRequests: requestsRes.data?.length ?? 0,
      requestsBrand: reqsBrand,
      newIdeas: ideasRes.data?.length ?? 0,
      ideasBrand,
      checklistDone: done,
      checklistTotal: total,
      checklistPct: pct,
      lowestChecklistBrand,
    });
    setLoading(false);
  };

  useEffect(() => {
    load();
    // Live refresh when tasks/requests/ideas change
    const channels = [
      supabase.channel("tasks_elev8").on("broadcast", { event: "tasks_changed" }, load).subscribe(),
      supabase.channel("tasks_faithdrive").on("broadcast", { event: "tasks_changed" }, load).subscribe(),
      supabase.channel("tasks_tendercards").on("broadcast", { event: "tasks_changed" }, load).subscribe(),
      supabase.channel("requests_tendercards").on("broadcast", { event: "requests_changed" }, load).subscribe(),
      supabase.channel("ideas_elev8").on("broadcast", { event: "ideas_changed" }, load).subscribe(),
      supabase.channel("ideas_faithdrive").on("broadcast", { event: "ideas_changed" }, load).subscribe(),
      supabase.channel("ideas_tendercards").on("broadcast", { event: "ideas_changed" }, load).subscribe(),
    ];
    channelsRef.current = channels;
    const interval = setInterval(load, 60000);
    return () => {
      channels.forEach((c) => supabase.removeChannel(c));
      clearInterval(interval);
    };
    // eslint-disable-next-line
  }, [userFirst]);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 6 ? "Goedenacht" : h < 12 ? "Goedemorgen" : h < 18 ? "Goedemiddag" : "Goedenavond";
  })();

  return (
    <div style={{ marginBottom: 28, animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both" }}>
      {userFirst && (
        <div style={{ fontSize: 12, color: "#6E6E72", marginBottom: 12, fontWeight: 300, letterSpacing: 0.3 }}>
          {greeting}, <span style={{ color: "#FF6B35", fontWeight: 500 }}>{userFirst}</span>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Widget
          icon={data.overdueTasks > 0 ? "🔥" : "✓"}
          label={data.overdueTasks > 0 ? `Open · ${data.overdueTasks} te laat` : "Open taken"}
          value={data.openTasks}
          sub={data.openTasks === 0 ? "Niks open 🎉" : data.overdueTasks > 0 ? `${data.overdueTasks} over deadline` : "Aan jou toegewezen"}
          color={data.overdueTasks > 0 ? "#CC5228" : "#FF6B35"}
          loading={loading}
          onClick={() => navigate("/mijn-taken")}
        />
        <Widget
          icon="📬"
          label="Nieuwe aanvragen"
          value={data.newRequests}
          sub={data.newRequests === 0 ? "Inbox leeg" : `Bij ${BRAND_LABEL[data.requestsBrand] || "Tender Cards"}`}
          color={data.newRequests > 0 ? "#E8B458" : "#F5F3EE"}
          loading={loading}
          onClick={() => navigate(`/sales?brand=${data.requestsBrand || "tendercards"}&tab=aanvragen`)}
        />
        <Widget
          icon="💡"
          label="Ideeën <24u"
          value={data.newIdeas}
          sub={data.newIdeas === 0 ? "Geen nieuwe" : `Bij ${BRAND_LABEL[data.ideasBrand] || "ELEV8"}`}
          color={data.newIdeas > 0 ? "#4CAF7D" : "#F5F3EE"}
          loading={loading}
          onClick={() => navigate(`/sales?brand=${data.ideasBrand || "elev8"}&tab=ideeen`)}
        />
        <Widget
          icon="🚀"
          label="Checklist"
          value={loading ? "—" : `${data.checklistPct}%`}
          sub={loading ? "Laden…" : `${data.checklistDone}/${data.checklistTotal} afgerond`}
          color="#FF9B73"
          loading={loading}
          onClick={() => navigate(data.lowestChecklistBrand ? `/sales?brand=${data.lowestChecklistBrand}&tab=checklist` : "/sales")}
        />
      </div>
    </div>
  );
}
