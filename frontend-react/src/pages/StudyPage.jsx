// ============================================================
// StudyPage.jsx — Sessione di studio con ripetizione ponderata
// ============================================================
// Logica di ripetizione:
//   - Ogni card ha un "peso" che parte da 1.
//   - "Non lo so" → peso *= 2 (più probabile rivederla presto)
//   - "Lo so"     → peso *= 0.5, min 0.1 (meno probabile rivederla subito)
//   - La prossima card viene scelta con selezione pesata casuale.
// ============================================================
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getFlashcards } from "../api";

// ── Utility: selezione pesata casuale ───────────────────────
function weightedRandom(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

const s = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(ellipse 80% 50% at 50% -10%, #1e1640 0%, var(--bg) 65%)",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "24px 40px",
    borderBottom: "1px solid var(--border)",
  },
  backBtn: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    color: "var(--muted)",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 13,
  },
  headerTitle: {
    fontFamily: "var(--font-display)",
    fontSize: 20,
    color: "var(--accent)",
    flex: 1,
  },
  stats: { color: "var(--muted)", fontSize: 13 },
  center: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 24px",
  },
  progressBar: {
    width: "100%",
    maxWidth: 560,
    height: 4,
    background: "var(--surface2)",
    borderRadius: 4,
    marginBottom: 40,
    overflow: "hidden",
  },
  progressFill: (pct) => ({
    height: "100%",
    width: `${pct}%`,
    background: "linear-gradient(90deg, var(--accent), var(--accent2))",
    transition: "width 0.4s ease",
    borderRadius: 4,
  }),
  // Card flip
  cardContainer: {
    width: "100%",
    maxWidth: 560,
    height: 280,
    perspective: 1000,
    marginBottom: 36,
    cursor: "pointer",
  },
  cardInner: (flipped) => ({
    width: "100%",
    height: "100%",
    position: "relative",
    transformStyle: "preserve-3d",
    transform: flipped ? "rotateY(180deg)" : "rotateY(0)",
    transition: "transform 0.45s cubic-bezier(0.4,0,0.2,1)",
  }),
  cardFace: (back) => ({
    position: "absolute",
    inset: 0,
    background: "var(--surface)",
    border: `1px solid ${back ? "var(--accent)" : "var(--border)"}`,
    borderRadius: "var(--radius)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 36,
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    transform: back ? "rotateY(180deg)" : "none",
    fontSize: 20,
    textAlign: "center",
    lineHeight: 1.5,
  }),
  hint: {
    color: "var(--muted)",
    fontSize: 12,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  btnRow: {
    display: "flex",
    gap: 16,
  },
  btnKnow: {
    padding: "14px 40px",
    borderRadius: 12,
    background: "#1a3a2a",
    border: "1px solid #2a6a4a",
    color: "#6be0a0",
    fontWeight: 700,
    fontSize: 15,
    transition: "opacity 0.2s",
  },
  btnDontKnow: {
    padding: "14px 40px",
    borderRadius: 12,
    background: "#3a1a20",
    border: "1px solid #7a2a35",
    color: "#ff9eb5",
    fontWeight: 700,
    fontSize: 15,
    transition: "opacity 0.2s",
  },
  tapHint: {
    color: "var(--muted)",
    fontSize: 13,
    marginBottom: 20,
  },
  finishedBox: {
    textAlign: "center",
  },
  finishedTitle: {
    fontFamily: "var(--font-display)",
    fontSize: 40,
    marginBottom: 12,
    background: "linear-gradient(135deg, var(--accent), var(--accent2))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  finishedSub: { color: "var(--muted)", fontSize: 16, marginBottom: 32 },
  restartBtn: {
    background: "var(--accent)",
    color: "#0f0e11",
    borderRadius: 10,
    padding: "13px 36px",
    fontWeight: 700,
    fontSize: 15,
    marginRight: 12,
  },
};

export default function StudyPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [deck, setDeck] = useState([]); // [{...card, weight}]
  const [current, setCurrent] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [total, setTotal] = useState(0);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Numero di round prima di considerare la sessione "finita":
  // ogni card deve essere segnata "lo so" almeno 1 volta
  const [learnedSet, setLearnedSet] = useState(new Set());

  useEffect(() => {
    loadCards();
  }, [id]);

  async function loadCards() {
    setLoading(true);
    try {
      const data = await getFlashcards(id);
      const list = Array.isArray(data) ? data : data.flashcards ?? [];
      if (list.length === 0) {
        setError("Nessuna flashcard in questa cartella.");
        setLoading(false);
        return;
      }
      // Inizializza peso 1 per ogni card
      const weighted = list.map((c) => ({ ...c, weight: 1 }));
      setDeck(weighted);
      setCurrent(weightedRandom(weighted));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function nextCard(updatedDeck) {
    setFlipped(false);
    // Piccolo timeout per permettere al flip di tornare prima
    setTimeout(() => setCurrent(weightedRandom(updatedDeck)), 200);
  }

  function handleKnow() {
    if (!flipped) return; // deve aver visto il retro
    setKnown((k) => k + 1);
    setTotal((t) => t + 1);

    const newLearned = new Set(learnedSet);
    newLearned.add(current.id);
    setLearnedSet(newLearned);

    // Abbassa il peso (imparata)
    const updated = deck.map((c) =>
      c.id === current.id ? { ...c, weight: Math.max(0.1, c.weight * 0.5) } : c
    );
    setDeck(updated);

    // Sessione finita quando tutte le card sono state imparate almeno 1 volta
    if (newLearned.size === deck.length) {
      setFinished(true);
      return;
    }

    nextCard(updated);
  }

  function handleDontKnow() {
    if (!flipped) return;
    setTotal((t) => t + 1);

    // Alza il peso (non imparata → mostrarla prima)
    const updated = deck.map((c) =>
      c.id === current.id ? { ...c, weight: c.weight * 2 } : c
    );
    setDeck(updated);
    nextCard(updated);
  }

  function handleRestart() {
    const reset = deck.map((c) => ({ ...c, weight: 1 }));
    setDeck(reset);
    setKnown(0);
    setTotal(0);
    setLearnedSet(new Set());
    setFinished(false);
    setFlipped(false);
    setCurrent(weightedRandom(reset));
  }

  const progress = deck.length > 0 ? (learnedSet.size / deck.length) * 100 : 0;

  if (loading) {
    return (
      <div style={{ ...s.page, alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "var(--muted)" }}>Caricamento…</span>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(`/folders/${id}`)}>
          ← Cartella
        </button>
        <div style={s.headerTitle}>Sessione di studio</div>
        <div style={s.stats}>
          ✓ {known} / {total} risposta corretta
        </div>
      </div>

      <div style={s.center} className="fade-up">
        {error ? (
          <div style={{ color: "#ff9eb5" }}>⚠ {error}</div>
        ) : finished ? (
          // ── Schermata completamento ──────────────────────
          <div style={s.finishedBox}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <div style={s.finishedTitle}>Sessione completata!</div>
            <div style={s.finishedSub}>
              Hai risposto correttamente a {known} domande su {total}.
            </div>
            <div>
              <button style={s.restartBtn} onClick={handleRestart}>
                Ricomincia
              </button>
              <button
                style={{ ...s.backBtn, display: "inline-block" }}
                onClick={() => navigate("/dashboard")}
              >
                Dashboard
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Barra progresso */}
            <div style={{ width: "100%", maxWidth: 560, marginBottom: 8 }}>
              <span style={s.hint}>
                Apprese: {learnedSet.size} / {deck.length}
              </span>
            </div>
            <div style={s.progressBar}>
              <div style={s.progressFill(progress)} />
            </div>

            {/* Card con flip */}
            <div style={s.cardContainer} onClick={() => setFlipped((f) => !f)}>
              <div style={s.cardInner(flipped)}>
                {/* Fronte */}
                <div style={s.cardFace(false)}>
                  <div style={s.hint}>Domanda</div>
                  {current?.front}
                </div>
                {/* Retro */}
                <div style={s.cardFace(true)}>
                  <div style={{ ...s.hint, color: "var(--accent)" }}>Risposta</div>
                  {current?.back}
                </div>
              </div>
            </div>

            {!flipped ? (
              <p style={s.tapHint}>Clicca la card per vedere la risposta</p>
            ) : (
              <div style={s.btnRow}>
                <button style={s.btnDontKnow} onClick={handleDontKnow}>
                  ✗ Non lo sapevo
                </button>
                <button style={s.btnKnow} onClick={handleKnow}>
                  ✓ Lo sapevo
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}