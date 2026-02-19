import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getFlashcards, fetchNextCard, recordResult } from "../api";

const REPEAT_WINDOW = 3;

export default function StudyPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [totalCards, setTotalCards]     = useState(0);
  const [current, setCurrent]           = useState(null);
  const [flipped, setFlipped]           = useState(false);
  const [known, setKnown]               = useState(0);
  const [total, setTotal]               = useState(0);
  const [learned, setLearned]           = useState([]);
  const [recentIds, setRecentIds]       = useState([]);
  const [finished, setFinished]         = useState(false);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(true);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => { initSession(); }, [id]);

  async function initSession() {
    setLoading(true); setError("");
    try {
      const data = await getFlashcards(id);
      const list = Array.isArray(data) ? data : (data.flashcards ?? []);
      if (list.length === 0) { setError("Nessuna flashcard in questa cartella."); setLoading(false); return; }
      setTotalCards(list.length);
      const card = await fetchNextCard(id, [], []);
      setCurrent(card);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  function updateRecent(cardId) {
    const u = [...recentIds, cardId].slice(-REPEAT_WINDOW);
    setRecentIds(u); return u;
  }

  async function loadNext(recent, lrnd) {
    setTransitioning(true); setFlipped(false);
    try {
      const card = await fetchNextCard(id, recent, lrnd);
      setTimeout(() => { setCurrent(card); setTransitioning(false); }, 200);
    } catch (e) { setError(e.message); setTransitioning(false); }
  }

  async function handleKnow() {
    if (!flipped || !current || transitioning) return;
    const cardId = current._id;
    await recordResult(cardId, "success").catch(() => {});
    const nl = learned.includes(cardId) ? learned : [...learned, cardId];
    setLearned(nl); setKnown(k => k+1); setTotal(t => t+1);
    if (nl.length >= totalCards) { setFinished(true); return; }
    await loadNext(updateRecent(cardId), nl);
  }

  async function handleDontKnow() {
    if (!flipped || !current || transitioning) return;
    const cardId = current._id;
    await recordResult(cardId, "fail").catch(() => {});
    setTotal(t => t+1);
    await loadNext(updateRecent(cardId), learned);
  }

  async function handleRestart() {
    setLearned([]); setRecentIds([]); setKnown(0); setTotal(0);
    setFinished(false); setFlipped(false);
    await loadNext([], []);
  }

  const progress = totalCards > 0 ? (learned.length / totalCards) * 100 : 0;

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 36, height: 36, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span style={{ color: "var(--muted)", fontSize: 16, fontWeight: 500 }}>Caricamento…</span>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div style={{ color: "#ff8096", fontSize: 17, fontWeight: 600 }}>{error}</div>
        <button onClick={() => navigate(`/folders/${id}`)} style={{ marginTop: 24, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)", borderRadius: "var(--radiusSm)", padding: "10px 20px", fontSize: 15, fontWeight: 600 }}>← Torna alla cartella</button>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse 100% 60% at 50% -5%, #1a1040 0%, var(--bg) 60%)",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "0 48px", height: 68,
        borderBottom: "1px solid var(--border)",
        background: "rgba(17,17,24,0.8)",
        backdropFilter: "blur(12px)",
      }}>
        <button className="btn-ghost" onClick={() => navigate(`/folders/${id}`)} style={{
          background: "var(--surface2)", border: "1px solid var(--border)",
          color: "var(--muted)", borderRadius: "var(--radiusSm)",
          padding: "8px 16px", fontSize: 14, fontWeight: 600,
        }}>← Cartella</button>

        <div style={{ flex: 1, fontWeight: 800, fontSize: 18, letterSpacing: "-0.3px" }}>
          Sessione di studio
        </div>

        <div style={{
          background: "var(--surface2)", border: "1px solid var(--border)",
          borderRadius: "var(--radiusSm)", padding: "8px 16px",
          fontSize: 14, fontWeight: 700, color: "var(--textSub)",
        }}>
          ✓ <span style={{ color: "var(--accent)" }}>{known}</span> / {total}
        </div>
      </header>

      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "48px 24px",
      }} className="fade-up">

        {finished ? (
          /* ── Completamento ── */
          <div style={{ textAlign: "center", maxWidth: 480 }}>
            <div style={{ fontSize: 72, marginBottom: 20 }}>🎉</div>
            <div style={{
              fontSize: 44, fontWeight: 900, marginBottom: 12, letterSpacing: "-1px",
              background: "linear-gradient(135deg,var(--accent),var(--accent2))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Completato!</div>
            <div style={{ color: "var(--muted)", fontSize: 18, fontWeight: 500, marginBottom: 36 }}>
              {known} risposte corrette su {total}
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="btn-glow" onClick={handleRestart} style={{
                background: "linear-gradient(135deg,var(--accent),#9b59ff)",
                color: "#fff", borderRadius: "var(--radiusSm)",
                padding: "14px 32px", fontWeight: 800, fontSize: 16,
              }}>Ricomincia</button>
              <button className="btn-ghost" onClick={() => navigate("/dashboard")} style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                color: "var(--muted)", borderRadius: "var(--radiusSm)",
                padding: "14px 24px", fontWeight: 700, fontSize: 16,
              }}>Dashboard</button>
            </div>
          </div>
        ) : (
          <>
            {/* Progress */}
            <div style={{ width: "100%", maxWidth: 580, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Progressi
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--accent)" }}>
                  {learned.length} / {totalCards}
                </span>
              </div>
              <div style={{ height: 6, background: "var(--surface2)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${progress}%`,
                  background: "linear-gradient(90deg,var(--accent),var(--accent2))",
                  borderRadius: 4, transition: "width 0.5s cubic-bezier(0.16,1,0.3,1)",
                }} />
              </div>
            </div>

            {/* Flip card */}
            <div
              style={{
                width: "100%", maxWidth: 580, height: 300,
                perspective: 1200, marginTop: 28, marginBottom: 32,
                cursor: transitioning ? "wait" : "pointer",
                opacity: transitioning ? 0.5 : 1,
                transition: "opacity 0.2s",
              }}
              onClick={() => !transitioning && setFlipped(f => !f)}
            >
              <div style={{
                width: "100%", height: "100%", position: "relative",
                transformStyle: "preserve-3d",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
                transition: "transform 0.5s cubic-bezier(0.4,0,0.2,1)",
              }}>
                {[false, true].map(isBack => (
                  <div key={String(isBack)} style={{
                    position: "absolute", inset: 0,
                    background: isBack ? "var(--surface2)" : "var(--surface)",
                    border: `1px solid ${isBack ? "rgba(124,106,255,0.5)" : "var(--border)"}`,
                    borderRadius: "var(--radius)",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    padding: 40,
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: isBack ? "rotateY(180deg)" : "none",
                    boxShadow: isBack ? "var(--glow)" : "var(--shadow)",
                  }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: isBack ? "var(--accent)" : "var(--muted)",
                      marginBottom: 16,
                    }}>
                      {isBack ? "✦ Risposta" : "Domanda"}
                    </div>
                    <div style={{
                      fontSize: 22, fontWeight: 700, textAlign: "center",
                      lineHeight: 1.5,
                      color: isBack ? "var(--text)" : "var(--text)",
                    }}>
                      {isBack ? current?.back : current?.front}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!flipped ? (
              <p style={{ color: "var(--muted)", fontSize: 15, fontWeight: 500 }}>
                Clicca la card per vedere la risposta
              </p>
            ) : (
              <div style={{ display: "flex", gap: 14 }}>
                <button
                  onClick={handleDontKnow}
                  disabled={transitioning}
                  style={{
                    padding: "16px 44px", borderRadius: "var(--radiusSm)",
                    background: "rgba(255,80,100,0.12)",
                    border: "1px solid rgba(255,80,100,0.35)",
                    color: "#ff8096", fontWeight: 800, fontSize: 16,
                    transition: "transform 0.15s, box-shadow 0.15s",
                    cursor: transitioning ? "not-allowed" : "pointer",
                  }}
                  onMouseEnter={e => { if (!transitioning) e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
                >✗ Non lo sapevo</button>
                <button
                  onClick={handleKnow}
                  disabled={transitioning}
                  style={{
                    padding: "16px 44px", borderRadius: "var(--radiusSm)",
                    background: "rgba(80,220,130,0.12)",
                    border: "1px solid rgba(80,220,130,0.35)",
                    color: "#6ae0a0", fontWeight: 800, fontSize: 16,
                    transition: "transform 0.15s, box-shadow 0.15s",
                    cursor: transitioning ? "not-allowed" : "pointer",
                  }}
                  onMouseEnter={e => { if (!transitioning) e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
                >✓ Lo sapevo</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}