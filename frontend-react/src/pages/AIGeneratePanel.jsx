// ============================================================
// AIGeneratePanel.jsx — Pannello generazione AI flashcard
// Props:
//   folderId  : string  — _id della cartella corrente
//   onSaved   : fn      — callback chiamata dopo il salvataggio
//                         riceve l'array di card generate
// ============================================================
import { useState } from "react";
import { generateFlashcards } from "../api";

const COUNT_OPTIONS = [3, 5, 8, 10];

const s = {
  panel: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    marginBottom: 44,
    overflow: "hidden",
  },

  // Header collassabile
  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 24px",
    cursor: "pointer",
    userSelect: "none",
    borderBottom: "1px solid transparent",
    transition: "border-color 0.2s",
  },
  panelHeaderOpen: {
    borderBottom: "1px solid var(--border)",
  },
  panelTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  sparkle: {
    fontSize: 20,
  },
  panelTitle: {
    fontFamily: "var(--font-display)",
    fontSize: 18,
    color: "var(--accent)",
  },
  panelSub: {
    fontSize: 12,
    color: "var(--muted)",
    marginTop: 2,
  },
  chevron: (open) => ({
    color: "var(--muted)",
    fontSize: 13,
    transform: open ? "rotate(180deg)" : "rotate(0deg)",
    transition: "transform 0.2s",
  }),

  // Body
  body: {
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },

  row: { display: "flex", gap: 12, alignItems: "flex-end" },
  col: { display: "flex", flexDirection: "column", gap: 6, flex: 1 },
  label: {
    fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
    textTransform: "uppercase", color: "var(--muted)",
  },
  topicInput: {
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "12px 14px",
    color: "var(--text)",
    fontSize: 15,
    outline: "none",
    fontFamily: "var(--font-body)",
    flex: 1,
  },
  countSelect: {
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "12px 14px",
    color: "var(--text)",
    fontSize: 15,
    outline: "none",
    cursor: "pointer",
    width: 80,
  },
  generateBtn: (loading) => ({
    background: loading
      ? "var(--surface2)"
      : "linear-gradient(135deg, var(--accent), var(--accent2))",
    color: loading ? "var(--muted)" : "#0f0e11",
    borderRadius: 10,
    padding: "12px 28px",
    fontWeight: 700,
    fontSize: 14,
    whiteSpace: "nowrap",
    transition: "opacity 0.2s",
    cursor: loading ? "not-allowed" : "pointer",
  }),

  // Barra di progresso durante generazione
  progressBar: {
    height: 3,
    background: "var(--surface2)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, var(--accent), var(--accent2))",
    animation: "progressSlide 1.4s ease-in-out infinite",
    width: "40%",
  },

  // Stile rilevato
  stylePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: 12,
    color: "var(--muted)",
  },

  // Preview delle card generate
  previewSection: {
    borderTop: "1px solid var(--border)",
    paddingTop: 18,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text)",
    marginBottom: 12,
  },
  previewGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  previewCard: {
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "12px 16px",
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    animation: "fadeUp 0.3s ease both",
  },
  previewCardIndex: {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--accent)",
    minWidth: 20,
    paddingTop: 1,
  },
  previewCardContent: { flex: 1 },
  previewFront: { fontSize: 14, fontWeight: 500, marginBottom: 4 },
  previewBack: { fontSize: 13, color: "var(--muted)" },
  previewDivider: {
    width: 1,
    background: "var(--border)",
    alignSelf: "stretch",
    margin: "0 4px",
  },

  // Messaggi
  error: {
    background: "#3a1a20", border: "1px solid #7a2a35", color: "#ff9eb5",
    borderRadius: 8, padding: "10px 14px", fontSize: 13,
  },
  success: {
    background: "#1a3a2a", border: "1px solid #2a6a4a", color: "#6be0a0",
    borderRadius: 8, padding: "10px 14px", fontSize: 13,
  },
};

// Aggiunge il keyframe per la progress bar
const progressCSS = `
@keyframes progressSlide {
  0%   { transform: translateX(-100%); }
  50%  { transform: translateX(150%); }
  100% { transform: translateX(400%); }
}`;

export default function AIGeneratePanel({ folderId, onSaved }) {
  const [open, setOpen]             = useState(false);
  const [topic, setTopic]           = useState("");
  const [count, setCount]           = useState(5);
  const [loading, setLoading]       = useState(false);
  const [preview, setPreview]       = useState([]);   // card generate ma non ancora confermate
  const [styleDetected, setStyle]   = useState("");
  const [error, setError]           = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function handleGenerate(e) {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError("");
    setSuccessMsg("");
    setPreview([]);

    try {
      const res = await generateFlashcards(folderId, topic.trim(), count);
      setPreview(res.generated ?? []);
      setStyle(res.style_detected ?? "");
      setSuccessMsg(
        `✓ ${res.count} flashcard generate e salvate con lo stile "${res.style_detected}"`
      );
      setTopic("");
      // Notifica il parent per ricaricare la lista
      onSaved(res.generated ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{progressCSS}</style>
      <div style={s.panel}>
        {/* Header collassabile */}
        <div
          style={{
            ...s.panelHeader,
            ...(open ? s.panelHeaderOpen : {}),
          }}
          onClick={() => setOpen(o => !o)}
        >
          <div>
            <div style={s.panelTitleRow}>
              <span style={s.sparkle}>✦</span>
              <span style={s.panelTitle}>Genera con AI</span>
            </div>
            <div style={s.panelSub}>
              Llama 3 · analizza lo stile del mazzo e crea flashcard coerenti
            </div>
          </div>
          <span style={s.chevron(open)}>▼</span>
        </div>

        {/* Body — visibile solo quando aperto */}
        {open && (
          <div style={s.body}>
            {/* Barra di progresso animata */}
            {loading && (
              <div style={s.progressBar}>
                <div style={s.progressFill} />
              </div>
            )}

            {error      && <div style={s.error}>{error}</div>}
            {successMsg && <div style={s.success}>{successMsg}</div>}

            {/* Form */}
            <form style={s.row} onSubmit={handleGenerate}>
              <div style={s.col}>
                <div style={s.label}>Argomento</div>
                <input
                  style={s.topicInput}
                  placeholder="es: Teorema di Bayes, Reti neurali, Fotosintesi…"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <div style={s.label}>N°</div>
                <select
                  style={s.countSelect}
                  value={count}
                  onChange={e => setCount(Number(e.target.value))}
                  disabled={loading}
                >
                  {COUNT_OPTIONS.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <button
                style={s.generateBtn(loading)}
                type="submit"
                disabled={loading || !topic.trim()}
              >
                {loading ? "Generazione…" : "✦ Genera"}
              </button>
            </form>

            {/* Stile rilevato */}
            {styleDetected && !loading && (
              <div style={s.stylePill}>
                🔍 Stile rilevato: <strong>{styleDetected}</strong>
              </div>
            )}

            {/* Preview card generate */}
            {preview.length > 0 && !loading && (
              <div style={s.previewSection}>
                <div style={s.previewTitle}>
                  Flashcard generate ({preview.length}) — già salvate nella cartella
                </div>
                <div style={s.previewGrid}>
                  {preview.map((card, i) => (
                    <div key={i} style={{ ...s.previewCard, animationDelay: `${i * 0.05}s` }}>
                      <div style={s.previewCardIndex}>{i + 1}</div>
                      <div style={s.previewCardContent}>
                        <div style={s.previewFront}>{card.front}</div>
                        <div style={s.previewBack}>{card.back}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}