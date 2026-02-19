import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { login, register } from "../api";

export default function AuthPage() {
  const [mode, setMode]       = useState("login");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (localStorage.getItem("token")) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const fn   = mode === "login" ? login : register;
      const data = await fn(email, password);
      const token = data.token || data.access_token;
      if (!token) throw new Error("Token non ricevuto dal server");
      localStorage.setItem("token", token);
      navigate("/dashboard");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "radial-gradient(ellipse 90% 70% at 50% -10%, #1a1040 0%, var(--bg) 65%)",
    }}>
      {/* Left decorative panel */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px 64px",
        display: "none",
        "@media(min-width:900px)": { display: "flex" },
      }} className="fade-in">
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 24 }}>
          ✦ Flashly
        </div>
        <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.1, marginBottom: 20, color: "var(--text)" }}>
          Studia meglio.<br />
          <span style={{ background: "linear-gradient(135deg,var(--accent),var(--accent2))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Ricorda di più.
          </span>
        </div>
        <div style={{ color: "var(--muted)", fontSize: 17, lineHeight: 1.7, maxWidth: 380 }}>
          Crea mazzi di flashcard intelligenti, studia con algoritmi adattativi e collabora con i tuoi compagni.
        </div>
      </div>

      {/* Right form panel */}
      <div style={{
        width: "100%",
        maxWidth: 480,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        borderLeft: "1px solid var(--border)",
        background: "var(--surface)",
      }}>
        <div className="fade-up" style={{ width: "100%", maxWidth: 380 }}>
          {/* Logo mobile */}
          <div style={{ fontSize: 28, fontWeight: 900, color: "var(--accent)", marginBottom: 8, letterSpacing: "-0.5px" }}>
            ✦ Flashly
          </div>
          <div style={{ color: "var(--muted)", fontSize: 16, marginBottom: 40, fontWeight: 500 }}>
            {mode === "login" ? "Bentornato! Accedi al tuo account." : "Crea il tuo account gratuito."}
          </div>

          {/* Tab switcher */}
          <div style={{
            display: "flex", gap: 0,
            background: "var(--surface2)",
            borderRadius: "var(--radiusSm)",
            padding: 4,
            marginBottom: 32,
            border: "1px solid var(--border)",
          }}>
            {["login","register"].map(m => (
              <button key={m}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 8,
                  fontSize: 15, fontWeight: 700,
                  background: mode === m ? "var(--accent)" : "transparent",
                  color: mode === m ? "#fff" : "var(--muted)",
                  transition: "all 0.2s",
                  letterSpacing: "0.01em",
                }}
                onClick={() => { setMode(m); setError(""); }}
              >
                {m === "login" ? "Accedi" : "Registrati"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="fade-in" style={{
                background: "rgba(255,80,100,0.1)", border: "1px solid rgba(255,80,100,0.3)",
                color: "#ff8096", borderRadius: "var(--radiusSm)",
                padding: "12px 16px", fontSize: 14, marginBottom: 20, fontWeight: 500,
              }}>⚠ {error}</div>
            )}

            {[
              { label: "Email", type: "email", val: email, set: setEmail, ph: "tu@esempio.com" },
              { label: "Password", type: "password", val: password, set: setPassword, ph: "••••••••" },
            ].map(({ label, type, val, set, ph }) => (
              <div key={label} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                  {label}
                </div>
                <input
                  className="input-field"
                  style={{
                    width: "100%", background: "var(--surface2)",
                    border: "1px solid var(--border)", borderRadius: "var(--radiusSm)",
                    padding: "14px 16px", color: "var(--text)", fontSize: 16,
                    outline: "none", fontWeight: 500, transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  type={type} placeholder={ph} value={val}
                  onChange={e => set(e.target.value)} required
                />
              </div>
            ))}

            <button
              className="btn-glow"
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "15px",
                borderRadius: "var(--radiusSm)",
                background: loading
                  ? "var(--surface3)"
                  : "linear-gradient(135deg, var(--accent), #9b59ff)",
                color: loading ? "var(--muted)" : "#fff",
                fontWeight: 800, fontSize: 16, marginTop: 8,
                letterSpacing: "0.02em",
                transition: "opacity 0.2s",
              }}
            >
              {loading ? "Caricamento…" : mode === "login" ? "Entra →" : "Crea account →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}