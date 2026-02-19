// ============================================================
// Dashboard.jsx — Lista cartelle con eliminazione cartella
// ============================================================
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getFolders, createFolder, deleteFolder } from "../api";
const s = {
  page: { minHeight: "100vh", background: "var(--bg)", padding: "0 0 60px" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "24px 40px",
    borderBottom: "1px solid var(--border)",
    background: "var(--surface)",
  },
  logo: { fontFamily: "Montserrat", fontSize: 35, letterSpacing: 1, color: "var(--accent)" },
  logoutBtn: {
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    color: "var(--muted)",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 18,
    fontWeight: 500,
  },
  content: { maxWidth: 900, margin: "0 auto", padding: "48px 24px" },
  heading: {
    fontFamily: "Montserrat",
    fontSize: 34,
    marginBottom: 8,
    background: "linear-gradient(135deg, var(--text) 0%, var(--accent) 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  sub: { color: "var(--muted)", fontSize: 20, marginBottom: 40 },
  createBox: { display: "flex", gap: 12, marginBottom: 48 },
  input: {
    flex: 1,
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "12px 16px",
    color: "var(--text)",
    fontSize: 18,
    outline: "none",
  },
  addBtn: {
    background: "var(--accent)",
    color: "#0f0e11",
    borderRadius: 10,
    padding: "12px 24px",
    fontWeight: 600,
    fontSize: 18,
    whiteSpace: "nowrap",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 20,
  },
  folderCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "28px 24px 20px",
    cursor: "pointer",
    transition: "border-color 0.2s, transform 0.15s",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  accentBar: {
    position: "absolute",
    top: 0, left: 0,
    width: "100%", height: 3,
    background: "linear-gradient(90deg, var(--accent), var(--accent2))",
  },
  folderIcon: { fontSize: 34, marginBottom: 12 },
  folderName: { fontWeight: 600, fontSize: 20, marginBottom: 4, flex: 1 },
  folderFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
  folderSub: { color: "var(--muted)", fontSize: 16 },
  deleteFolderBtn: {
    background: "transparent",
    border: "none",
    color: "var(--muted)",
    fontSize: 18,
    cursor: "pointer",
    padding: "2px 4px",
    borderRadius: 4,
    lineHeight: 1,
    transition: "color 0.15s",
  },
  error: {
    background: "#3a1a20",
    border: "1px solid #7a2a35",
    color: "#ff9eb5",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    marginBottom: 24,
  },
  empty: { color: "var(--muted)", fontSize: 16, textAlign: "center", padding: "60px 0" },
};

export default function Dashboard() {
  const [folders, setFolders] = useState([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  // _id della cartella in attesa di conferma eliminazione
  const [confirmDelete, setConfirmDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { loadFolders(); }, []);

  async function loadFolders() {
    setLoading(true);
    setError("");
    try {
      const data = await getFolders();
      setFolders(Array.isArray(data) ? data : (data.folders ?? []));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError("");
    try {
      await createFolder(newName.trim());
      setNewName("");
      loadFolders();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteFolder(e, fid) {
    // Blocca la propagazione così non apre la cartella
    e.stopPropagation();
    if (confirmDelete !== fid) {
      setConfirmDelete(fid);
      return;
    }
    try {
      await deleteFolder(fid);
      setConfirmDelete(null);
      setFolders((prev) => prev.filter((f) => (f._id ?? f.id) !== fid));
    } catch (err) {
      setError(err.message);
      setConfirmDelete(null);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/");
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.logo}>Flashly</div>
        <button style={s.logoutBtn} onClick={handleLogout}>Esci →</button>
      </div>

      <div className="fade-up" style={s.content}>
        <h1 style={s.heading}>Le tue cartelle</h1>
        <p style={s.sub}>Organizza i tuoi mazzi di flashcard per argomento.</p>

        <form style={s.createBox} onSubmit={handleCreate}>
          <input
            style={s.input}
            placeholder="Nome nuova cartella…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button style={s.addBtn} type="submit">+ Crea</button>
        </form>

        {error && <div style={s.error}>⚠ {error}</div>}

        {loading ? (
          <div style={s.empty}>Caricamento…</div>
        ) : folders.length === 0 ? (
          <div style={s.empty}>
            Nessuna cartella ancora.<br />Creane una sopra per iniziare!
          </div>
        ) : (
          <div style={s.grid}>
            {folders.map((folder) => {
              const fid = folder._id ?? folder.id;
              const isConfirming = confirmDelete === fid;
              return (
                <div
                  key={fid}
                  style={{
                    ...s.folderCard,
                    borderColor: isConfirming ? "#7a2a35" : "var(--border)",
                  }}
                  className="fade-up"
                  onClick={() => navigate(`/folders/${fid}`)}
                  onMouseEnter={(e) => {
                    if (!isConfirming) {
                      e.currentTarget.style.borderColor = "var(--accent)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = isConfirming ? "#7a2a35" : "var(--border)";
                    e.currentTarget.style.transform = "translateY(0)";
                    // Annulla conferma se il mouse esce dalla card
                    if (isConfirming) setConfirmDelete(null);
                  }}
                >
                  <div style={s.accentBar} />
                  <div style={s.folderIcon}>📁</div>
                  <div style={s.folderName}>{folder.name}</div>
                  <div style={s.folderFooter}>
                    <div style={s.folderSub}>
                      {isConfirming ? "Conferma eliminazione" : "Apri →"}
                    </div>
                    {/* Bottone elimina cartella */}
                    <button
                      style={{
                        ...s.deleteFolderBtn,
                        color: isConfirming ? "#ff9eb5" : "var(--muted)",
                      }}
                      title={isConfirming ? "Clicca ancora per eliminare" : "Elimina cartella"}
                      onClick={(e) => handleDeleteFolder(e, fid)}
                    >
                      {isConfirming ? "⚠ Elimina" : "🗑"}
                    </button>
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