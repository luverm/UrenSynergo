import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <div style={{ width: 32, height: 32, border: "2px solid rgba(255,255,255,0.06)", borderTopColor: "#FF6B35", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

export default function Groups() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchGroups = async () => {
    setLoading(true);
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id, role, groups(id, name, description, owner_id, created_at)")
      .eq("user_id", user.id);

    const groupList = (memberships || []).map((m) => ({ ...m.groups, role: m.role }));
    setGroups(groupList);
    setLoading(false);
  };

  useEffect(() => { fetchGroups(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { data: group, error: createError } = await supabase
        .from("groups")
        .insert([{ name: name.trim(), description: description.trim(), owner_id: user.id }])
        .select()
        .single();
      if (createError) throw createError;

      const { error: memberError } = await supabase
        .from("group_members")
        .insert([{ group_id: group.id, user_id: user.id, role: "owner" }]);
      if (memberError) throw memberError;

      setName(""); setDescription(""); setShowForm(false);
      await fetchGroups();
    } catch (e) {
      setError(e.message || "Kon groep niet aanmaken.");
    } finally {
      setSaving(false);
    }
  };

  const inp = {
    width: "100%", padding: "14px 18px", borderRadius: 2,
    border: "1px solid rgba(255,107,53,0.15)", background: "rgba(255,255,255,0.03)",
    color: "#F5F3EE", fontSize: 15, fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
    outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE", padding: "32px 24px", boxSizing: "border-box" }}>
      <style>{`input:focus, textarea:focus { border-color: rgba(255,107,53,0.5) !important; }`}</style>

      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both", marginBottom: 28 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, color: "#F5F3EE", letterSpacing: "-0.01em" }}>Projecten</div>
          <div style={{ width: 40, height: 1, background: "#FF6B35", margin: "12px 0", opacity: 0.3 }} />
        </div>

        {error && (
          <div style={{ margin: "0 0 16px", padding: "14px 18px", borderRadius: 2, background: "rgba(204,82,40,0.08)", border: "1px solid rgba(204,82,40,0.15)", color: "#CC5228", fontSize: 14 }}>
            {error}
          </div>
        )}

        <button onClick={() => setShowForm(!showForm)} style={{
          width: "100%", padding: "14px", borderRadius: 2, border: "1px solid rgba(255,107,53,0.2)",
          background: showForm ? "rgba(255,107,53,0.06)" : "transparent", color: "#FF6B35",
          fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          marginBottom: 16, transition: "all 0.25s ease", letterSpacing: 0.5,
          animation: "fadeUp 0.6s 0.1s cubic-bezier(.22,1,.36,1) both",
        }}>
          {showForm ? "✕ Annuleren" : "+ Nieuw project"}
        </button>

        {showForm && (
          <div style={{ padding: 24, borderRadius: 2, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 20, animation: "slideDown 0.4s cubic-bezier(.22,1,.36,1) both", overflow: "hidden" }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", marginBottom: 8, display: "block", letterSpacing: 1, textTransform: "uppercase" }}>Projectnaam</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. Website Redesign" style={inp} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", marginBottom: 8, display: "block", letterSpacing: 1, textTransform: "uppercase" }}>Omschrijving (optioneel)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Korte omschrijving..." rows={3} style={{ ...inp, resize: "vertical", minHeight: 80 }} />
            </div>
            <button onClick={handleCreate} disabled={!name.trim() || saving} style={{
              width: "100%", padding: "15px", borderRadius: 2, border: "none",
              background: name.trim() && !saving ? "#FF6B35" : "rgba(255,255,255,0.04)",
              color: name.trim() && !saving ? "#0E0E10" : "rgba(255,255,255,0.15)",
              fontSize: 14, fontWeight: 600, cursor: name.trim() && !saving ? "pointer" : "default",
              fontFamily: "'DM Sans', sans-serif", transition: "all 0.25s", letterSpacing: 0.5,
            }}>
              {saving ? "Aanmaken..." : "Project aanmaken"}
            </button>
          </div>
        )}

        {loading && <Spinner />}

        {!loading && groups.length > 0 && (
          <div style={{ animation: "fadeUp 0.6s 0.15s cubic-bezier(.22,1,.36,1) both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 12, height: 1, background: "#FF6B35" }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", textTransform: "uppercase", letterSpacing: 1.5 }}>Jouw projecten</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {groups.map((group) => (
                <button key={group.id} onClick={() => navigate(`/groups/${group.id}`)} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderRadius: 2,
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
                  cursor: "pointer", transition: "all 0.25s ease", width: "100%", textAlign: "left",
                  fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE",
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 2, background: "rgba(255,107,53,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#FF6B35", fontFamily: "'Syne', sans-serif", flexShrink: 0 }}>
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 2 }}>{group.name}</div>
                    {group.description && <div style={{ fontSize: 13, color: "#6E6E72", fontWeight: 300 }}>{group.description}</div>}
                  </div>
                  <div style={{ fontSize: 11, color: "#6E6E72", textTransform: "uppercase", letterSpacing: 0.5, flexShrink: 0 }}>
                    {group.role === "owner" ? "Eigenaar" : "Lid"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && groups.length === 0 && !showForm && (
          <div style={{ padding: "48px 20px", borderRadius: 2, border: "1px solid rgba(255,255,255,0.04)", textAlign: "center", animation: "fadeUp 0.6s 0.15s cubic-bezier(.22,1,.36,1) both" }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>📁</div>
            <div style={{ fontSize: 15, color: "#6E6E72", fontWeight: 400 }}>Nog geen projecten</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.15)", marginTop: 4, fontWeight: 300 }}>Maak een project aan om te beginnen</div>
          </div>
        )}
      </div>
    </div>
  );
}
