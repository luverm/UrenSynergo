import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

function getCurrentPeriod() {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth();
  const year = now.getFullYear();
  if (day >= 18) {
    return `${year}-${String(month).padStart(2, "0")}-18`;
  } else {
    const prev = new Date(year, month - 1, 18);
    return `${prev.getFullYear()}-${String(prev.getMonth()).padStart(2, "0")}-18`;
  }
}

function getPeriodLabel(periodKey) {
  const parts = periodKey.split("-");
  const y = parseInt(parts[0]);
  const m = parseInt(parts[1]);
  const startDate = new Date(y, m, 18);
  const endDate = new Date(y, m + 1, 17);
  const months = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  return `${startDate.getDate()} ${months[startDate.getMonth()]} — ${endDate.getDate()} ${months[endDate.getMonth()]} ${endDate.getFullYear()}`;
}

function daysUntilReset() {
  const now = new Date();
  const day = now.getDate();
  let reset;
  if (day < 18) {
    reset = new Date(now.getFullYear(), now.getMonth(), 18);
  } else {
    reset = new Date(now.getFullYear(), now.getMonth() + 1, 18);
  }
  return Math.ceil((reset - now) / (1000 * 60 * 60 * 24));
}

const ICONS = ["📊", "🌐", "🎬", "📝", "📧", "🎨", "📱", "🔧", "📞", "💡", "📦", "🖥️"];
const COLORS = ["#FF6B35", "#0E0E10", "#2A2A2D", "#6E6E72", "#FF9B73", "#CC5228", "#F5F3EE", "#EDE9E1", "#4A7C6F", "#8B7355"];

