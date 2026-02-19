// ============================================================
// FolderPage.jsx — Flashcard della cartella con:
//   - retro nascosto, rivelato al click
//   - eliminazione singola flashcard con conferma
// ============================================================
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getFlashcards, createFlashcard, deleteFlashcard } from "../api";

const s = {
  page: { minHeight: "100vh", background: "var(--bg)", paddingBottom: 60 },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "24px 40px",
    borderBottom: "1px solid var(--border)",
    background: "var(--surface)",
  },
  backBtn: {
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    color: "var(--muted)",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 500,
  },
  title: {
    fontFamily: "var(--font-display)",
    fontSize: 22,
    color: "var(--accent)",
    flex: 1,
  },
  studyBtn: {
    background: "linear-gradient(135deg, var(--accent), var(--accent2))",
    color: "#0f0e11",
    borderRadius: 10,
    padding: "10px 22px",
    fontWeight: 700,
    fontSize: 14,
  },
  content: { maxWidth: 860, margin: "0 auto", padding: "44px 24px" },
  sectionTitle: {
    fontFamily: "var(--font-display)",
    fontSize: 26,
    marginBottom: 24,
    color: "var(--text)",
  },
  form: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "28px",
    marginBottom: 44,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  row: { display: "flex", gap: 12 },
  col: { flex: 1, display: "flex", flexDirection: "column", gap: 6 },
  label: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--muted)",
  },
  textarea: {
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "12px 14px",
    color: "var(--text)",
    fontSize: 14,
    resize: "vertical",
    minHeight: 80,
    outline: "none",
    fontFamily: "var(--font-body)",
  },
  addBtn: {
    background: "var(--accent)",
    color: "#0f0e11",
    borderRadius: 10,
    padding: "12px 28px",
    fontWeight: 600,
    fontSize: 14,
    alignSelf: "flex-end",
  },
  cardList: { display: "flex", flexDirection: "column", gap: 14 },

  // Card con retro nascosto
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    overflow: "hidden",
    transition: "border-color 0.2s",
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    padding: "18px 20px",
    gap: 12,
  },
  cardFront: {
    flex: 1,
    fontSize: 15,
    fontWeight: 500,
  },
  revealBtn: {
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    color: "var(--muted)",
    borderRadius: 6,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "color 0.15s, border-color 0.15s",
  },
  deleteBtn: {
    background: "transparent",
    border: "none",
    color: "var(--muted)",
    fontSize: 16,
    cursor: "pointer",
    padding: "4px 6px",
    borderRadius: 6,
    lineHeight: 1,
    transition: "color 0.15s",
  },
  cardBack: {
    borderTop: "1px solid var(--border)",
    padding: "14px 20px",
    color: "var(--accent)",
    fontSize: 14,
    background: "var(--surface2)",
    animation: "fadeUp 0.2s ease both",
  },

  error: {
    background: "#3a1a20",
    border: "1px solid #7a2a35",
    color: "#ff9eb5",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    marginBottom: 20,
  },
  empty: {
    color: "var(--muted)",
    textAlign: "center",
    padding: "40px 0",
    fontSize: 15,
  },
};

export default function FolderPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cards, setCards] = useState([]);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  // Tiene traccia di quali card hanno il retro visibile (Set di _id)
  const [revealed, setRevealed] = useState(new Set());
  // Tiene traccia di quale card è in attesa di conferma eliminazione
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { loadCards(); }, [id]);

  async function loadCards() {
    setLoading(true);
    setError("");
    setRevealed(new Set());
    try {
      const data = await getFlashcards(id);
      const list = Array.isArray(data) ? data : (data.flashcards ?? []);
      setCards(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    setError("");
    try {
      await createFlashcard(id, front.trim(), back.trim());
      setFront("");
      setBack("");
      loadCards();
    } catch (err) {
      setError(err.message);
    }
  }

  function toggleReveal(cardId) {
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(cardId) ? next.delete(cardId) : next.add(cardId);
      return next;
    });
  }

  async function handleDelete(cardId) {
    // Prima pressione → chiede conferma, seconda → elimina
    if (confirmDelete !== cardId) {
      setConfirmDelete(cardId);
      return;
    }
    try {
      await deleteFlashcard(cardId);
      setConfirmDelete(null);
      setCards((prev) => prev.filter((c) => (c._id ?? c.id) !== cardId));
    } catch (err) {
      setError(err.message);
      setConfirmDelete(null);
    }
  }

  function cardId(card) {
    return card._id ?? card.id;
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate("/dashboard")}>
          ← Dashboard
        </button>
        <div style={s.title}>Cartella</div>
        <button style={s.studyBtn} onClick={() => navigate(`/study/${id}`)}>
          Studia →
        </button>
      </div>

      <div className="fade-up" style={s.content}>
        {/* ── Form aggiunta ── */}
        <h2 style={s.sectionTitle}>Aggiungi flashcard</h2>
        <form style={s.form} onSubmit={handleAdd}>
          {error && <div style={s.error}>⚠ {error}</div>}
          <div style={s.row}>
            <div style={s.col}>
              <div style={s.label}>Fronte</div>
              <textarea
                style={s.textarea}
                placeholder="Domanda o termine…"
                value={front}
                onChange={(e) => setFront(e.target.value)}
              />
            </div>
            <div style={s.col}>
              <div style={s.label}>Retro</div>
              <textarea
                style={s.textarea}
                placeholder="Risposta o definizione…"
                value={back}
                onChange={(e) => setBack(e.target.value)}
              />
            </div>
          </div>
          <button style={s.addBtn} type="submit">+ Aggiungi</button>
        </form>

        {/* ── Lista card ── */}
        <h2 style={{ ...s.sectionTitle, marginBottom: 20 }}>
          Flashcard ({cards.length})
        </h2>

        {loading ? (
          <div style={s.empty}>Caricamento…</div>
        ) : cards.length === 0 ? (
          <div style={s.empty}>Nessuna flashcard ancora. Aggiungine una sopra!</div>
        ) : (
          <div style={s.cardList}>
            {cards.map((c) => {
              const cid = cardId(c);
              const isRevealed = revealed.has(cid);
              const isConfirming = confirmDelete === cid;
              return (
                <div
                  key={cid}
                  style={{
                    ...s.card,
                    borderColor: isConfirming ? "#7a2a35" : "var(--border)",
                  }}
                  className="fade-up"
                >
                  <div style={s.cardTop}>
                    {/* Fronte */}
                    <div style={s.cardFront}>{c.front}</div>

                    {/* Bottone mostra/nascondi retro */}
                    <button
                      style={s.revealBtn}
                      onClick={() => toggleReveal(cid)}
                    >
                      {isRevealed ? "Nascondi" : "Mostra retro"}
                    </button>

                    {/* Bottone elimina (doppio click per conferma) */}
                    <button
                      style={{
                        ...s.deleteBtn,
                        color: isConfirming ? "#ff9eb5" : "var(--muted)",
                      }}
                      title={isConfirming ? "Clicca ancora per confermare" : "Elimina"}
                      onClick={() => handleDelete(cid)}
                      onMouseLeave={() => {
                        // Annulla conferma se il mouse esce
                        if (confirmDelete === cid) setConfirmDelete(null);
                      }}
                    >
                      {isConfirming ? "⚠" : "🗑"}
                    </button>
                  </div>

                  {/* Retro: visibile solo se rivelato */}
                  {isRevealed && (
                    <div style={s.cardBack}>{c.back}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}