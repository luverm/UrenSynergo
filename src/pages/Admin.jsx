import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

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
      <div style={{ width: 32, height: 32, border: "2px solid rgba(255,255,255,0.06)", borderTopColor: "#FF6B35", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

export default function Admin() {
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

  const handleDeleteEntry = async (entryId) => {
    await supabase.from("entries").delete().eq("id", entryId);
    setEntries(entries.filter((e) => e.id !== entryId));
  };

  const handleDeleteEmployee = async (emp) => {
    if (!confirm(`Weet je zeker dat je ${emp.display_name || emp.email} wilt verwijderen? Dit verwijdert ook al hun uren.`)) return;
    await supabase.from("entries").delete().eq("user_id", emp.id);
    await supabase.from("profiles").delete().eq("id", emp.id);
    await supabase.auth.admin.deleteUser(emp.id).catch(() => {});
    setEmployees(employees.filter((e) => e.id !== emp.id));
    setEntries(entries.filter((e) => e.user_id !== emp.id));
    if (selectedEmployee?.id === emp.id) setSelectedEmployee(null);
  };

  const inp = {
    width: "100%", padding: "12px 16px", borderRadius: 2,
    border: "1px solid rgba(255,107,53,0.15)", background: "rgba(255,255,255,0.03)",
    color: "#F5F3EE", fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE", padding: "32px 24px", boxSizing: "border-box" }}>
      <style>{`@media (max-width: 600px) { .admin-stats { flex-direction: column !important; } }`}</style>

      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both", marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, margin: 0, color: "#F5F3EE", letterSpacing: "-0.01em" }}>Medewerkers Overzicht</h1>
          <div style={{ width: 40, height: 1, background: "#FF6B35", margin: "12px 0", opacity: 0.3 }} />
        </div>

        <div style={{ marginBottom: 28, animation: "fadeUp 0.6s 0.1s cubic-bezier(.22,1,.36,1) both" }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", marginBottom: 8, display: "block", letterSpacing: 1, textTransform: "uppercase" }}>Periode</label>
          <select value={period} onChange={(e) => { setPeriod(e.target.value); setSelectedEmployee(null); }} style={{ ...inp, cursor: "pointer" }}>
            {periodOptions.map((p) => (
              <option key={p.key} value={p.key} style={{ background: "#1A1A1D" }}>{p.label}</option>
            ))}
          </select>
        </div>

        {loading && <Spinner />}

        {!loading && (
          <>
            <div className="admin-stats" style={{ display: "flex", gap: 1, marginBottom: 28, animation: "fadeUp 0.6s 0.15s cubic-bezier(.22,1,.36,1) both" }}>
              <div style={{ flex: 1, padding: "20px 20px", background: "rgba(255,255,255,0.02)", borderLeft: "2px solid #FF6B35" }}>
                <div style={{ fontSize: 10, color: "#6E6E72", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>Medewerkers</div>
                <div style={{ fontSize: 28, fontWeight: 300, color: "#F5F3EE" }}>{employees.length}</div>
              </div>
              <div style={{ flex: 1, padding: "20px 20px", background: "rgba(255,255,255,0.02)", borderLeft: "2px solid #FF6B35" }}>
                <div style={{ fontSize: 10, color: "#6E6E72", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>Totaal uren</div>
                <div style={{ fontSize: 28, fontWeight: 300, color: "#FF6B35" }}>{grandTotal}</div>
              </div>
              <div style={{ flex: 1, padding: "20px 20px", background: "rgba(255,255,255,0.02)", borderLeft: "2px solid rgba(255,107,53,0.3)" }}>
                <div style={{ fontSize: 10, color: "#6E6E72", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>Registraties</div>
                <div style={{ fontSize: 28, fontWeight: 300, color: "#F5F3EE" }}>{entries.length}</div>
              </div>
            </div>

            <div style={{ animation: "fadeUp 0.6s 0.2s cubic-bezier(.22,1,.36,1) both" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 12, height: 1, background: "#FF6B35" }} />
                <span style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", textTransform: "uppercase", letterSpacing: 1.5 }}>Medewerkers</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {employees.map((emp) => {
                  const total = getEmployeeTotal(emp.id);
                  const taskCount = getEmployeeEntries(emp.id).length;
                  const isSelected = selectedEmployee?.id === emp.id;
                  return (
                    <button key={emp.id} onClick={() => setSelectedEmployee(isSelected ? null : emp)} style={{
                      display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 2,
                      background: isSelected ? "rgba(255,107,53,0.06)" : "rgba(255,255,255,0.02)",
                      border: isSelected ? "1px solid rgba(255,107,53,0.2)" : "1px solid rgba(255,255,255,0.04)",
                      cursor: "pointer", transition: "all 0.25s ease", width: "100%", textAlign: "left",
                      fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE",
                    }}>
                      <div style={{ width: 40, height: 40, borderRadius: 2, background: "rgba(255,107,53,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#FF6B35", fontFamily: "'Syne', sans-serif", flexShrink: 0 }}>
                        {(emp.display_name || emp.email.split("@")[0]).charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 500 }}>{emp.display_name || emp.email.split("@")[0]}</div>
                        <div style={{ fontSize: 12, color: "#6E6E72", fontWeight: 300 }}>{emp.email}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, display: "flex", alignItems: "center", gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 300, color: total > 0 ? "#FF6B35" : "rgba(255,255,255,0.1)" }}>{total}u</div>
                          <div style={{ fontSize: 11, color: "#6E6E72", fontWeight: 300 }}>{taskCount} {taskCount === 1 ? "taak" : "taken"}</div>
                        </div>
                        <div onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(emp); }} style={{ color: "rgba(255,255,255,0.15)", cursor: "pointer", fontSize: 14, padding: 4, transition: "color 0.15s" }} onMouseEnter={(e) => e.currentTarget.style.color = "#CC5228"} onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.15)"}>🗑️</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedEmployee && (
              <div style={{ marginTop: 24, animation: "fadeUp 0.3s cubic-bezier(.22,1,.36,1) both" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 12, height: 1, background: "#FF6B35" }} />
                  <span style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", textTransform: "uppercase", letterSpacing: 1.5 }}>
                    Uren van {selectedEmployee.display_name || selectedEmployee.email.split("@")[0]}
                  </span>
                </div>
                {selectedEntries.length === 0 ? (
                  <div style={{ padding: "24px 20px", borderRadius: 2, border: "1px solid rgba(255,255,255,0.04)", textAlign: "center" }}>
                    <div style={{ fontSize: 14, color: "#6E6E72", fontWeight: 300 }}>Geen uren geregistreerd in deze periode</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {selectedEntries.map((item) => (
                      <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 2, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                        <div style={{ width: 36, height: 36, borderRadius: 2, background: `${item.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{item.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 14, fontWeight: 500 }}>{item.task}</span>
                          {item.note && <span style={{ fontSize: 12, color: "#6E6E72", marginLeft: 8, fontWeight: 300 }}>{item.note}</span>}
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 600, color: item.color, flexShrink: 0 }}>{item.hours}u</span>
                        <button onClick={() => handleDeleteEntry(item.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.15)", cursor: "pointer", fontSize: 14, padding: 4, transition: "color 0.15s" }} onMouseEnter={(e) => e.currentTarget.style.color = "#CC5228"} onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.15)"}>🗑️</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {employees.length === 0 && (
              <div style={{ padding: "48px 20px", borderRadius: 2, border: "1px solid rgba(255,255,255,0.04)", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>👥</div>
                <div style={{ fontSize: 15, color: "#6E6E72", fontWeight: 400 }}>Nog geen medewerkers geregistreerd</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
