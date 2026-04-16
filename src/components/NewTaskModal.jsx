import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";

const BRANDS = [
  { key: "elev8",       label: "ELEV8",        color: "#FF6B35" },
  { key: "faithdrive",  label: "FaithDrive",   color: "#E8B458" },
  { key: "tendercards", label: "Tender Cards", color: "#4CAF7D" },
];

const TEAM = [
  { short: "Lucas",   color: "#FF6B35" },
  { short: "Raymond", color: "#FFB86B" },
  { short: "Shihab",  color: "#8BC34A" },
];

const PRIORITIES = [
  { key: "urgent", label: "Urgent",  color: "#CC5228", emoji: "🔥" },
  { key: "high",   label: "Hoog",    color: "#FF8A3D", emoji: "⚡" },
  { key: "normal", label: "Normaal", color: "#F5F3EE", emoji: "•" },
  { key: "low",    label: "Laag",    color: "#6E6E72", emoji: "↓" },
];

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

function slug(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

export default function NewTaskModal({ open, onClose, defaultDate, defaultAssignee, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("elev8");
  const [assignee, setAssignee] = useState(defaultAssignee || "Lucas");
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState(defaultDate || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTitle(""); setDescription(""); setBrand("elev8");
      setAssignee(defaultAssignee || "Lucas");
      setPriority("normal");
      setDueDate(defaultDate || "");
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, defaultDate, defaultAssignee]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true); setError(null);
    const taskKey = `custom-${Date.now()}-${slug(title)}`.slice(0, 80);
    const payload = {
      brand,
      source: "custom",
      task_key: taskKey,
      title: title.trim(),
      description: description.trim() || null,
      assigned_to: assignee,
      assigned_reason: "Handmatig toegewezen",
      status: "open",
      priority,
      due_date: dueDate || null,
    };
    const { error: insertError } = await supabase.from("tasks").insert(payload);
    if (insertError) { setError(insertError.message); setSaving(false); return; }
    supabase.channel("tasks_" + brand).send({ type: "broadcast", event: "tasks_changed", payload: {} });
    setSaving(false);
    onCreated?.();
    onClose();
  };

  const chip = (active, color = "#FF6B35") => ({
    padding: "8px 12px", borderRadius: 2,
    border: `1px solid ${active ? color + "66" : "rgba(255,255,255,0.06)"}`,
    background: active ? color + "14" : "transparent",
    color: active ? color : "#6E6E72",
    fontSize: 11, fontWeight: active ? 600 : 500, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.5,
    transition: "all 0.15s",
  });

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
        zIndex: 10100, display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "8vh 20px 20px", animation: "cmdk-fade 0.18s ease-out",
      }}
    >
      <div style={{
        background: "#14161A", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10, maxWidth: 560, width: "100%", padding: "24px 28px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)", position: "relative",
        fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE",
        animation: "cmdk-slide 0.25s cubic-bezier(.22,1,.36,1) both",
      }}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 14, background: "none", border: "none", color: "#6E6E72", cursor: "pointer", fontSize: 16, padding: 6 }}>✕</button>

        <div style={{ fontSize: 10, color: "#6E6E72", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontWeight: 500 }}>Nieuwe taak</div>
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Waar gaat deze taak over?"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave(); }}
          style={{
            width: "100%", background: "transparent", border: "none", outline: "none",
            color: "#F5F3EE", fontSize: 24, fontWeight: 600, fontFamily: "'Syne', sans-serif",
            letterSpacing: "-0.01em", marginBottom: 10, boxSizing: "border-box",
          }}
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Extra context (optioneel)"
          rows={2}
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 4,
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            color: "#F5F3EE", fontSize: 13, fontFamily: "inherit", fontWeight: 300,
            outline: "none", resize: "vertical", minHeight: 60, boxSizing: "border-box", marginBottom: 20,
          }}
        />

        {/* Brand */}
        <div style={{ fontSize: 9, color: "#6E6E72", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600, marginBottom: 6 }}>Merk</div>
        <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
          {BRANDS.map((b) => (
            <button key={b.key} onClick={() => setBrand(b.key)} style={chip(brand === b.key, b.color)}>{b.label}</button>
          ))}
        </div>

        {/* Assignee */}
        <div style={{ fontSize: 9, color: "#6E6E72", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600, marginBottom: 6 }}>Wijs toe aan</div>
        <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
          {TEAM.map((m) => (
            <button key={m.short} onClick={() => setAssignee(m.short)} style={chip(assignee === m.short, m.color)}>{m.short}</button>
          ))}
          {TEAM.map((m1) => TEAM.filter((m2) => m2.short !== m1.short).map((m2) => {
            const combined = `${m1.short} + ${m2.short}`;
            // Only show each pair once (alphabetical)
            if (m1.short > m2.short) return null;
            return (
              <button key={combined} onClick={() => setAssignee(combined)} style={chip(assignee === combined, m1.color)}>
                {m1.short.charAt(0)}+{m2.short.charAt(0)}
              </button>
            );
          }))}
          <button onClick={() => setAssignee("Gezamenlijk")} style={chip(assignee === "Gezamenlijk")}>Gezamenlijk</button>
        </div>

        {/* Priority */}
        <div style={{ fontSize: 9, color: "#6E6E72", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600, marginBottom: 6 }}>Prioriteit</div>
        <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
          {PRIORITIES.map((p) => (
            <button key={p.key} onClick={() => setPriority(p.key)} style={chip(priority === p.key, p.color)}>
              {p.emoji} {p.label}
            </button>
          ))}
        </div>

        {/* Due date */}
        <div style={{ fontSize: 9, color: "#6E6E72", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600, marginBottom: 6 }}>Deadline</div>
        <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
          <button onClick={() => setDueDate(todayISO())} style={chip(dueDate === todayISO())}>Vandaag</button>
          <button onClick={() => setDueDate(addDaysISO(1))} style={chip(dueDate === addDaysISO(1))}>Morgen</button>
          <button onClick={() => setDueDate(nextFridayISO())} style={chip(dueDate === nextFridayISO())}>Vrijdag</button>
          <button onClick={() => setDueDate(addDaysISO(7))} style={chip(dueDate === addDaysISO(7))}>Volgende week</button>
          <button onClick={() => setDueDate("")} style={chip(!dueDate, "#6E6E72")}>Geen</button>
        </div>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={{
            width: "100%", padding: "9px 12px", borderRadius: 4,
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            color: "#F5F3EE", fontSize: 13, fontFamily: "inherit",
            outline: "none", marginBottom: 20, boxSizing: "border-box",
          }}
        />

        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 4, background: "rgba(204,82,40,0.08)", border: "1px solid rgba(204,82,40,0.2)", color: "#CC5228", fontSize: 12, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            style={{
              flex: 1, padding: "12px", borderRadius: 2, border: "none",
              background: title.trim() && !saving ? "#FF6B35" : "rgba(255,255,255,0.04)",
              color: title.trim() && !saving ? "#0E0E10" : "rgba(255,255,255,0.15)",
              fontSize: 13, fontWeight: 600, cursor: title.trim() && !saving ? "pointer" : "default",
              fontFamily: "inherit", letterSpacing: 0.5,
            }}
          >
            {saving ? "Aanmaken…" : "Taak aanmaken"}
          </button>
          <span style={{ fontSize: 10, color: "#6E6E72", padding: "0 4px" }}>
            <kbd style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 3, fontSize: 10, fontFamily: "inherit" }}>⌘↵</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}
