import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [emailPrefix, setEmailPrefix] = useState("");
  const [domain, setDomain] = useState("@gmail.com");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailPrefix.trim() || !password) return;

    const email = `${emailPrefix.trim().toLowerCase()}${domain}`;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        setSuccess("Account aangemaakt! Controleer je e-mail om te bevestigen.");
        setIsSignUp(false);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        navigate("/");
      }
    } catch (err) {
      setError(err.message === "Invalid login credentials"
        ? "Ongeldige inloggegevens. Controleer je e-mail en wachtwoord."
        : err.message);
    } finally {
      setLoading(false);
    }
  };

  const inp = {
    width: "100%", padding: "14px 18px", borderRadius: 2,
    border: "1px solid rgba(255,107,53,0.2)", background: "rgba(255,255,255,0.03)",
    color: "#F5F3EE", fontSize: 15, fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
    outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0E0E10", backgroundImage: "url(/elev8-pattern.svg)", backgroundSize: "200px 200px", fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@200;300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        input:focus { border-color: rgba(255,107,53,0.5) !important; }
      `}</style>

      <div style={{ maxWidth: 400, width: "100%", animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <img src="/elev8-logo-tagline-dark.svg" alt="ELEV8" style={{ width: 260, margin: "0 auto", display: "block" }} />
          <div style={{ marginTop: 20 }} />
          <p style={{ margin: 0, fontSize: 14, color: "#6E6E72", fontWeight: 300, letterSpacing: 0.5 }}>
            {isSignUp ? "Maak een nieuw account aan" : "Log in om je uren te registreren"}
          </p>
        </div>

        {error && (
          <div style={{ margin: "0 0 16px", padding: "14px 18px", borderRadius: 2, background: "rgba(204,82,40,0.08)", border: "1px solid rgba(204,82,40,0.2)", color: "#CC5228", fontSize: 14, fontWeight: 400 }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ margin: "0 0 16px", padding: "14px 18px", borderRadius: 2, background: "rgba(255,107,53,0.08)", border: "1px solid rgba(255,107,53,0.2)", color: "#FF6B35", fontSize: 14, fontWeight: 400 }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", marginBottom: 8, display: "block", letterSpacing: 1, textTransform: "uppercase" }}>E-mailadres</label>
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              <input
                value={emailPrefix}
                onChange={(e) => setEmailPrefix(e.target.value)}
                placeholder="voornaam"
                style={{ ...inp, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: "none", flex: 1 }}
                autoFocus
              />
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                style={{
                  padding: "14px 16px", borderRadius: "0 2px 2px 0",
                  border: "1px solid rgba(255,107,53,0.2)", borderLeft: "none",
                  background: "rgba(255,107,53,0.06)", color: "#F5F3EE",
                  fontSize: 15, fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
                  whiteSpace: "nowrap", cursor: "pointer", outline: "none",
                }}
              >
                <option value="@gmail.com" style={{ background: "#1A1A1D" }}>@gmail.com</option>
                <option value="@synergo.com" style={{ background: "#1A1A1D" }}>@synergo.com</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", marginBottom: 8, display: "block", letterSpacing: 1, textTransform: "uppercase" }}>Wachtwoord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Wachtwoord"
              style={inp}
            />
          </div>

          <button type="submit" disabled={!emailPrefix.trim() || !password || loading} style={{
            width: "100%", padding: "15px", borderRadius: 2, border: "none",
            background: emailPrefix.trim() && password && !loading ? "#FF6B35" : "rgba(255,255,255,0.04)",
            color: emailPrefix.trim() && password && !loading ? "#0E0E10" : "rgba(255,255,255,0.15)",
            fontSize: 14, fontWeight: 600, cursor: emailPrefix.trim() && password && !loading ? "pointer" : "default",
            fontFamily: "'DM Sans', sans-serif", transition: "all 0.25s", letterSpacing: 0.5,
          }}>
            {loading ? "Laden..." : isSignUp ? "Account aanmaken" : "Inloggen"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(null); setSuccess(null); }}
            style={{ background: "none", border: "none", color: "#FF6B35", fontSize: 13, fontWeight: 400, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.3 }}
          >
            {isSignUp ? "Heb je al een account? Inloggen" : "Nog geen account? Registreren"}
          </button>
        </div>
      </div>
    </div>
  );
}