function Bar({ hours, max, color }) {
  const pct = max > 0 ? (hours / max) * 100 : 0;
  return (
    <div style={{ height: 4, borderRadius: 0, background: "rgba(255,255,255,0.06)", overflow: "hidden", flex: 1 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.6s cubic-bezier(.22,1,.36,1)" }} />
    </div>
  );
}

function Ring({ total, max }) {
  const r = 58;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? total / max : 0;
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" style={{ display: "block" }}>
      <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
      <circle cx="80" cy="80" r={r} fill="none" stroke="#FF6B35" strokeWidth="10" strokeLinecap="butt"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} transform="rotate(-90 80 80)"
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.22,1,.36,1)" }} />
      <text x="80" y="72" textAnchor="middle" fill="#F5F3EE" fontSize="28" fontWeight="300" fontFamily="'DM Sans', sans-serif">{total}</text>
      <text x="80" y="96" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="10" fontWeight="500" fontFamily="'DM Sans', sans-serif" letterSpacing="2">UREN</text>
    </svg>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <div style={{ width: 32, height: 32, border: "2px solid rgba(255,255,255,0.06)", borderTopColor: "#FF6B35", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [task, setTask] = useState("");
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(0);
  const [selectedColor, setSelectedColor] = useState(0);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState(null);

  const period = getCurrentPeriod();

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("entries")
        .select("*")
        .eq("period", period)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (fetchError) throw fetchError;
      setEntries(data || []);
    } catch (e) {
      setError("Kon uren niet laden. Check je internetverbinding.");
    } finally {
      setLoading(false);
    }
  }, [period, user.id]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const totalHours = entries.reduce((s, e) => s + Number(e.hours), 0);
  const maxHours = entries.length > 0 ? Math.max(...entries.map((e) => Number(e.hours))) : 1;

  const resetForm = () => {
    setTask(""); setHours(""); setNote("");
    setSelectedIcon(0); setSelectedColor(0);
    setEditId(null); setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!task.trim() || !hours) return;
    setSaving(true);
    setError(null);
    const entry = { task: task.trim(), hours: parseFloat(hours), note: note.trim(), icon: ICONS[selectedIcon], color: COLORS[selectedColor], period, user_id: user.id };
    try {
      if (editId) {
        const { error: updateError } = await supabase.from("entries").update(entry).eq("id", editId).select();
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("entries").insert([entry]).select();
        if (insertError) throw insertError;
      }
      await fetchEntries();
      resetForm();
    } catch (e) {
      setError("Kon niet opslaan. Probeer opnieuw.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (entry) => {
    setTask(entry.task); setHours(String(entry.hours)); setNote(entry.note || "");
    setSelectedIcon(Math.max(0, ICONS.indexOf(entry.icon)));
    setSelectedColor(Math.max(0, COLORS.indexOf(entry.color)));
    setEditId(entry.id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    setError(null);
    try {
      const { error: delError } = await supabase.from("entries").delete().eq("id", id);
      if (delError) throw delError;
      setEntries(entries.filter((e) => e.id !== id));
    } catch (e) {
      setError("Kon niet verwijderen. Probeer opnieuw.");
    }
  };

  const daysLeft = daysUntilReset();

  const inp = {
    width: "100%", padding: "14px 18px", borderRadius: 2,
    border: "1px solid rgba(255,107,53,0.15)", background: "rgba(255,255,255,0.03)",
    color: "#F5F3EE", fontSize: 15, fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
    outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE", padding: "32px 24px", boxSizing: "border-box" }}>
      <style>{`
        input:focus { border-color: rgba(255,107,53,0.5) !important; }
        @media (max-width: 600px) {
          .dash-ring { flex-direction: column !important; align-items: center !important; text-align: center; gap: 16px !important; }
          .dash-ring svg { width: 120px !important; height: 120px !important; }
        }
      `}</style>

      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both", marginBottom: 4 }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, color: "#F5F3EE", letterSpacing: "-0.01em" }}>Uren</div>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6E6E72", fontWeight: 300 }}>Periode: {getPeriodLabel(period)}</p>
          </div>
          <div style={{ padding: "6px 14px", borderRadius: 2, background: daysLeft <= 3 ? "rgba(204,82,40,0.08)" : "rgba(255,255,255,0.03)", fontSize: 11, fontWeight: 500, color: daysLeft <= 3 ? "#CC5228" : "#6E6E72", marginTop: 4, whiteSpace: "nowrap", letterSpacing: 0.5 }}>
            Reset over {daysLeft} {daysLeft === 1 ? "dag" : "dagen"}
          </div>
        </div>
        <div style={{ width: 40, height: 1, background: "#FF6B35", margin: "12px 0 28px", opacity: 0.3 }} />

        {error && (
          <div style={{ margin: "0 0 16px", padding: "14px 18px", borderRadius: 2, background: "rgba(204,82,40,0.08)", border: "1px solid rgba(204,82,40,0.15)", color: "#CC5228", fontSize: 14, fontWeight: 400, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{error}</span>
            <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#CC5228", cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
        )}

        {/* Ring + Stats */}
        <div className="dash-ring" style={{ display: "flex", alignItems: "center", gap: 32, margin: "0 0 32px", animation: "fadeUp 0.6s 0.1s cubic-bezier(.22,1,.36,1) both" }}>
          <Ring total={totalHours} max={Math.max(totalHours, 40)} />
          <div>
            <div style={{ fontSize: 11, color: "#6E6E72", fontWeight: 500, marginBottom: 4, letterSpacing: 1, textTransform: "uppercase" }}>Totaal gewerkt</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 36, fontWeight: 300, color: "#FF6B35" }}>{totalHours}</span>
              <span style={{ fontSize: 14, color: "#6E6E72", fontWeight: 300 }}>uur</span>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", marginTop: 8, fontWeight: 300 }}>{entries.length} {entries.length === 1 ? "taak" : "taken"} geregistreerd</div>
          </div>
        </div>

        {/* Add button */}
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} style={{
          width: "100%", padding: "14px", borderRadius: 2, border: "1px solid rgba(255,107,53,0.2)",
          background: showForm ? "rgba(255,107,53,0.06)" : "transparent", color: "#FF6B35",
          fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          marginBottom: 16, transition: "all 0.25s ease", letterSpacing: 0.5,
          animation: "fadeUp 0.6s 0.2s cubic-bezier(.22,1,.36,1) both",
        }}>
          {showForm ? "✕ Annuleren" : "+ Uren toevoegen"}
        </button>

        {/* Form */}
        {showForm && (
          <div style={{ padding: 24, borderRadius: 2, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 20, animation: "slideDown 0.4s cubic-bezier(.22,1,.36,1) both", overflow: "hidden" }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", marginBottom: 8, display: "block", letterSpacing: 1, textTransform: "uppercase" }}>Taak / Activiteit</label>
              <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="Bijv. Website bouwen" style={inp} />
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", marginBottom: 8, display: "block", letterSpacing: 1, textTransform: "uppercase" }}>Uren</label>
                <input type="number" min="0.5" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="0" style={inp} />
              </div>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", marginBottom: 8, display: "block", letterSpacing: 1, textTransform: "uppercase" }}>Notitie (optioneel)</label>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bijv. preview website" style={inp} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", marginBottom: 8, display: "block", letterSpacing: 1, textTransform: "uppercase" }}>Icoon</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {ICONS.map((icon, i) => (
                  <button key={i} onClick={() => setSelectedIcon(i)} style={{
                    width: 38, height: 38, borderRadius: 2, border: "none",
                    background: selectedIcon === i ? "rgba(255,107,53,0.15)" : "rgba(255,255,255,0.03)",
                    fontSize: 16, cursor: "pointer", outline: selectedIcon === i ? "1px solid #FF6B35" : "none", transition: "all 0.15s",
                  }}>{icon}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", marginBottom: 8, display: "block", letterSpacing: 1, textTransform: "uppercase" }}>Kleur</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {COLORS.map((color, i) => (
                  <button key={i} onClick={() => setSelectedColor(i)} style={{
                    width: 28, height: 28, borderRadius: 2, border: "none", background: color, cursor: "pointer",
                    outline: selectedColor === i ? "2px solid #F5F3EE" : "none", outlineOffset: 2, transition: "all 0.15s",
                  }} />
                ))}
              </div>
            </div>
            <button onClick={handleSubmit} disabled={!task.trim() || !hours || saving} style={{
              width: "100%", padding: "15px", borderRadius: 2, border: "none",
              background: task.trim() && hours && !saving ? "#FF6B35" : "rgba(255,255,255,0.04)",
              color: task.trim() && hours && !saving ? "#0E0E10" : "rgba(255,255,255,0.15)",
              fontSize: 14, fontWeight: 600, cursor: task.trim() && hours && !saving ? "pointer" : "default",
              fontFamily: "'DM Sans', sans-serif", transition: "all 0.25s", letterSpacing: 0.5,
            }}>
              {saving ? "Opslaan..." : editId ? "Bijwerken" : "Toevoegen"}
            </button>
          </div>
        )}

        {loading && <Spinner />}

        {!loading && entries.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 12, height: 1, background: "#FF6B35" }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", textTransform: "uppercase", letterSpacing: 1.5 }}>Geregistreerd</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {entries.map((item) => (
                <div key={item.id} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 2,
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", transition: "all 0.25s ease",
                }}>
                  <div style={{ width: 40, height: 40, borderRadius: 2, background: `${item.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: 15, fontWeight: 500 }}>{item.task}</span>
                        {item.note && <span style={{ fontSize: 12, color: "#6E6E72", marginLeft: 8, fontWeight: 300 }}>{item.note}</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: item.color }}>{item.hours}u</span>
                        <button onClick={() => handleEdit(item)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", fontSize: 14, padding: 4 }}>✏️</button>
                        <button onClick={() => handleDelete(item.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", fontSize: 14, padding: 4 }}>🗑️</button>
                      </div>
                    </div>
                    <Bar hours={Number(item.hours)} max={maxHours} color={item.color} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && entries.length === 0 && !showForm && (
          <div style={{ padding: "48px 20px", borderRadius: 2, border: "1px solid rgba(255,255,255,0.04)", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>⏱️</div>
            <div style={{ fontSize: 15, color: "#6E6E72", fontWeight: 400 }}>Nog geen uren geregistreerd</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.15)", marginTop: 4, fontWeight: 300 }}>Klik op "Uren toevoegen" om te beginnen</div>
          </div>
        )}

        <div style={{ marginTop: 36, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", fontWeight: 300 }}>Reset: elke 18e van de maand</span>
          {entries.length > 0 && (
            <div style={{ padding: "6px 14px", borderRadius: 2, background: "rgba(255,107,53,0.06)", fontSize: 13, fontWeight: 600, color: "#FF6B35" }}>Totaal: {totalHours} uur</div>
          )}
        </div>
      </div>
    </div>
  );
}
