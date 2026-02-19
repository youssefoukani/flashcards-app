// ============================================================
// JoinPage.jsx — Pagina per unirsi a una cartella con joinCode
// Rotta: /join
// ============================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { joinFolder } from "../api";

const s = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "radial-gradient(ellipse 70% 60% at 60% 20%, #1e2a40 0%, var(--bg) 70%)",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "48px 40px",
  },
  back: {
    background: "transparent",
    border: "none",
    color: "var(--muted)",
    fontSize: 13,
    marginBottom: 28,
    padding: 0,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: 30,
    color: "var(--text)",
    marginBottom: 8,
  },
  sub: { color: "var(--muted)", fontSize: 14, marginBottom: 36, lineHeight: 1.6 },
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--muted)",
    marginBottom: 10,
  },
  // Input grande stile "codice"
  codeInput: {
    width: "100%",
    background: "var(--surface2)",
    border: "2px solid var(--border)",
    borderRadius: 10,
    padding: "16px 18px",
    color: "var(--text)",
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: "0.25em",
    textTransform: "uppercase",
    textAlign: "center",
    outline: "none",
    marginBottom: 20,
    transition: "border-color 0.2s",
    fontFamily: "var(--font-body)",
  },
  btn: {
    width: "100%",
    padding: 14,
    borderRadius: 10,
    background: "var(--accent)",
    color: "#0f0e11",
    fontWeight: 700,
    fontSize: 15,
    transition: "opacity 0.2s",
  },
  error: {
    background: "#3a1a20",
    border: "1px solid #7a2a35",
    color: "#ff9eb5",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    marginBottom: 18,
  },
  success: {
    background: "#1a3a2a",
    border: "1px solid #2a6a4a",
    color: "#6be0a0",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    marginBottom: 18,
  },
};

export default function JoinPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setError(""); setSuccess(""); setLoading(true);
    try {
      const res = await joinFolder(code.trim().toUpperCase());
      const folder = res.folder;
      setSuccess(`Unito a "${folder.name}"! Reindirizzamento…`);
      setTimeout(() => navigate(`/folders/${folder._id}`), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <div className="fade-up" style={s.card}>
        <button style={s.back} onClick={() => navigate("/dashboard")}>
          ← Dashboard
        </button>

        <div style={s.title}>Unisciti a una cartella</div>
        <p style={s.sub}>
          Inserisci il codice di 7 caratteri condiviso dal proprietario della cartella.
        </p>

        {error   && <div style={s.error}>⚠ {error}</div>}
        {success && <div style={s.success}>✓ {success}</div>}

        <form onSubmit={handleJoin}>
          <label style={s.label}>Codice di accesso</label>
          <input
            style={s.codeInput}
            maxLength={7}
            placeholder="A3K9XWZ"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          <button style={s.btn} type="submit" disabled={loading || code.length < 4}>
            {loading ? "Verifica…" : "Entra nella cartella"}
          </button>
        </form>
      </div>
    </div>
  );
}