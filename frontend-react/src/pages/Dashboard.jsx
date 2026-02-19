// ============================================================
// Dashboard.jsx — Lista cartelle + pulsante "Unisciti"
// ============================================================
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getFolders, createFolder, deleteFolder } from "../api";

const s = {
  page: { minHeight: "100vh", background: "var(--bg)", paddingBottom: 60 },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "24px 40px", borderBottom: "1px solid var(--border)", background: "var(--surface)",
  },
  logo: { fontFamily: "var(--font-display)", fontSize: 24, color: "var(--accent)" },
  headerRight: { display: "flex", gap: 10 },
  joinBtn: {
    background: "var(--surface2)", border: "1px solid var(--border)",
    color: "var(--text)", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600,
  },
  logoutBtn: {
    background: "var(--surface2)", border: "1px solid var(--border)",
    color: "var(--muted)", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 500,
  },
  content: { maxWidth: 900, margin: "0 auto", padding: "48px 24px" },
  heading: {
    fontFamily: "var(--font-display)", fontSize: 36, marginBottom: 8,
    background: "linear-gradient(135deg, var(--text) 0%, var(--accent) 100%)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  sub: { color: "var(--muted)", fontSize: 15, marginBottom: 40 },
  createBox: { display: "flex", gap: 12, marginBottom: 48 },
  input: {
    flex: 1, background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: 10, padding: "12px 16px", color: "var(--text)", fontSize: 15, outline: "none",
  },
  addBtn: {
    background: "var(--accent)", color: "#0f0e11", borderRadius: 10,
    padding: "12px 24px", fontWeight: 600, fontSize: 15, whiteSpace: "nowrap",
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 },
  card: {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "28px 24px 20px", cursor: "pointer",
    transition: "border-color 0.2s, transform 0.15s", position: "relative",
    overflow: "hidden", display: "flex", flexDirection: "column",
  },
  accentBar: {
    position: "absolute", top: 0, left: 0, width: "100%", height: 3,
    background: "linear-gradient(90deg, var(--accent), var(--accent2))",
  },
  folderIcon: { fontSize: 28, marginBottom: 12 },
  folderName: { fontWeight: 600, fontSize: 16, marginBottom: 4, flex: 1 },
  folderFooter: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  folderSub: { color: "var(--muted)", fontSize: 12 },
  // Badge "condivisa" per le cartelle collaborative
  sharedBadge: {
    fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
    background: "var(--surface2)", border: "1px solid var(--border)",
    borderRadius: 20, padding: "2px 8px", color: "var(--accent)",
  },
  deleteBtn: {
    background: "transparent", border: "none", color: "var(--muted)",
    fontSize: 15, cursor: "pointer", padding: "2px 4px", borderRadius: 4,
  },
  error: { background: "#3a1a20", border: "1px solid #7a2a35", color: "#ff9eb5", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 24 },
  empty: { color: "var(--muted)", fontSize: 15, textAlign: "center", padding: "60px 0" },
};

function getMyUserId() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const p = JSON.parse(atob(token.split(".")[1]));
    return String(p.sub ?? p.user_id ?? p.id ?? p._id ?? "");
  } catch { return null; }
}

export default function Dashboard() {
  const [folders, setFolders]   = useState([]);
  const [newName, setNewName]   = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const navigate = useNavigate();
  const myUserId = getMyUserId();

  useEffect(() => { loadFolders(); }, []);

  async function loadFolders() {
    setLoading(true); setError("");
    try {
      const data = await getFolders();
      setFolders(Array.isArray(data) ? data : (data.folders ?? []));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError("");
    try {
      await createFolder(newName.trim());
      setNewName("");
      loadFolders();
    } catch (err) { setError(err.message); }
  }

  async function handleDelete(e, fid) {
    e.stopPropagation();
    if (confirmDelete !== fid) { setConfirmDelete(fid); return; }
    try {
      await deleteFolder(fid);
      setConfirmDelete(null);
      setFolders(prev => prev.filter(f => folderId(f) !== fid));
    } catch (err) { setError(err.message); setConfirmDelete(null); }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/");
  }

  function folderId(f) { return f._id ?? f.id; }

  function isOwner(f) {
    return f.members?.some(m => String(m.userId) === myUserId && m.role === "owner");
  }

  function isShared(f) {
    return (f.members?.length ?? 0) > 1;
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.logo}>Flashly</div>
        <div style={s.headerRight}>
          {/* Bottone per unirsi a cartella altrui */}
          <button style={s.joinBtn} onClick={() => navigate("/join")}>
            🔗 Unisciti a cartella
          </button>
          <button style={s.logoutBtn} onClick={handleLogout}>Esci →</button>
        </div>
      </div>

      <div className="fade-up" style={s.content}>
        <h1 style={s.heading}>Le tue cartelle</h1>
        <p style={s.sub}>Crea una cartella o unisciti a una con il codice invito.</p>

        <form style={s.createBox} onSubmit={handleCreate}>
          <input style={s.input} placeholder="Nome nuova cartella…"
            value={newName} onChange={e => setNewName(e.target.value)} />
          <button style={s.addBtn} type="submit">+ Crea</button>
        </form>

        {error && <div style={s.error}>⚠ {error}</div>}

        {loading ? (
          <div style={s.empty}>Caricamento…</div>
        ) : folders.length === 0 ? (
          <div style={s.empty}>Nessuna cartella ancora.<br />Creane una o unisciti con un codice!</div>
        ) : (
          <div style={s.grid}>
            {folders.map(folder => {
              const fid         = folderId(folder);
              const confirming  = confirmDelete === fid;
              const owned       = isOwner(folder);
              const shared      = isShared(folder);

              return (
                <div
                  key={fid}
                  style={{ ...s.card, borderColor: confirming ? "#7a2a35" : "var(--border)" }}
                  className="fade-up"
                  onClick={() => navigate(`/folders/${fid}`)}
                  onMouseEnter={e => { if (!confirming) { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.transform = "translateY(-2px)"; }}}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = confirming ? "#7a2a35" : "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; if (confirming) setConfirmDelete(null); }}
                >
                  <div style={s.accentBar} />
                  <div style={s.folderIcon}>{shared ? "📂" : "📁"}</div>
                  <div style={s.folderName}>{folder.name}</div>

                  <div style={s.folderFooter}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {shared && <span style={s.sharedBadge}>👥 {folder.members.length}</span>}
                      {!owned && <span style={{ ...s.sharedBadge, color: "var(--muted)" }}>membro</span>}
                    </div>

                    {/* Solo l'owner può eliminare */}
                    {owned && (
                      <button
                        style={{ ...s.deleteBtn, color: confirming ? "#ff9eb5" : "var(--muted)" }}
                        title={confirming ? "Conferma eliminazione" : "Elimina cartella"}
                        onClick={e => handleDelete(e, fid)}
                      >
                        {confirming ? "⚠" : "🗑"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}