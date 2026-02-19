import { useState } from "react";
import { generateFlashcards } from "../api";

const COUNT_OPTIONS = [3, 5, 8, 10];

const progressCSS = `
@keyframes progressPulse {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}`;

export default function AIGeneratePanel({ folderId, onSaved }) {
  const [open, setOpen]         = useState(false);
  const [topic, setTopic]       = useState("");
  const [count, setCount]       = useState(5);
  const [loading, setLoading]   = useState(false);
  const [preview, setPreview]   = useState([]);
  const [style, setStyle]       = useState("");
  const [error, setError]       = useState("");
  const [ok, setOk]             = useState("");

  async function handleGenerate(e) {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true); setError(""); setOk(""); setPreview([]);
    try {
      const res = await generateFlashcards(folderId, topic.trim(), count);
      setPreview(res.generated ?? []);
      setStyle(res.style_detected ?? "");
      setOk(`✦ ${res.count} flashcard generate con stile "${res.style_detected}"`);
      setTopic("");
      onSaved(res.generated ?? []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <>
      <style>{progressCSS}</style>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", marginBottom: 36, overflow: "hidden",
        boxShadow: open ? "0 0 0 1px rgba(124,106,255,0.2), var(--glow)" : "none",
        transition: "box-shadow 0.3s",
      }}>
        {/* Header */}
        <div
          onClick={() => setOpen(o => !o)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 24px", cursor: "pointer",
            borderBottom: open ? "1px solid var(--border)" : "1px solid transparent",
            transition: "border-color 0.2s",
            userSelect: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg,var(--accent),var(--accent2))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
            }}>✦</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.2px" }}>Genera con AI</div>
              <div style={{ color: "var(--muted)", fontSize: 13, fontWeight: 500 }}>Llama 3 · analizza lo stile e genera flashcard coerenti</div>
            </div>
          </div>
          <div style={{ color: "var(--muted)", fontSize: 13, fontWeight: 700, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</div>
        </div>

        {open && (
          <div className="fade-in" style={{ padding: "24px" }}>
            {/* Progress bar */}
            {loading && (
              <div style={{ height: 3, background: "var(--surface2)", borderRadius: 4, overflow: "hidden", marginBottom: 20 }}>
                <div style={{
                  height: "100%", width: "30%",
                  background: "linear-gradient(90deg,var(--accent),var(--accent2))",
                  borderRadius: 4, animation: "progressPulse 1.2s ease-in-out infinite",
                }} />
              </div>
            )}

            {error && <Alert type="error">{error}</Alert>}
            {ok    && <Alert type="success">{ok}</Alert>}

            {/* Form */}
            <form onSubmit={handleGenerate} style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: style ? 16 : 0 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>Argomento</div>
                <input
                  className="input-field"
                  style={{
                    background: "var(--surface2)", border: "1px solid var(--border)",
                    borderRadius: "var(--radiusSm)", padding: "13px 16px",
                    color: "var(--text)", fontSize: 15, fontWeight: 500, outline: "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  placeholder="es: Teorema di Bayes, Reti neurali, Fotosintesi…"
                  value={topic} onChange={e => setTopic(e.target.value)} disabled={loading}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>N°</div>
                <select
                  className="input-field"
                  style={{
                    background: "var(--surface2)", border: "1px solid var(--border)",
                    borderRadius: "var(--radiusSm)", padding: "13px 14px",
                    color: "var(--text)", fontSize: 15, fontWeight: 600, outline: "none",
                    cursor: "pointer", width: 72, transition: "border-color 0.2s",
                  }}
                  value={count} onChange={e => setCount(Number(e.target.value))} disabled={loading}
                >
                  {COUNT_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <button
                className="btn-glow"
                type="submit"
                disabled={loading || !topic.trim()}
                style={{
                  background: loading || !topic.trim()
                    ? "var(--surface3)"
                    : "linear-gradient(135deg,var(--accent),#9b59ff)",
                  color: loading || !topic.trim() ? "var(--muted)" : "#fff",
                  borderRadius: "var(--radiusSm)", padding: "13px 24px",
                  fontWeight: 800, fontSize: 15, whiteSpace: "nowrap",
                  transition: "opacity 0.2s",
                }}
              >{loading ? "Generazione…" : "✦ Genera"}</button>
            </form>

            {/* Style pill */}
            {style && !loading && (
              <div className="fade-in" style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "var(--surface2)", border: "1px solid var(--border)",
                borderRadius: 20, padding: "5px 14px", fontSize: 13,
                fontWeight: 600, color: "var(--muted)", marginBottom: preview.length ? 20 : 0,
              }}>🔍 Stile: <strong style={{ color: "var(--textSub)" }}>{style}</strong></div>
            )}

            {/* Preview */}
            {preview.length > 0 && !loading && (
              <div className="fade-in">
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", marginBottom: 12, marginTop: 8 }}>
                  {preview.length} flashcard generate — già salvate
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {preview.map((card, i) => (
                    <div key={i}
                      className="fade-up"
                      style={{
                        background: "var(--surface2)", border: "1px solid var(--border)",
                        borderRadius: "var(--radiusSm)", padding: "14px 16px",
                        display: "flex", gap: 12,
                        animationDelay: `${i * 0.04}s`,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--accent)", minWidth: 22, paddingTop: 2 }}>
                        {String(i+1).padStart(2,"0")}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{card.front}</div>
                        <div style={{ fontSize: 14, color: "var(--muted)", fontWeight: 500 }}>{card.back}</div>
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

function Alert({ type, children }) {
  const isErr = type === "error";
  return (
    <div className="fade-in" style={{
      background: isErr ? "rgba(255,80,100,0.1)" : "rgba(80,220,130,0.1)",
      border: `1px solid ${isErr ? "rgba(255,80,100,0.3)" : "rgba(80,220,130,0.3)"}`,
      color: isErr ? "#ff8096" : "#6ae0a0",
      borderRadius: "var(--radiusSm)", padding: "11px 14px",
      fontSize: 14, fontWeight: 500, marginBottom: 16,
    }}>
      {isErr ? "⚠ " : "✓ "}{children}
    </div>
  );
}