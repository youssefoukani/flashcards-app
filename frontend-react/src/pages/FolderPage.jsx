// ============================================================
// FolderPage.jsx — Gestione flashcard con supporto collaborazione
//   - Mostra joinCode (copiabile) per invitare altri
//   - Tutti i membri possono aggiungere, modificare, eliminare
//   - Retro nascosto, rivelabile al click
//   - Editor inline per modificare fronte/retro
// ============================================================
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getFolderById, getFlashcards, createFlashcard, updateFlashcard, deleteFlashcard } from "../api";

// Estrae user_id dal JWT senza librerie
function getMyUserId() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return String(payload.sub ?? payload.user_id ?? payload.id ?? payload._id ?? "");
  } catch { return null; }
}

const s = {
  page: { minHeight: "100vh", background: "var(--bg)", paddingBottom: 80 },

  header: {
    display: "flex", alignItems: "center", gap: 14,
    padding: "20px 40px", borderBottom: "1px solid var(--border)",
    background: "var(--surface)", flexWrap: "wrap",
  },
  backBtn: {
    background: "var(--surface2)", border: "1px solid var(--border)",
    color: "var(--muted)", borderRadius: 8, padding: "8px 14px", fontSize: 13,
  },
  titleBlock: { flex: 1, minWidth: 0 },
  folderName: { fontFamily: "var(--font-display)", fontSize: 22, color: "var(--accent)" },
  membersBadge: {
    display: "inline-flex", alignItems: "center", gap: 5,
    background: "var(--surface2)", border: "1px solid var(--border)",
    borderRadius: 20, padding: "3px 10px", fontSize: 12,
    color: "var(--muted)", marginTop: 4,
  },

  // joinCode pill
  codePill: {
    display: "flex", alignItems: "center", gap: 8,
    background: "var(--surface2)", border: "1px solid var(--border)",
    borderRadius: 10, padding: "8px 14px",
  },
  codeLabel: { fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted)", textTransform: "uppercase" },
  codeValue: { fontSize: 16, fontWeight: 800, letterSpacing: "0.2em", color: "var(--accent)", fontFamily: "monospace" },
  copyBtn: {
    background: "var(--surface)", border: "1px solid var(--border)",
    color: "var(--muted)", borderRadius: 6, padding: "4px 10px", fontSize: 12,
  },

  studyBtn: {
    background: "linear-gradient(135deg, var(--accent), var(--accent2))",
    color: "#0f0e11", borderRadius: 10, padding: "10px 22px", fontWeight: 700, fontSize: 14,
    whiteSpace: "nowrap",
  },

  content: { maxWidth: 860, margin: "0 auto", padding: "40px 24px" },
  sectionTitle: { fontFamily: "var(--font-display)", fontSize: 24, marginBottom: 20, color: "var(--text)" },

  // Form aggiunta
  form: {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "24px", marginBottom: 44,
    display: "flex", flexDirection: "column", gap: 14,
  },
  row: { display: "flex", gap: 12 },
  col: { flex: 1, display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" },
  textarea: {
    background: "var(--surface2)", border: "1px solid var(--border)",
    borderRadius: 8, padding: "12px 14px", color: "var(--text)", fontSize: 14,
    resize: "vertical", minHeight: 72, outline: "none", fontFamily: "var(--font-body)",
  },
  addBtn: {
    background: "var(--accent)", color: "#0f0e11", borderRadius: 10,
    padding: "11px 28px", fontWeight: 600, fontSize: 14, alignSelf: "flex-end",
  },

  // Lista card
  cardList: { display: "flex", flexDirection: "column", gap: 12 },
  card: {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", overflow: "hidden", transition: "border-color 0.2s",
  },
  cardTop: { display: "flex", alignItems: "center", padding: "16px 18px", gap: 10 },
  cardFront: { flex: 1, fontSize: 15, fontWeight: 500 },
  revealBtn: {
    background: "var(--surface2)", border: "1px solid var(--border)",
    color: "var(--muted)", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600,
    cursor: "pointer", whiteSpace: "nowrap",
  },
  iconBtn: {
    background: "transparent", border: "none", cursor: "pointer",
    padding: "4px 6px", borderRadius: 6, fontSize: 15, color: "var(--muted)",
  },
  cardBack: {
    borderTop: "1px solid var(--border)", padding: "12px 18px",
    color: "var(--accent)", fontSize: 14, background: "var(--surface2)",
    animation: "fadeUp 0.2s ease both",
  },

  // Editor inline
  editBox: {
    borderTop: "1px solid var(--border)", padding: "16px 18px",
    background: "var(--surface2)", display: "flex", flexDirection: "column", gap: 10,
  },
  editInput: {
    background: "var(--bg)", border: "1px solid var(--border)",
    borderRadius: 8, padding: "10px 12px", color: "var(--text)",
    fontSize: 14, outline: "none", fontFamily: "var(--font-body)",
    width: "100%", boxSizing: "border-box",
  },
  editActions: { display: "flex", gap: 8, justifyContent: "flex-end" },
  saveBtn: {
    background: "var(--accent)", color: "#0f0e11", borderRadius: 8,
    padding: "8px 20px", fontWeight: 600, fontSize: 13,
  },
  cancelBtn: {
    background: "var(--surface)", border: "1px solid var(--border)",
    color: "var(--muted)", borderRadius: 8, padding: "8px 16px", fontSize: 13,
  },

  error: { background: "#3a1a20", border: "1px solid #7a2a35", color: "#ff9eb5", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 },
  success: { background: "#1a3a2a", border: "1px solid #2a6a4a", color: "#6be0a0", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 },
  empty: { color: "var(--muted)", textAlign: "center", padding: "40px 0", fontSize: 15 },
};

export default function FolderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const myUserId = getMyUserId();

  const [folder, setFolder] = useState(null);
  const [cards, setCards]   = useState([]);
  const [front, setFront]   = useState("");
  const [back, setBack]     = useState("");
  const [error, setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const [revealed, setRevealed]         = useState(new Set());
  const [editing, setEditing]           = useState(null);   // { id, front, back }
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [copied, setCopied]             = useState(false);

  useEffect(() => { loadAll(); }, [id]);

  async function loadAll() {
    setLoading(true); setError("");
    try {
      const [folderData, cardsData] = await Promise.all([
        getFolderById(id),
        getFlashcards(id),
      ]);
      setFolder(folderData);
      setCards(Array.isArray(cardsData) ? cardsData : (cardsData.flashcards ?? []));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Determina se l'utente è membro (ha accesso a tutte le operazioni)
  const isMember = folder?.members?.some(m => String(m.userId) === myUserId);
  const isOwner  = folder?.members?.some(m => String(m.userId) === myUserId && m.role === "owner");
  const memberCount = folder?.members?.length ?? 0;

  // ── Flashcard CRUD ─────────────────────────────────────────

  async function handleAdd(e) {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    setError(""); setSuccess("");
    try {
      await createFlashcard(id, front.trim(), back.trim());
      setFront(""); setBack("");
      const data = await getFlashcards(id);
      setCards(Array.isArray(data) ? data : (data.flashcards ?? []));
      flash("Flashcard aggiunta!");
    } catch (err) { setError(err.message); }
  }

  async function handleSaveEdit() {
    if (!editing || !editing.front.trim() || !editing.back.trim()) return;
    setError("");
    try {
      await updateFlashcard(editing.id, editing.front.trim(), editing.back.trim());
      setCards(prev => prev.map(c => cid(c) === editing.id ? { ...c, ...editing } : c));
      setEditing(null);
      flash("Modificata!");
    } catch (err) { setError(err.message); }
  }

  async function handleDelete(cardId) {
    if (confirmDelete !== cardId) { setConfirmDelete(cardId); return; }
    try {
      await deleteFlashcard(cardId);
      setConfirmDelete(null);
      setCards(prev => prev.filter(c => cid(c) !== cardId));
    } catch (err) { setError(err.message); setConfirmDelete(null); }
  }

  // ── UI helpers ─────────────────────────────────────────────

  function cid(card) { return card._id ?? card.id; }

  function toggleReveal(cardId) {
    setRevealed(prev => {
      const next = new Set(prev);
      next.has(cardId) ? next.delete(cardId) : next.add(cardId);
      return next;
    });
  }

  function flash(msg) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 2500);
  }

  async function copyCode() {
    if (!folder?.joinCode) return;
    await navigator.clipboard.writeText(folder.joinCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate("/dashboard")}>← Dashboard</button>

        <div style={s.titleBlock}>
          <div style={s.folderName}>{folder?.name ?? "Caricamento…"}</div>
          <div style={s.membersBadge}>
            👥 {memberCount} {memberCount === 1 ? "membro" : "membri"}
            {isOwner && <span style={{ color: "var(--accent)", marginLeft: 4 }}>· owner</span>}
          </div>
        </div>

        {/* joinCode pill — visibile a tutti i membri */}
        {folder?.joinCode && (
          <div style={s.codePill}>
            <div>
              <div style={s.codeLabel}>Codice invito</div>
              <div style={s.codeValue}>{folder.joinCode}</div>
            </div>
            <button style={s.copyBtn} onClick={copyCode}>
              {copied ? "✓ Copiato" : "Copia"}
            </button>
          </div>
        )}

        <button style={s.studyBtn} onClick={() => navigate(`/study/${id}`)}>
          Studia →
        </button>
      </div>

      {/* Content */}
      <div className="fade-up" style={s.content}>
        {error   && <div style={s.error}>⚠ {error}</div>}
        {success && <div style={s.success}>✓ {success}</div>}

        {/* Form aggiunta — solo per i membri */}
        {isMember && (
          <>
            <h2 style={s.sectionTitle}>Aggiungi flashcard</h2>
            <form style={s.form} onSubmit={handleAdd}>
              <div style={s.row}>
                <div style={s.col}>
                  <div style={s.label}>Fronte</div>
                  <textarea style={s.textarea} placeholder="Domanda o termine…"
                    value={front} onChange={e => setFront(e.target.value)} />
                </div>
                <div style={s.col}>
                  <div style={s.label}>Retro</div>
                  <textarea style={s.textarea} placeholder="Risposta o definizione…"
                    value={back} onChange={e => setBack(e.target.value)} />
                </div>
              </div>
              <button style={s.addBtn} type="submit">+ Aggiungi</button>
            </form>
          </>
        )}

        {/* Lista card */}
        <h2 style={s.sectionTitle}>Flashcard ({cards.length})</h2>

        {loading ? (
          <div style={s.empty}>Caricamento…</div>
        ) : cards.length === 0 ? (
          <div style={s.empty}>
            Nessuna flashcard ancora.{isMember ? " Aggiungine una sopra!" : ""}
          </div>
        ) : (
          <div style={s.cardList}>
            {cards.map(c => {
              const cardId      = cid(c);
              const isRevealed  = revealed.has(cardId);
              const isEditing   = editing?.id === cardId;
              const isConfirm   = confirmDelete === cardId;

              return (
                <div
                  key={cardId}
                  style={{
                    ...s.card,
                    borderColor: isConfirm ? "#7a2a35" : isEditing ? "var(--accent)" : "var(--border)",
                  }}
                  className="fade-up"
                >
                  <div style={s.cardTop}>
                    <div style={s.cardFront}>{c.front}</div>

                    {/* Rivela retro */}
                    <button style={s.revealBtn} onClick={() => toggleReveal(cardId)}>
                      {isRevealed ? "Nascondi" : "Mostra retro"}
                    </button>

                    {/* Modifica e elimina — solo per i membri */}
                    {isMember && (
                      <>
                        <button
                          style={{ ...s.iconBtn, color: isEditing ? "var(--accent)" : "var(--muted)" }}
                          title="Modifica"
                          onClick={() => isEditing ? setEditing(null) : setEditing({ id: cardId, front: c.front, back: c.back })}
                        >✏️</button>
                        <button
                          style={{ ...s.iconBtn, color: isConfirm ? "#ff9eb5" : "var(--muted)" }}
                          title={isConfirm ? "Conferma eliminazione" : "Elimina"}
                          onClick={() => handleDelete(cardId)}
                          onMouseLeave={() => { if (confirmDelete === cardId) setConfirmDelete(null); }}
                        >{isConfirm ? "⚠" : "🗑"}</button>
                      </>
                    )}
                  </div>

                  {/* Retro visibile */}
                  {isRevealed && !isEditing && (
                    <div style={s.cardBack}>{c.back}</div>
                  )}

                  {/* Editor inline */}
                  {isEditing && (
                    <div style={s.editBox}>
                      <div style={s.label}>Fronte</div>
                      <input style={s.editInput} value={editing.front}
                        onChange={e => setEditing(p => ({ ...p, front: e.target.value }))} />
                      <div style={s.label}>Retro</div>
                      <input style={s.editInput} value={editing.back}
                        onChange={e => setEditing(p => ({ ...p, back: e.target.value }))} />
                      <div style={s.editActions}>
                        <button style={s.cancelBtn} onClick={() => setEditing(null)}>Annulla</button>
                        <button style={s.saveBtn} onClick={handleSaveEdit}>Salva</button>
                      </div>
                    </div>
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