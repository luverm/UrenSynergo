import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let avatarUrl = profile?.avatar_url || "";

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("avatars")
          .getPublicUrl(path);
        avatarUrl = publicUrl;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim(), avatar_url: avatarUrl })
        .eq("id", user.id);
      if (updateError) throw updateError;

      await refreshProfile();
      setAvatarFile(null);
      setSuccess("Profiel bijgewerkt!");
    } catch (e) {
      setError(e.message || "Kon profiel niet opslaan.");
    } finally {
      setSaving(false);
    }
  };

  const initial = (displayName || user.email?.split("@")[0] || "?").charAt(0).toUpperCase();

  const inp = {
    width: "100%", padding: "14px 18px", borderRadius: 2,
    border: "1px solid rgba(255,107,53,0.15)", background: "rgba(255,255,255,0.03)",
    color: "#F5F3EE", fontSize: 15, fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
    outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0E0E10", fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE", padding: "40px 16px", boxSizing: "border-box" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@200;300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        input:focus { border-color: rgba(255,107,53,0.5) !important; }
      `}</style>

      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both" }}>
          <button onClick={() => navigate("/")} style={{
            padding: "8px 16px", borderRadius: 2, border: "1px solid rgba(255,255,255,0.08)",
            background: "transparent", color: "#6E6E72", fontSize: 11, fontWeight: 500,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: 1, textTransform: "uppercase",
          }}>
            ← Terug
          </button>
          <button onClick={signOut} style={{
            padding: "8px 16px", borderRadius: 2, border: "1px solid rgba(255,255,255,0.08)",
            background: "transparent", color: "#6E6E72", fontSize: 11, fontWeight: 500,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: 1, textTransform: "uppercase",
          }}>
            Uitloggen
          </button>
        </div>

        {/* Header */}
        <div style={{ animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both", marginBottom: 36 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 400, color: "#F5F3EE", letterSpacing: "-0.01em" }}>Profiel</div>
          <div style={{ width: 40, height: 1, background: "#FF6B35", margin: "12px 0", opacity: 0.3 }} />
        </div>

        {/* Messages */}
        {error && (
          <div style={{ margin: "0 0 16px", padding: "14px 18px", borderRadius: 2, background: "rgba(204,82,40,0.08)", border: "1px solid rgba(204,82,40,0.15)", color: "#CC5228", fontSize: 14 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ margin: "0 0 16px", padding: "14px 18px", borderRadius: 2, background: "rgba(255,107,53,0.08)", border: "1px solid rgba(255,107,53,0.2)", color: "#FF6B35", fontSize: 14 }}>
            {success}
          </div>
        )}

        {/* Avatar */}
        <div style={{ textAlign: "center", marginBottom: 32, animation: "fadeUp 0.6s 0.1s cubic-bezier(.22,1,.36,1) both" }}>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: 100, height: 100, borderRadius: 2, margin: "0 auto 16px", cursor: "pointer",
              background: avatarPreview ? `url(${avatarPreview}) center/cover` : "rgba(255,107,53,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid rgba(255,107,53,0.2)", transition: "all 0.2s",
            }}
          >
            {!avatarPreview && (
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 36, color: "#FF6B35" }}>{initial}</span>
            )}
          </div>
          <button onClick={() => fileRef.current?.click()} style={{
            background: "none", border: "none", color: "#FF6B35", fontSize: 13, fontWeight: 400,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}>
            Foto wijzigen
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
        </div>

        {/* Form */}
        <div style={{ animation: "fadeUp 0.6s 0.15s cubic-bezier(.22,1,.36,1) both" }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", marginBottom: 8, display: "block", letterSpacing: 1, textTransform: "uppercase" }}>Weergavenaam</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Je naam" style={inp} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", marginBottom: 8, display: "block", letterSpacing: 1, textTransform: "uppercase" }}>E-mailadres</label>
            <div style={{ ...inp, background: "rgba(255,255,255,0.01)", color: "#6E6E72" }}>{user.email}</div>
          </div>

          <button onClick={handleSave} disabled={saving} style={{
            width: "100%", padding: "15px", borderRadius: 2, border: "none",
            background: !saving ? "#FF6B35" : "rgba(255,255,255,0.04)",
            color: !saving ? "#0E0E10" : "rgba(255,255,255,0.15)",
            fontSize: 14, fontWeight: 600, cursor: !saving ? "pointer" : "default",
            fontFamily: "'DM Sans', sans-serif", transition: "all 0.25s", letterSpacing: 0.5,
          }}>
            {saving ? "Opslaan..." : "Opslaan"}
          </button>
        </div>
      </div>
    </div>
  );
}
