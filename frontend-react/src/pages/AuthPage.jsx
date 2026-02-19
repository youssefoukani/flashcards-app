// ============================================================
// AuthPage.jsx — Login e Registrazione
// ============================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "../api";

const s = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "radial-gradient(ellipse 80% 60% at 50% 0%, #2a1f4a 0%, #0f0e11 70%)",
    padding: "24px",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "48px 40px",
  },
  logo: {
    fontFamily: "var(--font-display)",
    fontSize: 40,
    color: "var(--accent)",
    marginBottom: 8,
    letterSpacing: "-0.5px",
  },
  subtitle: {
    color: "var(--muted)",
    fontSize: 16,
    marginBottom: 36,
  },
  tabs: {
    display: "flex",
    gap: 4,
    background: "var(--surface2)",
    borderRadius: 8,
    padding: 4,
    marginBottom: 28,
  },
  tab: (active) => ({
    flex: 1,
    padding: "8px 0",
    borderRadius: 6,
    fontSize: 16,
    fontWeight: 500,
    background: active ? "var(--accent)" : "transparent",
    color: active ? "#0f0e11" : "var(--muted)",
    transition: "all 0.2s",
  }),
  label: {
    display: "block",
    fontSize: 14,
    fontWeight: 600,
    color: "var(--muted)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "12px 14px",
    color: "var(--text)",
    fontSize: 16,
    marginBottom: 18,
    outline: "none",
  },
  btn: {
    width: "100%",
    padding: "13px",
    borderRadius: 10,
    background: "var(--accent)",
    color: "#0f0e11",
    fontWeight: 600,
    fontSize: 18,
    marginTop: 4,
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
};

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Se già autenticato, vai alla dashboard
  if (localStorage.getItem("token")) {
    navigate("/dashboard");
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const fn = mode === "login" ? login : register;
      const data = await fn(email, password);

      // Il backend deve restituire { token: "..." } o { access_token: "..." }
      const token = data.token || data.access_token;
      if (!token) throw new Error("Token non ricevuto dal server");

      localStorage.setItem("token", token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <div className="fade-up" style={s.card}>
        <div style={s.logo}>Flashly</div>
        <div style={s.subtitle}>Studia meglio, ricorda di più.</div>

        {/* Tab Login / Registrati */}
        <div style={s.tabs}>
          <button style={s.tab(mode === "login")} onClick={() => setMode("login")}>
            Accedi
          </button>
          <button style={s.tab(mode === "register")} onClick={() => setMode("register")}>
            Registrati
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div style={s.error}>⚠ {error}</div>}

          <label style={s.label}>Email</label>
          <input
            style={s.input}
            type="email"
            placeholder="tu@esempio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label style={s.label}>Password</label>
          <input
            style={s.input}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? "Caricamento…" : mode === "login" ? "Entra" : "Crea account"}
          </button>
        </form>
      </div>
    </div>
  );
}