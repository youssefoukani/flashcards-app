// ============================================================
// StudyPage.jsx — Studio con algoritmo pseudocasuale backend
// Ogni card viene richiesta a POST /study/next che applica:
//   1. Priorità temporale (lastSeen + failCount)
//   2. Jitter deterministico per giorno
//   3. Pseudo-casualità pesata
//   4. Rotazione anti-pattern (daily salt)
//   5. Finestra anti-ripetizione (NO_REPEAT_WINDOW card)
// ============================================================
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getFlashcards, fetchNextCard, recordResult } from "../api";

const REPEAT_WINDOW = 3; // quante card tenere in memoria per anti-ripetizione


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
    fontSize: 16,
  },
  headerTitle: {
    fontFamily: "var(--font-display)",
    fontSize: 26,
    letterSpacing:1,
    color: "var(--accent)",
    flex: 1,
  },
  stats: { color: "var(--muted)", fontSize: 16 },
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
    fontSize: 15,
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
    fontSize: 16,
    transition: "opacity 0.2s",
  },
  btnDontKnow: {
    padding: "14px 40px",
    borderRadius: 12,
    background: "#3a1a20",
    border: "1px solid #7a2a35",
    color: "#ff9eb5",
    fontWeight: 700,
    fontSize: 16,
    transition: "opacity 0.2s",
  },
  tapHint: {
    color: "var(--muted)",
    fontSize: 16,
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
  const { id } = useParams();           // folder _id
  const navigate = useNavigate();

  const [totalCards, setTotalCards] = useState(0);  // totale card nella cartella
  const [current, setCurrent] = useState(null);      // card corrente
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [total, setTotal] = useState(0);
  const [learned, setLearned] = useState([]);        // _id card imparate
  const [recentIds, setRecentIds] = useState([]);    // finestra anti-ripetizione
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);

  // Al mount: conta le card totali e carica la prima
  useEffect(() => {
    initSession();
  }, [id]);

  async function initSession() {
    setLoading(true);
    setError("");
    try {
      // Conta le card disponibili
      const data = await getFlashcards(id);
      const list = Array.isArray(data) ? data : (data.flashcards ?? []);
      if (list.length === 0) {
        setError("Nessuna flashcard in questa cartella.");
        setLoading(false);
        return;
      }
      setTotalCards(list.length);

      // Carica la prima card dall'algoritmo backend
      const card = await fetchNextCard(id, [], []);
      setCurrent(card);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Aggiorna la finestra anti-ripetizione (mantieni ultimi REPEAT_WINDOW id)
  function updateRecentIds(cardId) {
    const updated = [...recentIds, cardId].slice(-REPEAT_WINDOW);
    setRecentIds(updated);
    return updated;
  }

  async function loadNextCard(newRecentIds, currentLearned) {
    setTransitioning(true);
    setFlipped(false);
    try {
      const card = await fetchNextCard(id, newRecentIds, currentLearned);
      setTimeout(() => {
        setCurrent(card);
        setTransitioning(false);
      }, 200);
    } catch (err) {
      setError(err.message);
      setTransitioning(false);
    }
  }

  async function handleKnow() {
    if (!flipped || !current || transitioning) return;

    const cardId = current._id;

    // Registra successo sul backend
    await recordResult(cardId, "success").catch(() => {});

    // Aggiorna card imparate (senza duplicati)
    const newLearned = learned.includes(cardId) ? learned : [...learned, cardId];
    setLearned(newLearned);
    setKnown((k) => k + 1);
    setTotal((t) => t + 1);

    // Sessione finita quando tutte le card sono state imparate almeno 1 volta
    if (newLearned.length >= totalCards) {
      setFinished(true);
      return;
    }

    const newRecent = updateRecentIds(cardId);
    await loadNextCard(newRecent, newLearned);
  }

  async function handleDontKnow() {
    if (!flipped || !current || transitioning) return;

    const cardId = current._id;

    // Registra fallimento sul backend
    await recordResult(cardId, "fail").catch(() => {});

    setTotal((t) => t + 1);

    const newRecent = updateRecentIds(cardId);
    await loadNextCard(newRecent, learned);
  }

  async function handleRestart() {
    setLearned([]);
    setRecentIds([]);
    setKnown(0);
    setTotal(0);
    setFinished(false);
    setFlipped(false);
    await loadNextCard([], []);
  }

  const progress = totalCards > 0 ? (learned.length / totalCards) * 100 : 0;

  if (loading) {
    return (
      <div style={{ ...s.page, alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "var(--muted)" }}>Caricamento…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...s.page, alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#ff9eb5" }}>⚠ {error}</span>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(`/folders/${id}`)}>
          ← Cartella
        </button>
        <div style={s.headerTitle}>Sessione di studio</div>
        <div style={s.stats}>✓ {known} / {total} corrette</div>
      </div>

      <div style={s.center} className="fade-up">
        {finished ? (
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
                Apprese: {learned.length} / {totalCards}
              </span>
            </div>
            <div style={s.progressBar}>
              <div style={s.progressFill(progress)} />
            </div>

            {/* Card flip */}
            <div
              style={{ ...s.cardContainer, opacity: transitioning ? 0.4 : 1, transition: "opacity 0.2s" }}
              onClick={() => !transitioning && setFlipped((f) => !f)}
            >
              <div style={s.cardInner(flipped)}>
                <div style={s.cardFace(false)}>
                  <div style={s.hint}>Domanda</div>
                  {current?.front}
                </div>
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
                <button style={s.btnDontKnow} onClick={handleDontKnow} disabled={transitioning}>
                  ✗ Non lo sapevo
                </button>
                <button style={s.btnKnow} onClick={handleKnow} disabled={transitioning}>
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