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

    const email = `${emailPrefix.trim().toLowerCase()}@synergo.com`;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        setSuccess("Account aangemaakt! Je kunt nu inloggen.");
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
    width: "100%", padding: "12px 16px", borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
    color: "#fff", fontSize: 15, fontFamily: "'DM Sans', sans-serif",
    outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0E1117", fontFamily: "'DM Sans', sans-serif", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        input:focus { border-color: rgba(44,139,232,0.5) !important; }
      `}</style>

      <div style={{ maxWidth: 400, width: "100%", animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: 99, background: "rgba(44,139,232,0.12)", color: "#5BA8F0", fontSize: 12, fontWeight: 600, letterSpacing: 1.2, marginBottom: 12, textTransform: "uppercase" }}>Urenregistratie</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 4px", letterSpacing: -0.5, background: "linear-gradient(135deg, #fff 40%, rgba(255,255,255,0.5))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Synergo</h1>
          <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.35)" }}>
            {isSignUp ? "Maak een nieuw account aan" : "Log in om je uren te registreren"}
          </p>
        </div>

        {error && (
          <div style={{ margin: "0 0 16px", padding: "12px 16px", borderRadius: 10, background: "rgba(232,44,107,0.1)", border: "1px solid rgba(232,44,107,0.2)", color: "#E82C6B", fontSize: 14, fontWeight: 500 }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ margin: "0 0 16px", padding: "12px 16px", borderRadius: 10, background: "rgba(44,232,116,0.1)", border: "1px solid rgba(44,232,116,0.2)", color: "#2CE874", fontSize: 14, fontWeight: 500 }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: 6, display: "block" }}>E-mailadres</label>
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              <input
                value={emailPrefix}
                onChange={(e) => setEmailPrefix(e.target.value)}
                placeholder="voornaam"
                style={{ ...inp, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: "none", flex: 1 }}
                autoFocus
              />
              <div style={{
                padding: "12px 14px", borderRadius: "0 10px 10px 0",
                border: "1px solid rgba(255,255,255,0.1)", borderLeft: "none",
                background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)",
                fontSize: 15, fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
              }}>
                @synergo.com
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: 6, display: "block" }}>Wachtwoord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Wachtwoord"
              style={inp}
            />
          </div>

          <button type="submit" disabled={!emailPrefix.trim() || !password || loading} style={{
            width: "100%", padding: "14px", borderRadius: 12, border: "none",
            background: emailPrefix.trim() && password && !loading ? "linear-gradient(135deg, #2CE874, #1BA854)" : "rgba(255,255,255,0.06)",
            color: emailPrefix.trim() && password && !loading ? "#0E1117" : "rgba(255,255,255,0.2)",
            fontSize: 15, fontWeight: 700, cursor: emailPrefix.trim() && password && !loading ? "pointer" : "default",
            fontFamily: "'DM Sans', sans-serif", transition: "all 0.25s",
          }}>
            {loading ? "Laden..." : isSignUp ? "Account aanmaken" : "Inloggen"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(null); setSuccess(null); }}
            style={{ background: "none", border: "none", color: "#5BA8F0", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
          >
            {isSignUp ? "Heb je al een account? Inloggen" : "Nog geen account? Registreren"}
          </button>
        </div>
      </div>
    </div>
  );
}
