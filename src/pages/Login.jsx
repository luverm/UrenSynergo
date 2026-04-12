import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [emailPrefix, setEmailPrefix] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailPrefix.trim() || !password) return;

    const email = `${emailPrefix.trim().toLowerCase()}@gmail.com`;
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
    border: "1px solid rgba(200,165,92,0.2)", background: "rgba(255,255,255,0.03)",
    color: "#FAFAF8", fontSize: 15, fontFamily: "'Outfit', sans-serif", fontWeight: 300,
    outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", fontFamily: "'Outfit', sans-serif", color: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,600;1,700&family=Outfit:wght@200;300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        input:focus { border-color: rgba(200,165,92,0.5) !important; }
      `}</style>

      <div style={{ maxWidth: 400, width: "100%", animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 56, fontWeight: 400, fontStyle: "italic", color: "#FAFAF8", letterSpacing: "-0.03em", lineHeight: 1 }}>
            ELEV<span style={{ color: "#C8A55C", fontWeight: 700 }}>8</span>
          </div>
          <div style={{ width: 60, height: 1, background: "#C8A55C", margin: "16px auto", opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: 14, color: "#6B6B6B", fontWeight: 300, letterSpacing: 0.5 }}>
            {isSignUp ? "Maak een nieuw account aan" : "Log in om je uren te registreren"}
          </p>
        </div>

        {error && (
          <div style={{ margin: "0 0 16px", padding: "14px 18px", borderRadius: 2, background: "rgba(200,80,60,0.08)", border: "1px solid rgba(200,80,60,0.2)", color: "#C8503C", fontSize: 14, fontWeight: 400 }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ margin: "0 0 16px", padding: "14px 18px", borderRadius: 2, background: "rgba(200,165,92,0.08)", border: "1px solid rgba(200,165,92,0.2)", color: "#C8A55C", fontSize: 14, fontWeight: 400 }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: "#6B6B6B", marginBottom: 8, display: "block", letterSpacing: 1, textTransform: "uppercase" }}>E-mailadres</label>
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              <input
                value={emailPrefix}
                onChange={(e) => setEmailPrefix(e.target.value)}
                placeholder="voornaam"
                style={{ ...inp, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: "none", flex: 1 }}
                autoFocus
              />
              <div style={{
                padding: "14px 16px", borderRadius: "0 2px 2px 0",
                border: "1px solid rgba(200,165,92,0.2)", borderLeft: "none",
                background: "rgba(200,165,92,0.06)", color: "#6B6B6B",
                fontSize: 15, fontFamily: "'Outfit', sans-serif", fontWeight: 300, whiteSpace: "nowrap",
              }}>
                @gmail.com
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: "#6B6B6B", marginBottom: 8, display: "block", letterSpacing: 1, textTransform: "uppercase" }}>Wachtwoord</label>
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
            background: emailPrefix.trim() && password && !loading ? "#C8A55C" : "rgba(255,255,255,0.04)",
            color: emailPrefix.trim() && password && !loading ? "#0A0A0A" : "rgba(255,255,255,0.15)",
            fontSize: 14, fontWeight: 600, cursor: emailPrefix.trim() && password && !loading ? "pointer" : "default",
            fontFamily: "'Outfit', sans-serif", transition: "all 0.25s", letterSpacing: 0.5,
          }}>
            {loading ? "Laden..." : isSignUp ? "Account aanmaken" : "Inloggen"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(null); setSuccess(null); }}
            style={{ background: "none", border: "none", color: "#C8A55C", fontSize: 13, fontWeight: 400, cursor: "pointer", fontFamily: "'Outfit', sans-serif", letterSpacing: 0.3 }}
          >
            {isSignUp ? "Heb je al een account? Inloggen" : "Nog geen account? Registreren"}
          </button>
        </div>
      </div>
    </div>
  );
}
