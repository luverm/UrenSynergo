import { useState, useEffect } from "react";
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

function getPeriodOptions() {
  const periods = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 18);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}-18`;
    periods.push({ key, label: getPeriodLabel(key) });
  }
  return periods;
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <div style={{
        width: 32, height: 32, border: "3px solid rgba(255,255,255,0.1)",
        borderTopColor: "#6AAC9E", borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
    </div>
  );
}

export default function Admin() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [period, setPeriod] = useState(getCurrentPeriod());

  const periodOptions = getPeriodOptions();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [profilesRes, entriesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: true }),
        supabase.from("entries").select("*").eq("period", period),
      ]);
      setEmployees(profilesRes.data || []);
      setEntries(entriesRes.data || []);
      setLoading(false);
    };
    load();
  }, [period]);

  const getEmployeeEntries = (userId) => entries.filter((e) => e.user_id === userId);
  const getEmployeeTotal = (userId) => getEmployeeEntries(userId).reduce((s, e) => s + Number(e.hours), 0);
  const grandTotal = entries.reduce((s, e) => s + Number(e.hours), 0);

  const selectedEntries = selectedEmployee ? getEmployeeEntries(selectedEmployee.id) : [];

  const inp = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
    color: "#fff", fontSize: 14, fontFamily: "'Exo 2', sans-serif",
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#052851", fontFamily: "'Exo 2', sans-serif", color: "#fff", padding: "40px 20px", boxSizing: "border-box" }}>
      <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both" }}>
          <button onClick={() => navigate("/")} style={{
            padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "'Exo 2', sans-serif",
          }}>
            ← Terug
          </button>
          <button onClick={signOut} style={{
            padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600,
            cursor: "pointer", fontFamily: "'Exo 2', sans-serif",
          }}>
            Uitloggen
          </button>
        </div>

        {/* Header */}
        <div style={{ animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both", marginBottom: 24 }}>
          <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: 99, background: "rgba(106,172,158,0.12)", color: "#6AAC9E", fontSize: 12, fontWeight: 600, letterSpacing: 1.2, marginBottom: 12, textTransform: "uppercase" }}>Admin portaal</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 4px", letterSpacing: -0.5, background: "linear-gradient(135deg, #fff 40%, rgba(255,255,255,0.5))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Medewerkers Overzicht</h1>
        </div>

        {/* Period selector */}
        <div style={{ marginBottom: 24, animation: "fadeUp 0.6s 0.1s cubic-bezier(.22,1,.36,1) both" }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: 6, display: "block" }}>Periode</label>
          <select value={period} onChange={(e) => { setPeriod(e.target.value); setSelectedEmployee(null); }} style={{ ...inp, cursor: "pointer" }}>
            {periodOptions.map((p) => (
              <option key={p.key} value={p.key} style={{ background: "#04203F" }}>{p.label}</option>
            ))}
          </select>
        </div>

        {loading && <Spinner />}

        {!loading && (
          <>
            {/* Summary stats */}
            <div style={{ display: "flex", gap: 12, marginBottom: 24, animation: "fadeUp 0.6s 0.15s cubic-bezier(.22,1,.36,1) both" }}>
              <div style={{ flex: 1, padding: "16px 20px", borderRadius: 14, background: "rgba(106,172,158,0.06)", border: "1px solid rgba(106,172,158,0.15)" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Medewerkers</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#6AAC9E" }}>{employees.length}</div>
              </div>
              <div style={{ flex: 1, padding: "16px 20px", borderRadius: 14, background: "rgba(160,185,37,0.06)", border: "1px solid rgba(160,185,37,0.15)" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Totaal uren</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#A0B925" }}>{grandTotal}</div>
              </div>
              <div style={{ flex: 1, padding: "16px 20px", borderRadius: 14, background: "rgba(0,106,179,0.06)", border: "1px solid rgba(0,106,179,0.15)" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Registraties</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#006AB3" }}>{entries.length}</div>
              </div>
            </div>

            {/* Employee list */}
            <div style={{ animation: "fadeUp 0.6s 0.2s cubic-bezier(.22,1,.36,1) both" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: 99, background: "#6AAC9E" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1 }}>Medewerkers</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {employees.map((emp) => {
                  const total = getEmployeeTotal(emp.id);
                  const taskCount = getEmployeeEntries(emp.id).length;
                  const isSelected = selectedEmployee?.id === emp.id;

                  return (
                    <button key={emp.id} onClick={() => setSelectedEmployee(isSelected ? null : emp)} style={{
                      display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 14,
                      background: isSelected ? "rgba(106,172,158,0.08)" : "rgba(255,255,255,0.03)",
                      border: isSelected ? "1px solid rgba(106,172,158,0.25)" : "1px solid rgba(255,255,255,0.04)",
                      cursor: "pointer", transition: "all 0.25s ease", width: "100%", textAlign: "left",
                      fontFamily: "'Exo 2', sans-serif", color: "#fff",
                    }}>
                      <div style={{ width: 40, height: 40, borderRadius: 99, background: "rgba(0,106,179,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#006AB3", flexShrink: 0 }}>
                        {(emp.display_name || emp.email.split("@")[0]).charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{emp.display_name || emp.email.split("@")[0]}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{emp.email}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: total > 0 ? "#A0B925" : "rgba(255,255,255,0.15)" }}>{total}u</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{taskCount} {taskCount === 1 ? "taak" : "taken"}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected employee entries */}
            {selectedEmployee && (
              <div style={{ marginTop: 24, animation: "fadeUp 0.3s cubic-bezier(.22,1,.36,1) both" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 99, background: "#A0B925" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1 }}>
                    Uren van {selectedEmployee.display_name || selectedEmployee.email.split("@")[0]}
                  </span>
                </div>

                {selectedEntries.length === 0 ? (
                  <div style={{ padding: "24px 20px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                    <div style={{ fontSize: 14, color: "rgba(255,255,255,0.25)" }}>Geen uren geregistreerd in deze periode</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {selectedEntries.map((item) => (
                      <div key={item.id} style={{
                        display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 12,
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)",
                      }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${item.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{item.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{item.task}</span>
                          {item.note && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginLeft: 8 }}>{item.note}</span>}
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 700, color: item.color, flexShrink: 0 }}>{item.hours}u</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {employees.length === 0 && (
              <div style={{ padding: "40px 20px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
                <div style={{ fontSize: 15, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>Nog geen medewerkers geregistreerd</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
