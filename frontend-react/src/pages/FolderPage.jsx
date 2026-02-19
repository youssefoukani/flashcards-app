import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AIGeneratePanel from "./AIGeneratePanel";
import { getFolderById, getFlashcards, createFlashcard, updateFlashcard, deleteFlashcard } from "../api";

function getMyUserId() {
  try {
    const p = JSON.parse(atob(localStorage.getItem("token").split(".")[1]));
    return String(p.sub ?? p.user_id ?? p.id ?? p._id ?? "");
  } catch { return null; }
}

// Reusable styles
const pill = (color = "var(--accent)") => ({
  fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
  textTransform: "uppercase", borderRadius: 20, padding: "3px 10px",
  background: color === "var(--accent)" ? "var(--accentDim)" : "var(--surface3)",
  border: `1px solid ${color === "var(--accent)" ? "rgba(124,106,255,0.3)" : "var(--border)"}`,
  color,
});

export default function FolderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const myUserId = getMyUserId();

  const [folder, setFolder]       = useState(null);
  const [cards, setCards]         = useState([]);
  const [front, setFront]         = useState("");
  const [back, setBack]           = useState("");
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [loading, setLoading]     = useState(true);
  const [revealed, setRevealed]   = useState(new Set());
  const [editing, setEditing]     = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [copied, setCopied]       = useState(false);

  useEffect(() => { loadAll(); }, [id]);

  async function loadAll() {
    setLoading(true); setError("");
    try {
      const [fd, cd] = await Promise.all([getFolderById(id), getFlashcards(id)]);
      setFolder(fd);
      setCards(Array.isArray(cd) ? cd : (cd.flashcards ?? []));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const isMember = folder?.members?.some(m => String(m.userId) === myUserId);
  const isOwner  = folder?.members?.some(m => String(m.userId) === myUserId && m.role === "owner");
  const memberCount = folder?.members?.length ?? 0;
  const cid = c => c._id ?? c.id;

  function flash(msg) { setSuccess(msg); setTimeout(() => setSuccess(""), 2500); }

  async function handleAdd(e) {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    setError("");
    try {
      await createFlashcard(id, front.trim(), back.trim());
      setFront(""); setBack("");
      const d = await getFlashcards(id);
      setCards(Array.isArray(d) ? d : (d.flashcards ?? []));
      flash("Flashcard aggiunta!");
    } catch (e) { setError(e.message); }
  }

  async function handleSaveEdit() {
    if (!editing?.front.trim() || !editing?.back.trim()) return;
    try {
      await updateFlashcard(editing.id, editing.front.trim(), editing.back.trim());
      setCards(p => p.map(c => cid(c) === editing.id ? { ...c, ...editing } : c));
      setEditing(null); flash("Modificata!");
    } catch (e) { setError(e.message); }
  }

  async function handleDelete(cardId) {
    if (confirmDel !== cardId) { setConfirmDel(cardId); return; }
    try {
      await deleteFlashcard(cardId);
      setConfirmDel(null);
      setCards(p => p.filter(c => cid(c) !== cardId));
    } catch (e) { setError(e.message); setConfirmDel(null); }
  }

  function toggleReveal(cardId) {
    setRevealed(prev => { const n = new Set(prev); n.has(cardId) ? n.delete(cardId) : n.add(cardId); return n; });
  }

  async function copyCode() {
    await navigator.clipboard.writeText(folder.joinCode).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 80 }}>
      {/* ── Header ── */}
      <header style={{
        display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
        padding: "0 48px", minHeight: 72,
        borderBottom: "1px solid var(--border)", background: "var(--surface)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <button className="btn-ghost" onClick={() => navigate("/dashboard")} style={{
          background: "var(--surface2)", border: "1px solid var(--border)",
          color: "var(--muted)", borderRadius: "var(--radiusSm)",
          padding: "8px 16px", fontSize: 14, fontWeight: 600,
        }}>← Dashboard</button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {folder?.name ?? "…"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
            <span style={pill("var(--muted)")}>👥 {memberCount} {memberCount === 1 ? "membro" : "membri"}</span>
            {isOwner && <span style={pill()}>owner</span>}
          </div>
        </div>

        {/* Join code */}
        {folder?.joinCode && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "var(--surface2)", border: "1px solid var(--border)",
            borderRadius: "var(--radiusSm)", padding: "8px 14px",
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "var(--muted)", textTransform: "uppercase" }}>Codice invito</div>
              <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: "0.22em", color: "var(--accent)", fontFamily: "monospace" }}>{folder.joinCode}</div>
            </div>
            <button className="btn-ghost" onClick={copyCode} style={{
              background: "var(--surface3)", border: "1px solid var(--border)",
              color: copied ? "#6ae0a0" : "var(--muted)", borderRadius: 8,
              padding: "6px 12px", fontSize: 13, fontWeight: 600,
            }}>
              {copied ? "✓ Copiato" : "Copia"}
            </button>
          </div>
        )}

        <button className="btn-glow" onClick={() => navigate(`/study/${id}`)} style={{
          background: "linear-gradient(135deg,var(--accent),var(--accent2))",
          color: "#fff", borderRadius: "var(--radiusSm)",
          padding: "10px 22px", fontWeight: 800, fontSize: 15, whiteSpace: "nowrap",
        }}>Studia →</button>
      </header>

      {/* ── Content ── */}
      <main className="fade-up" style={{ maxWidth: 880, margin: "0 auto", padding: "44px 32px" }}>

        {error   && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        {/* AI Panel */}
        {isMember && (
          <AIGeneratePanel folderId={id} onSaved={(nc) => {
            setCards(p => [...p, ...nc]);
            flash(`✦ ${nc.length} flashcard AI aggiunte!`);
          }} />
        )}

        {/* Add form */}
        {isMember && (
          <section style={{ marginBottom: 48 }}>
            <SectionTitle>Aggiungi flashcard</SectionTitle>
            <form onSubmit={handleAdd} style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", padding: "28px",
              display: "flex", flexDirection: "column", gap: 16,
            }}>
              <div style={{ display: "flex", gap: 16 }}>
                {[
                  { label: "Fronte", val: front, set: setFront, ph: "Domanda o termine…" },
                  { label: "Retro",  val: back,  set: setBack,  ph: "Risposta o definizione…" },
                ].map(({ label, val, set, ph }) => (
                  <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    <Label>{label}</Label>
                    <textarea
                      className="input-field"
                      style={{
                        background: "var(--surface2)", border: "1px solid var(--border)",
                        borderRadius: "var(--radiusSm)", padding: "14px 16px",
                        color: "var(--text)", fontSize: 15, resize: "vertical",
                        minHeight: 80, outline: "none", fontFamily: "var(--font)",
                        fontWeight: 500, transition: "border-color 0.2s, box-shadow 0.2s",
                      }}
                      placeholder={ph} value={val}
                      onChange={e => set(e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <button className="btn-glow" type="submit" style={{
                background: "var(--accent)", color: "#fff",
                borderRadius: "var(--radiusSm)", padding: "12px 28px",
                fontWeight: 800, fontSize: 15, alignSelf: "flex-end",
              }}>+ Aggiungi</button>
            </form>
          </section>
        )}

        {/* Cards list */}
        <SectionTitle>Flashcard ({cards.length})</SectionTitle>

        {loading ? (
          <LoadingSpinner />
        ) : cards.length === 0 ? (
          <EmptyState>Nessuna flashcard ancora.{isMember ? " Aggiungine una sopra!" : ""}</EmptyState>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {cards.map((c, i) => {
              const cardId    = cid(c);
              const isRev     = revealed.has(cardId);
              const isEdit    = editing?.id === cardId;
              const isConfirm = confirmDel === cardId;

              return (
                <div key={cardId}
                  className={`fade-up stagger-${Math.min(i+1,5)}`}
                  style={{
                    background: "var(--surface)", borderRadius: "var(--radius)",
                    border: `1px solid ${isConfirm ? "rgba(255,80,100,0.5)" : isEdit ? "rgba(124,106,255,0.5)" : "var(--border)"}`,
                    overflow: "hidden",
                    boxShadow: isEdit ? "0 0 0 3px var(--accentDim)" : "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                >
                  {/* Card row */}
                  <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", gap: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", minWidth: 20, letterSpacing: "0.05em" }}>
                      {String(i+1).padStart(2,"0")}
                    </div>
                    <div style={{ flex: 1, fontSize: 16, fontWeight: 600 }}>{c.front}</div>

                    <button className="btn-ghost" onClick={() => toggleReveal(cardId)} style={{
                      background: "var(--surface2)", border: "1px solid var(--border)",
                      color: isRev ? "var(--accent)" : "var(--muted)",
                      borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}>
                      {isRev ? "Nascondi ▲" : "Retro ▼"}
                    </button>

                    {isMember && (
                      <>
                        <button
                          title="Modifica"
                          onClick={() => isEdit ? setEditing(null) : setEditing({ id: cardId, front: c.front, back: c.back })}
                          style={{
                            background: "transparent", border: "none", cursor: "pointer",
                            padding: "6px 8px", borderRadius: 8, fontSize: 16,
                            color: isEdit ? "var(--accent)" : "var(--muted)",
                            transition: "color 0.15s",
                          }}
                        >✏️</button>
                        <button
                          title={isConfirm ? "Conferma eliminazione" : "Elimina"}
                          onClick={() => handleDelete(cardId)}
                          onMouseLeave={() => { if (confirmDel === cardId) setConfirmDel(null); }}
                          style={{
                            background: "transparent", border: "none", cursor: "pointer",
                            padding: "6px 8px", borderRadius: 8, fontSize: 16,
                            color: isConfirm ? "#ff8096" : "var(--muted)",
                            transition: "color 0.15s",
                          }}
                        >{isConfirm ? "⚠" : "🗑"}</button>
                      </>
                    )}
                  </div>

                  {/* Retro */}
                  {isRev && !isEdit && (
                    <div className="fade-in" style={{
                      borderTop: "1px solid var(--border)",
                      padding: "14px 20px 14px 52px",
                      fontSize: 15, fontWeight: 500,
                      color: "var(--accent)",
                      background: "var(--surface2)",
                    }}>{c.back}</div>
                  )}

                  {/* Editor inline */}
                  {isEdit && (
                    <div className="fade-in" style={{
                      borderTop: "1px solid rgba(124,106,255,0.3)",
                      padding: "20px", background: "rgba(124,106,255,0.05)",
                      display: "flex", flexDirection: "column", gap: 12,
                    }}>
                      {[
                        { label: "Fronte", key: "front" },
                        { label: "Retro",  key: "back"  },
                      ].map(({ label, key }) => (
                        <div key={key}>
                          <Label>{label}</Label>
                          <input
                            className="input-field"
                            style={{
                              width: "100%", background: "var(--surface2)",
                              border: "1px solid var(--border)", borderRadius: "var(--radiusSm)",
                              padding: "12px 14px", color: "var(--text)",
                              fontSize: 15, fontWeight: 500, outline: "none",
                              marginTop: 6, transition: "border-color 0.2s, box-shadow 0.2s",
                            }}
                            value={editing[key]}
                            onChange={e => setEditing(p => ({ ...p, [key]: e.target.value }))}
                          />
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button className="btn-ghost" onClick={() => setEditing(null)} style={{
                          background: "var(--surface2)", border: "1px solid var(--border)",
                          color: "var(--muted)", borderRadius: "var(--radiusSm)",
                          padding: "9px 18px", fontSize: 14, fontWeight: 600,
                        }}>Annulla</button>
                        <button className="btn-glow" onClick={handleSaveEdit} style={{
                          background: "var(--accent)", color: "#fff",
                          borderRadius: "var(--radiusSm)", padding: "9px 22px",
                          fontSize: 14, fontWeight: 700,
                        }}>Salva</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Micro-components ─────────────────────────────────────────
function SectionTitle({ children }) {
  return <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 18, letterSpacing: "-0.3px" }}>{children}</h2>;
}
function Label({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)" }}>{children}</div>;
}
function Alert({ type, children }) {
  const isErr = type === "error";
  return (
    <div className="fade-in" style={{
      background: isErr ? "rgba(255,80,100,0.1)" : "rgba(80,220,130,0.1)",
      border: `1px solid ${isErr ? "rgba(255,80,100,0.3)" : "rgba(80,220,130,0.3)"}`,
      color: isErr ? "#ff8096" : "#6ae0a0",
      borderRadius: "var(--radiusSm)", padding: "12px 16px",
      fontSize: 15, fontWeight: 500, marginBottom: 20,
    }}>
      {isErr ? "⚠ " : "✓ "}{children}
    </div>
  );
}
function LoadingSpinner() {
  return (
    <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)", fontSize: 16 }}>
      <div style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
      Caricamento…
    </div>
  );
}
function EmptyState({ children }) {
  return <div style={{ color: "var(--muted)", textAlign: "center", padding: "60px 0", fontSize: 17, fontWeight: 500 }}>{children}</div>;
}