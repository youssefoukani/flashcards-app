import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getFolders, createFolder, deleteFolder } from "../api";

function getMyUserId() {
  try {
    const p = JSON.parse(atob(localStorage.getItem("token").split(".")[1]));
    return String(p.sub ?? p.user_id ?? p.id ?? p._id ?? "");
  } catch { return null; }
}

export default function Dashboard() {
  const [folders, setFolders]   = useState([]);
  const [newName, setNewName]   = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(true);
  const [confirmDel, setConfirmDel] = useState(null);
  const navigate  = useNavigate();
  const myUserId  = getMyUserId();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError("");
    try {
      const d = await getFolders();
      setFolders(Array.isArray(d) ? d : (d.folders ?? []));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try { await createFolder(newName.trim()); setNewName(""); load(); }
    catch (e) { setError(e.message); }
  }

  async function handleDelete(e, fid) {
    e.stopPropagation();
    if (confirmDel !== fid) { setConfirmDel(fid); return; }
    try { await deleteFolder(fid); setConfirmDel(null); setFolders(p => p.filter(f => fid_(f) !== fid)); }
    catch (e) { setError(e.message); setConfirmDel(null); }
  }

  const fid_   = f => f._id ?? f.id;
  const owned  = f => f.members?.some(m => String(m.userId) === myUserId && m.role === "owner");
  const shared = f => (f.members?.length ?? 0) > 1;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* ── Header ── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 48px", height: 68,
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: "var(--accent)", letterSpacing: "-0.5px" }}>✦</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>Flashly</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-ghost" onClick={() => navigate("/join")} style={{
            background: "var(--surface2)", border: "1px solid var(--border)",
            color: "var(--textSub)", borderRadius: "var(--radiusSm)",
            padding: "9px 18px", fontSize: 14, fontWeight: 600,
          }}>🔗 Unisciti</button>
          <button className="btn-ghost" onClick={() => { localStorage.removeItem("token"); navigate("/"); }} style={{
            background: "transparent", border: "1px solid var(--border)",
            color: "var(--muted)", borderRadius: "var(--radiusSm)",
            padding: "9px 18px", fontSize: 14, fontWeight: 600,
          }}>Esci</button>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "56px 32px" }}>
        {/* Hero */}
        <div className="fade-up" style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-1px", marginBottom: 8 }}>
            Le tue cartelle
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 17, fontWeight: 500 }}>
            Crea un mazzo o unisciti con un codice.
          </p>
        </div>

        {/* Create form */}
        <form className="fade-up stagger-1" onSubmit={handleCreate} style={{
          display: "flex", gap: 12, marginBottom: 52,
        }}>
          <input
            className="input-field"
            style={{
              flex: 1, background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radiusSm)", padding: "14px 18px",
              color: "var(--text)", fontSize: 16, fontWeight: 500, outline: "none",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            placeholder="Nome nuova cartella…"
            value={newName} onChange={e => setNewName(e.target.value)}
          />
          <button className="btn-glow" type="submit" style={{
            background: "linear-gradient(135deg,var(--accent),#9b59ff)",
            color: "#fff", borderRadius: "var(--radiusSm)",
            padding: "14px 28px", fontWeight: 800, fontSize: 15, whiteSpace: "nowrap",
          }}>+ Crea</button>
        </form>

        {error && (
          <div className="fade-in" style={{
            background: "rgba(255,80,100,0.1)", border: "1px solid rgba(255,80,100,0.3)",
            color: "#ff8096", borderRadius: "var(--radiusSm)",
            padding: "12px 16px", fontSize: 15, marginBottom: 28, fontWeight: 500,
          }}>⚠ {error}</div>
        )}

        {loading ? (
          <div style={{ color: "var(--muted)", textAlign: "center", padding: "80px 0", fontSize: 16 }}>
            <div style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
            Caricamento…
          </div>
        ) : folders.length === 0 ? (
          <div className="fade-up" style={{
            textAlign: "center", padding: "80px 0",
            color: "var(--muted)", fontSize: 17, fontWeight: 500,
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
            Nessuna cartella ancora.<br />Creane una o unisciti con un codice!
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 20 }}>
            {folders.map((folder, i) => {
              const fid       = fid_(folder);
              const confirming = confirmDel === fid;
              const isOwned   = owned(folder);
              const isShared  = shared(folder);

              return (
                <div key={fid}
                  className={`card-hover fade-up stagger-${Math.min(i+1,5)}`}
                  onClick={() => navigate(`/folders/${fid}`)}
                  style={{
                    background: "var(--surface)", border: `1px solid ${confirming ? "rgba(255,80,100,0.5)" : "var(--border)"}`,
                    borderRadius: "var(--radius)", padding: "28px 24px 22px",
                    cursor: "pointer", position: "relative", overflow: "hidden",
                    display: "flex", flexDirection: "column",
                  }}
                >
                  {/* Top gradient bar */}
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 3,
                    background: isShared
                      ? "linear-gradient(90deg,var(--accent),var(--accent2))"
                      : "linear-gradient(90deg,var(--accent),var(--accent3))",
                  }} />

                  <div style={{ fontSize: 32, marginBottom: 14 }}>{isShared ? "📂" : "📁"}</div>
                  <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6, flex: 1, lineHeight: 1.3 }}>
                    {folder.name}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {isShared && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
                          textTransform: "uppercase", background: "var(--accentDim)",
                          border: "1px solid rgba(124,106,255,0.3)",
                          borderRadius: 20, padding: "3px 10px", color: "var(--accent)",
                        }}>👥 {folder.members.length}</span>
                      )}
                      {!isOwned && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
                          textTransform: "uppercase", background: "var(--surface3)",
                          border: "1px solid var(--border)", borderRadius: 20,
                          padding: "3px 10px", color: "var(--muted)",
                        }}>membro</span>
                      )}
                    </div>

                    {isOwned && (
                      <button
                        style={{
                          background: "transparent", border: "none", cursor: "pointer",
                          padding: "4px 6px", borderRadius: 6, fontSize: 16,
                          color: confirming ? "#ff8096" : "var(--muted)",
                          transition: "color 0.15s",
                        }}
                        title={confirming ? "Conferma" : "Elimina"}
                        onClick={e => handleDelete(e, fid)}
                        onMouseLeave={() => { if (confirmDel === fid) setConfirmDel(null); }}
                      >{confirming ? "⚠" : "🗑"}</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}