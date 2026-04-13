import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";

const BRANDS = [
  { id: "faithdrive", name: "FaithDrive", color: "#C4963D" },
  { id: "tendercards", name: "Tender Cards", color: "#2D6B4F" },
];

const STORAGE_KEY = "elev8_shopify_config";

function getConfig() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}

function saveConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export default function Settings() {
  const { isAdmin } = useAuth();
  const [config, setConfig] = useState(getConfig());
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(null);
  const [testResult, setTestResult] = useState({});

  const updateField = (brandId, field, value) => {
    setConfig((prev) => ({
      ...prev,
      [brandId]: { ...prev[brandId], [field]: value },
    }));
    setSaved(false);
  };

  const handleSave = () => {
    saveConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testConnection = async (brandId) => {
    setTesting(brandId);
    setTestResult((prev) => ({ ...prev, [brandId]: null }));

    const brand = config[brandId];
    if (!brand?.storeDomain || !brand?.accessToken) {
      setTestResult((prev) => ({ ...prev, [brandId]: { ok: false, msg: "Vul store domein en access token in" } }));
      setTesting(null);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("shopify-proxy", {
        body: {
          storeDomain: brand.storeDomain,
          accessToken: brand.accessToken,
          endpoint: "orders/count.json",
        },
      });

      if (error) throw error;

      if (data?.count !== undefined) {
        setTestResult((prev) => ({ ...prev, [brandId]: { ok: true, msg: `Verbonden! ${data.count} orders gevonden.` } }));
      } else if (data?.errors) {
        setTestResult((prev) => ({ ...prev, [brandId]: { ok: false, msg: `Shopify fout: ${data.errors}` } }));
      } else {
        setTestResult((prev) => ({ ...prev, [brandId]: { ok: true, msg: "Verbonden met Shopify!" } }));
      }
    } catch (e) {
      setTestResult((prev) => ({ ...prev, [brandId]: { ok: false, msg: e.message || "Kan niet verbinden. Controleer je credentials." } }));
    }
    setTesting(null);
  };

  const inp = {
    width: "100%", padding: "14px 18px", borderRadius: 2,
    border: "1px solid rgba(255,107,53,0.15)", background: "rgba(255,255,255,0.03)",
    color: "#F5F3EE", fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
    outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
  };

  if (!isAdmin) {
    return (
      <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE", padding: "60px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 15, color: "#6E6E72" }}>Alleen admins kunnen instellingen wijzigen</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE", padding: "32px 24px", boxSizing: "border-box" }}>
      <style>{`input:focus { border-color: rgba(255,107,53,0.5) !important; }`}</style>

      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both", marginBottom: 28 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, color: "#F5F3EE", letterSpacing: "-0.01em" }}>Instellingen</div>
          <div style={{ width: 40, height: 1, background: "#FF6B35", margin: "12px 0", opacity: 0.3 }} />
        </div>

        {/* Shopify integrations */}
        <div style={{ animation: "fadeUp 0.6s 0.1s cubic-bezier(.22,1,.36,1) both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 12, height: 1, background: "#FF6B35" }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", textTransform: "uppercase", letterSpacing: 1.5 }}>Shopify koppelingen</span>
          </div>
          <p style={{ fontSize: 13, color: "#6E6E72", fontWeight: 300, marginBottom: 20, lineHeight: 1.6 }}>
            Koppel je Shopify winkels om live verkoopdata te zien in de dashboards.
            Je hebt een <span style={{ color: "#FF6B35" }}>Custom App</span> nodig in Shopify → Settings → Apps → Develop apps.
          </p>

          {BRANDS.map((brand) => {
            const brandConfig = config[brand.id] || {};
            const result = testResult[brand.id];

            return (
              <div key={brand.id} style={{ padding: 20, borderRadius: 2, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 99, background: brand.color }} />
                  <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700 }}>{brand.name}</span>
                  {brandConfig.storeDomain && brandConfig.accessToken && (
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "rgba(76,175,125,0.12)", color: "#4CAF7D", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>Geconfigureerd</span>
                  )}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", marginBottom: 6, display: "block", letterSpacing: 1, textTransform: "uppercase" }}>Store domein</label>
                  <input
                    value={brandConfig.storeDomain || ""}
                    onChange={(e) => updateField(brand.id, "storeDomain", e.target.value)}
                    placeholder="jouw-winkel.myshopify.com"
                    style={inp}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", marginBottom: 6, display: "block", letterSpacing: 1, textTransform: "uppercase" }}>Admin API Access Token</label>
                  <input
                    type="password"
                    value={brandConfig.accessToken || ""}
                    onChange={(e) => updateField(brand.id, "accessToken", e.target.value)}
                    placeholder="shpat_xxxxxxxxxxxxx"
                    style={inp}
                  />
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={() => testConnection(brand.id)} disabled={testing === brand.id} style={{
                    padding: "10px 18px", borderRadius: 2, border: `1px solid ${brand.color}40`,
                    background: `${brand.color}12`, color: brand.color, fontSize: 12, fontWeight: 600,
                    cursor: testing === brand.id ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif",
                  }}>
                    {testing === brand.id ? "Testen..." : "Test verbinding"}
                  </button>
                  {result && (
                    <span style={{ fontSize: 12, color: result.ok ? "#4CAF7D" : "#CC5228", fontWeight: 400 }}>
                      {result.msg}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          <button onClick={handleSave} style={{
            width: "100%", padding: "15px", borderRadius: 2, border: "none",
            background: saved ? "rgba(76,175,125,0.15)" : "#FF6B35",
            color: saved ? "#4CAF7D" : "#0E0E10",
            fontSize: 14, fontWeight: 600, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", transition: "all 0.25s", letterSpacing: 0.5,
          }}>
            {saved ? "✓ Opgeslagen" : "Opslaan"}
          </button>

          <div style={{ marginTop: 20, padding: 16, borderRadius: 2, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Hoe Shopify koppelen</div>
            <ol style={{ fontSize: 13, color: "#6E6E72", fontWeight: 300, lineHeight: 1.8, paddingLeft: 16, margin: 0 }}>
              <li>Ga naar je Shopify admin → <span style={{ color: "#F5F3EE" }}>Settings → Apps → Develop apps</span></li>
              <li>Klik <span style={{ color: "#F5F3EE" }}>Create an app</span> → noem het "ELEV8 Dashboard"</li>
              <li>Ga naar <span style={{ color: "#F5F3EE" }}>Configuration → Admin API</span> → selecteer <span style={{ color: "#FF6B35" }}>read_orders</span> scope</li>
              <li>Klik <span style={{ color: "#F5F3EE" }}>Install app</span> → kopieer de <span style={{ color: "#FF6B35" }}>Admin API access token</span></li>
              <li>Vul hierboven je <span style={{ color: "#F5F3EE" }}>store domein</span> en <span style={{ color: "#F5F3EE" }}>access token</span> in</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
