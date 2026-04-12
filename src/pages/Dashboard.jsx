import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
const COLORS = ["#006AB3", "#A0B925", "#6AAC9E", "#EF7B62", "#C9B062", "#052851", "#ECF3DA", "#2C8BE8", "#7B2CE8", "#E86B2C"];

function Bar({ hours, max, color }) {
  const pct = max > 0 ? (hours / max) * 100 : 0;
  return (
    <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden", flex: 1 }}>
      <div style={{
        width: `${pct}%`, height: "100%", borderRadius: 99,
        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
        transition: "width 0.6s cubic-bezier(.22,1,.36,1)",
      }} />
    </div>
  );
}

function Ring({ total, max }) {
  const r = 58;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? total / max : 0;
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" style={{ display: "block" }}>
      <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
      <circle cx="80" cy="80" r={r} fill="none" stroke="#A0B925" strokeWidth="12" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} transform="rotate(-90 80 80)"
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.22,1,.36,1)" }} />
      <text x="80" y="72" textAnchor="middle" fill="#fff" fontSize="28" fontWeight="800" fontFamily="'Exo 2', sans-serif">{total}</text>
      <text x="80" y="96" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="12" fontWeight="500" fontFamily="'Exo 2', sans-serif" letterSpacing="1">UREN</text>
    </svg>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <div style={{
        width: 32, height: 32, border: "3px solid rgba(255,255,255,0.1)",
        borderTopColor: "#A0B925", borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
    </div>
  );
}

