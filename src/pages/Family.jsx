import { useState, useEffect } from "react";
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
      <div style={{ width: 32, height: 32, border: "2px solid rgba(255,255,255,0.06)", borderTopColor: "#FF6B35", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

export default function Family() {
  const { viewerTargetEmail } = useAuth();
  const [targetProfile, setTargetProfile] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(getCurrentPeriod());

  const periodOptions = getPeriodOptions();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      // Find target user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", viewerTargetEmail)
        .single();

      if (!profile) { setLoading(false); return; }
      setTargetProfile(profile);

      // Load entries for selected period
      const { data: entriesData } = await supabase
        .from("entries")
        .select("*")
        .eq("user_id", profile.id)
        .eq("period", period)
        .order("created_at", { ascending: true });

      setEntries(entriesData || []);
      setLoading(false);
    };
    if (viewerTargetEmail) load();
  }, [viewerTargetEmail, period]);

  const totalHours = entries.reduce((s, e) => s + Number(e.hours), 0);
  const maxHours = entries.length > 0 ? Math.max(...entries.map((e) => Number(e.hours))) : 1;

  const displayName = targetProfile?.display_name || viewerTargetEmail?.split("@")[0] || "Medewerker";

  const inp = {
    width: "100%", padding: "12px 16px", borderRadius: 2,
    border: "1px solid rgba(255,107,53,0.15)", background: "rgba(255,255,255,0.03)",
    color: "#F5F3EE", fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE", padding: "32px 24px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/elev8-8-standalone.svg" alt="" style={{ width: 20, height: 26, opacity: 0.5 }} />
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, color: "#F5F3EE", letterSpacing: "-0.01em" }}>Uren van {displayName}</div>
          </div>
          <div style={{ width: 40, height: 1, background: "#FF6B35", margin: "12px 0", opacity: 0.3 }} />
          <p style={{ fontSize: 13, color: "#6E6E72", fontWeight: 300 }}>Overzicht van gewerkte uren, taken en notities</p>
        </div>

        {/* Period selector */}
        <div style={{ marginBottom: 28, animation: "fadeUp 0.6s 0.1s cubic-bezier(.22,1,.36,1) both" }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", marginBottom: 8, display: "block", letterSpacing: 1, textTransform: "uppercase" }}>Periode</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
            {periodOptions.map((p) => (
              <option key={p.key} value={p.key} style={{ background: "#1A1A1D" }}>{p.label}</option>
            ))}
          </select>
        </div>

        {loading && <Spinner />}

        {!loading && (
          <>
            {/* Total stats */}
            <div style={{ display: "flex", gap: 1, marginBottom: 28, animation: "fadeUp 0.6s 0.15s cubic-bezier(.22,1,.36,1) both" }}>
              <div style={{ flex: 1, padding: "24px 22px", background: "rgba(255,107,53,0.06)", border: "1px solid rgba(255,107,53,0.2)" }}>
                <div style={{ fontSize: 10, color: "#6E6E72", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>Totaal gewerkt</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 42, fontWeight: 300, color: "#FF6B35", fontFamily: "'Syne', sans-serif" }}>{totalHours}</span>
                  <span style={{ fontSize: 16, color: "#6E6E72", fontWeight: 300 }}>uur</span>
                </div>
                <div style={{ fontSize: 12, color: "#6E6E72", marginTop: 4 }}>{entries.length} {entries.length === 1 ? "taak" : "taken"} geregistreerd</div>
              </div>
            </div>

            {/* Entry list */}
            {entries.length > 0 && (
              <div style={{ animation: "fadeUp 0.6s 0.2s cubic-bezier(.22,1,.36,1) both" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 12, height: 1, background: "#FF6B35" }} />
                  <span style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", textTransform: "uppercase", letterSpacing: 1.5 }}>Geregistreerde uren</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {entries.map((item) => (
                    <div key={item.id} style={{
                      display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderRadius: 2,
                      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
                    }}>
                      <div style={{ width: 44, height: 44, borderRadius: 2, background: `${item.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{item.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4, gap: 12 }}>
                          <span style={{ fontSize: 15, fontWeight: 500 }}>{item.task}</span>
                          <span style={{ fontSize: 17, fontWeight: 600, color: item.color, flexShrink: 0, fontFamily: "'Syne', sans-serif" }}>{item.hours}u</span>
                        </div>
                        {item.note && <div style={{ fontSize: 13, color: "#6E6E72", fontWeight: 300, marginTop: 4 }}>{item.note}</div>}
                        <div style={{ marginTop: 8, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ width: `${(Number(item.hours) / maxHours) * 100}%`, height: "100%", background: item.color, transition: "width 0.6s cubic-bezier(.22,1,.36,1)" }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {entries.length === 0 && (
              <div style={{ padding: "48px 20px", borderRadius: 2, border: "1px solid rgba(255,255,255,0.04)", textAlign: "center", animation: "fadeUp 0.6s 0.2s cubic-bezier(.22,1,.36,1) both" }}>
                <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>⏱️</div>
                <div style={{ fontSize: 15, color: "#6E6E72", fontWeight: 400 }}>Geen uren geregistreerd in deze periode</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.15)", marginTop: 4, fontWeight: 300 }}>Selecteer een andere periode hierboven</div>
              </div>
            )}

            {/* Footer */}
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", fontWeight: 300 }}>Periodes lopen van 18e tot 17e van de volgende maand</span>
              {entries.length > 0 && (
                <div style={{ padding: "6px 14px", borderRadius: 2, background: "rgba(255,107,53,0.08)", fontSize: 13, fontWeight: 600, color: "#FF6B35" }}>Totaal: {totalHours} uur</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
