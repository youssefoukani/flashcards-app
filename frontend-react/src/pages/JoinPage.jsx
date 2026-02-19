import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { joinFolder } from "../api";

export default function JoinPage() {
  const navigate = useNavigate();
  const [code, setCode]       = useState("");
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setError(""); setSuccess(""); setLoading(true);
    try {
      const res    = await joinFolder(code.trim().toUpperCase());
      const folder = res.folder;
      setSuccess(`Unito a "${folder.name}"! Reindirizzamento…`);
      setTimeout(() => navigate(`/folders/${folder._id}`), 1100);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "radial-gradient(ellipse 70% 60% at 60% 20%, #1a1440 0%, var(--bg) 65%)",
      padding: 32,
    }}>
      <div className="fade-up" style={{
        width: "100%", maxWidth: 420,
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", padding: "48px 40px",
      }}>
        <button onClick={() => navigate("/dashboard")} style={{
          background: "transparent", border: "none", color: "var(--muted)",
          fontSize: 14, fontWeight: 600, marginBottom: 32, padding: 0, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
        }}>← Dashboard</button>

        <div style={{ fontSize: 32, fontWeight: 900, marginBottom: 8, letterSpacing: "-0.5px" }}>
          Unisciti 🔗
        </div>
        <p style={{ color: "var(--muted)", fontSize: 16, marginBottom: 36, lineHeight: 1.7, fontWeight: 500 }}>
          Inserisci il codice di 7 caratteri condiviso dal proprietario.
        </p>

        {error   && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <form onSubmit={handleJoin}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
            Codice di accesso
          </div>
          <input
            className="input-field"
            style={{
              width: "100%", background: "var(--surface2)",
              border: "2px solid var(--border)", borderRadius: "var(--radiusSm)",
              padding: "18px", color: "var(--text)", fontSize: 28,
              fontWeight: 900, letterSpacing: "0.28em", textTransform: "uppercase",
              textAlign: "center", outline: "none", marginBottom: 20,
              transition: "border-color 0.2s, box-shadow 0.2s",
              fontFamily: "var(--font)",
            }}
            maxLength={7} placeholder="A3K9XWZ"
            value={code} onChange={e => setCode(e.target.value.toUpperCase())}
            autoFocus autoComplete="off" spellCheck={false}
          />
          <button className="btn-glow" type="submit"
            disabled={loading || code.length < 4}
            style={{
              width: "100%", padding: 16,
              borderRadius: "var(--radiusSm)",
              background: loading || code.length < 4
                ? "var(--surface3)"
                : "linear-gradient(135deg,var(--accent),#9b59ff)",
              color: loading || code.length < 4 ? "var(--muted)" : "#fff",
              fontWeight: 800, fontSize: 16,
              transition: "opacity 0.2s",
            }}
          >{loading ? "Verifica…" : "Entra nella cartella →"}</button>
        </form>
      </div>
    </div>
  );
}

function Alert({ type, children }) {
  const isErr = type === "error";
  return (
    <div className="fade-in" style={{
      background: isErr ? "rgba(255,80,100,0.1)" : "rgba(80,220,130,0.1)",
      border: `1px solid ${isErr ? "rgba(255,80,100,0.3)" : "rgba(80,220,130,0.3)"}`,
      color: isErr ? "#ff8096" : "#6ae0a0",
      borderRadius: "var(--radiusSm)", padding: "12px 16px",
      fontSize: 14, fontWeight: 500, marginBottom: 18,
    }}>
      {isErr ? "⚠ " : "✓ "}{children}
    </div>
  );
}