export default function Dashboard() {
  const { user, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
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

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

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

    const entry = {
      task: task.trim(),
      hours: parseFloat(hours),
      note: note.trim(),
      icon: ICONS[selectedIcon],
      color: COLORS[selectedColor],
      period,
      user_id: user.id,
    };

    try {
      if (editId) {
        const { error: updateError } = await supabase
          .from("entries")
          .update(entry)
          .eq("id", editId)
          .select();
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("entries")
          .insert([entry])
          .select();
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
    setTask(entry.task);
    setHours(String(entry.hours));
    setNote(entry.note || "");
    setSelectedIcon(Math.max(0, ICONS.indexOf(entry.icon)));
    setSelectedColor(Math.max(0, COLORS.indexOf(entry.color)));
    setEditId(entry.id);
    setShowForm(true);
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
    width: "100%", padding: "12px 16px", borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
    color: "#fff", fontSize: 15, fontFamily: "'Exo 2', sans-serif",
    outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
  };

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Medewerker";

  return (
    <div style={{ minHeight: "100vh", background: "#052851", fontFamily: "'Exo 2', sans-serif", color: "#fff", padding: "40px 20px", boxSizing: "border-box" }}>
      <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideDown { from { opacity:0; max-height:0; } to { opacity:1; max-height:600px; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { border-color: rgba(0,106,179,0.5) !important; }
      `}</style>

      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        {/* User bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 99, background: "rgba(0,106,179,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#006AB3" }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{displayName}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{user.email}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {isAdmin && (
              <button onClick={() => navigate("/admin")} style={{
                padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(106,172,158,0.3)",
                background: "rgba(106,172,158,0.1)", color: "#6AAC9E", fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "'Exo 2', sans-serif",
              }}>
                Admin
              </button>
            )}
            <button onClick={signOut} style={{
              padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "'Exo 2', sans-serif",
            }}>
              Uitloggen
            </button>
          </div>
        </div>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both" }}>
          <div>
            <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: 99, background: "rgba(0,106,179,0.12)", color: "#006AB3", fontSize: 12, fontWeight: 600, letterSpacing: 1.2, marginBottom: 12, textTransform: "uppercase" }}>Urenregistratie</div>
            <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 4px", letterSpacing: -0.5, background: "linear-gradient(135deg, #fff 40%, rgba(255,255,255,0.5))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Synergo</h1>
            <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.35)" }}>Periode: {getPeriodLabel(period)}</p>
          </div>
          <div style={{ padding: "6px 12px", borderRadius: 99, background: daysLeft <= 3 ? "rgba(239,123,98,0.12)" : "rgba(255,255,255,0.04)", fontSize: 12, fontWeight: 600, color: daysLeft <= 3 ? "#EF7B62" : "rgba(255,255,255,0.35)", marginTop: 8, whiteSpace: "nowrap" }}>
            Reset over {daysLeft} {daysLeft === 1 ? "dag" : "dagen"}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{ margin: "16px 0", padding: "12px 16px", borderRadius: 10, background: "rgba(239,123,98,0.1)", border: "1px solid rgba(239,123,98,0.2)", color: "#EF7B62", fontSize: 14, fontWeight: 500, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{error}</span>
            <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#EF7B62", cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
        )}

        {/* Ring + Stats */}
        <div style={{ display: "flex", alignItems: "center", gap: 32, margin: "32px 0", animation: "fadeUp 0.6s 0.1s cubic-bezier(.22,1,.36,1) both" }}>
          <Ring total={totalHours} max={Math.max(totalHours, 40)} />
          <div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 500, marginBottom: 4 }}>Totaal gewerkt</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: "#A0B925" }}>{totalHours}</span>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>uur</span>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", marginTop: 8 }}>{entries.length} {entries.length === 1 ? "taak" : "taken"} geregistreerd</div>
          </div>
        </div>

        {/* Add button */}
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} style={{
          width: "100%", padding: "14px", borderRadius: 12, border: "1px dashed rgba(0,106,179,0.3)",
          background: showForm ? "rgba(0,106,179,0.08)" : "transparent", color: "#006AB3",
          fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'Exo 2', sans-serif",
          marginBottom: 16, transition: "all 0.25s ease", animation: "fadeUp 0.6s 0.2s cubic-bezier(.22,1,.36,1) both",
        }}>
          {showForm ? "✕ Annuleren" : "+ Uren toevoegen"}
        </button>

        {/* Form */}
        {showForm && (
          <div style={{ padding: 20, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 20, animation: "slideDown 0.4s cubic-bezier(.22,1,.36,1) both", overflow: "hidden" }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: 6, display: "block" }}>Taak / Activiteit</label>
              <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="Bijv. Website bouwen" style={inp} />
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: 6, display: "block" }}>Uren</label>
                <input type="number" min="0.5" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="0" style={inp} />
              </div>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: 6, display: "block" }}>Notitie (optioneel)</label>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bijv. preview website" style={inp} />
              </div>
            </div>
            {/* Icon picker */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: 8, display: "block" }}>Icoon</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {ICONS.map((icon, i) => (
                  <button key={i} onClick={() => setSelectedIcon(i)} style={{
                    width: 38, height: 38, borderRadius: 8, border: "none",
                    background: selectedIcon === i ? "rgba(0,106,179,0.2)" : "rgba(255,255,255,0.04)",
                    fontSize: 16, cursor: "pointer", outline: selectedIcon === i ? "2px solid #006AB3" : "none", transition: "all 0.15s",
                  }}>{icon}</button>
                ))}
              </div>
            </div>
            {/* Color picker */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: 8, display: "block" }}>Kleur</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {COLORS.map((color, i) => (
                  <button key={i} onClick={() => setSelectedColor(i)} style={{
                    width: 28, height: 28, borderRadius: 99, border: "none", background: color, cursor: "pointer",
                    outline: selectedColor === i ? "2px solid #fff" : "none", outlineOffset: 2, transition: "all 0.15s",
                  }} />
                ))}
              </div>
            </div>
            <button onClick={handleSubmit} disabled={!task.trim() || !hours || saving} style={{
              width: "100%", padding: "14px", borderRadius: 12, border: "none",
              background: task.trim() && hours && !saving ? "linear-gradient(135deg, #A0B925, #8AA01F)" : "rgba(255,255,255,0.06)",
              color: task.trim() && hours && !saving ? "#052851" : "rgba(255,255,255,0.2)",
              fontSize: 15, fontWeight: 700, cursor: task.trim() && hours && !saving ? "pointer" : "default",
              fontFamily: "'Exo 2', sans-serif", transition: "all 0.25s",
            }}>
              {saving ? "Opslaan..." : editId ? "✓ Bijwerken" : "✓ Toevoegen"}
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && <Spinner />}

        {/* Entry list */}
        {!loading && entries.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: 99, background: "#A0B925" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1 }}>Geregistreerd</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {entries.map((item) => (
                <div key={item.id} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 14,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)", transition: "all 0.25s ease",
                }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${item.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: 15, fontWeight: 600 }}>{item.task}</span>
                        {item.note && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginLeft: 8 }}>{item.note}</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: item.color }}>{item.hours}u</span>
                        <button onClick={() => handleEdit(item)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", fontSize: 14, padding: 4 }}>✏️</button>
                        <button onClick={() => handleDelete(item.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", fontSize: 14, padding: 4 }}>🗑️</button>
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
          <div style={{ padding: "40px 20px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏱️</div>
            <div style={{ fontSize: 15, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>Nog geen uren geregistreerd</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.15)", marginTop: 4 }}>Klik op "Uren toevoegen" om te beginnen</div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Reset: elke 18e van de maand</span>
          {entries.length > 0 && (
            <div style={{ padding: "6px 14px", borderRadius: 99, background: "rgba(160,185,37,0.08)", fontSize: 13, fontWeight: 700, color: "#A0B925" }}>Totaal: {totalHours} uur</div>
          )}
        </div>
      </div>
    </div>
  );
}
