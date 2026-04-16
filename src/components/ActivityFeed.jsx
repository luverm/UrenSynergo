import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const BRAND_META = {
  elev8: { label: "ELEV8", color: "#FF6B35" },
  faithdrive: { label: "FaithDrive", color: "#E8B458" },
  tendercards: { label: "Tender Cards", color: "#4CAF7D" },
};

function timeAgo(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "zojuist";
  if (diff < 3600) return Math.floor(diff / 60) + "m";
  if (diff < 86400) return Math.floor(diff / 3600) + "u";
  if (diff < 604800) return Math.floor(diff / 86400) + "d";
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

function truncate(s, n = 60) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export default function ActivityFeed() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const channelsRef = useRef([]);

  const load = async () => {
    const [ideasRes, tasksRes, requestsRes, groupsRes] = await Promise.all([
      supabase.from("ideas").select("id, text, brand, author, created_at").order("created_at", { ascending: false }).limit(10),
      supabase.from("tasks").select("id, title, brand, assigned_to, completed_by, completed_at, status").eq("status", "done").order("completed_at", { ascending: false }).limit(10),
      supabase.from("requests").select("id, subject, from_name, from_email, brand, received_at, stage").order("received_at", { ascending: false }).limit(10),
      supabase.from("groups").select("id, name, created_at, owner_id").order("created_at", { ascending: false }).limit(5),
    ]);

    const all = [];

    (ideasRes.data || []).forEach((i) => {
      all.push({
        id: "idea-" + i.id,
        type: "idea",
        actor: i.author || "Iemand",
        verb: "deelde een idee",
        target: truncate(i.text, 80),
        brand: i.brand,
        timestamp: i.created_at,
        icon: "💡",
        color: "#4CAF7D",
        onClick: () => navigate(`/sales?brand=${i.brand}&tab=ideeen`),
      });
    });

    (tasksRes.data || []).forEach((t) => {
      all.push({
        id: "task-" + t.id,
        type: "task_done",
        actor: t.completed_by || t.assigned_to || "Iemand",
        verb: "rondde taak af",
        target: truncate(t.title, 80),
        brand: t.brand,
        timestamp: t.completed_at,
        icon: "✓",
        color: "#FF6B35",
        onClick: () => navigate("/mijn-taken"),
      });
    });

    (requestsRes.data || []).forEach((r) => {
      const name = r.from_name || (r.from_email ? r.from_email.split("@")[0] : "Onbekend");
      all.push({
        id: "req-" + r.id,
        type: "request",
        actor: name,
        verb: "stuurde een aanvraag",
        target: truncate(r.subject || "(geen onderwerp)", 80),
        brand: r.brand,
        timestamp: r.received_at,
        icon: "📬",
        color: "#E8B458",
        onClick: () => navigate(`/sales?brand=${r.brand}&tab=aanvragen`),
      });
    });

    (groupsRes.data || []).forEach((g) => {
      all.push({
        id: "group-" + g.id,
        type: "group_created",
        actor: "Team",
        verb: "maakte project",
        target: truncate(g.name, 80),
        brand: null,
        timestamp: g.created_at,
        icon: "📁",
        color: "#FF9B73",
        onClick: () => navigate(`/groups/${g.id}`),
      });
    });

    all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setEvents(all.slice(0, 12));
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
      supabase.channel("groups_live").on("broadcast", { event: "groups_changed" }, load).subscribe(),
    ];
    channelsRef.current = channels;
    const interval = setInterval(load, 60000);
    return () => {
      channels.forEach((c) => supabase.removeChannel(c));
      clearInterval(interval);
    };
  }, []);

  if (loading) return null;
  if (events.length === 0) return null;

  return (
    <div style={{ marginTop: 32, animation: "fadeUp 0.6s 0.3s cubic-bezier(.22,1,.36,1) both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ width: 12, height: 1, background: "#FF6B35" }} />
        <span style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", textTransform: "uppercase", letterSpacing: 1.5 }}>Recente activiteit</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {events.map((e, idx) => {
          const brand = BRAND_META[e.brand];
          const initial = (e.actor || "?").charAt(0).toUpperCase();
          return (
            <div
              key={e.id}
              onClick={e.onClick}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 2,
                cursor: e.onClick ? "pointer" : "default", transition: "all 0.15s",
                background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)",
                position: "relative", overflow: "hidden",
              }}
              onMouseEnter={(ev) => { ev.currentTarget.style.background = "rgba(255,255,255,0.025)"; ev.currentTarget.style.borderColor = "rgba(255,107,53,0.12)"; }}
              onMouseLeave={(ev) => { ev.currentTarget.style.background = "rgba(255,255,255,0.01)"; ev.currentTarget.style.borderColor = "rgba(255,255,255,0.03)"; }}
            >
              {/* Timeline line */}
              {idx < events.length - 1 && (
                <div style={{ position: "absolute", left: 24, top: 38, bottom: -2, width: 1, background: "rgba(255,255,255,0.03)" }} />
              )}
              <div style={{
                width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                background: e.color + "1A", color: e.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 600, zIndex: 1, position: "relative",
                border: `1px solid ${e.color}33`,
              }}>{e.icon}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#F5F3EE", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  <span style={{ fontWeight: 500, color: "#F5F3EE" }}>{e.actor}</span>
                  <span style={{ color: "#6E6E72", fontWeight: 300 }}> {e.verb}: </span>
                  <span style={{ color: "rgba(245,243,238,0.85)", fontWeight: 400 }}>{e.target}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, fontSize: 10, color: "#6E6E72" }}>
                  <span>{timeAgo(e.timestamp)}</span>
                  {brand && (
                    <>
                      <span style={{ opacity: 0.4 }}>·</span>
                      <span style={{ color: brand.color, fontWeight: 500, letterSpacing: 0.5, textTransform: "uppercase", fontSize: 9 }}>{brand.label}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
