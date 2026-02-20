// ============================================================
// api.js — Tutte le chiamate al backend Flask
// ============================================================
const BASE_URL = "https://flashcards-app-4x4f.onrender.com";

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch(path, options = {}) {
  const res  = await fetch(`${BASE_URL}${path}`, { ...options, headers: authHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || "Errore sconosciuto");
  return data;
}

// ── Auth ─────────────────────────────────────────────────────
export const login    = (email, password) => apiFetch("/auth/login",    { method: "POST", body: JSON.stringify({ email, password }) });
export const register = (email, password) => apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) });

// ── Cartelle ─────────────────────────────────────────────────
export const getFolders    = ()     => apiFetch("/folders");
export const getFolderById = (id)   => apiFetch(`/folders/${id}`);
export const createFolder  = (name) => apiFetch("/folders", { method: "POST", body: JSON.stringify({ name }) });
export const deleteFolder  = (id)   => apiFetch(`/folders/${id}`, { method: "DELETE" });

// Unirsi a una cartella tramite joinCode
export const joinFolder = (code) => apiFetch("/folders/join", { method: "POST", body: JSON.stringify({ code }) });

// ── Flashcard ─────────────────────────────────────────────────
export const getFlashcards    = (folderId)          => apiFetch(`/flashcards/${folderId}`);
export const createFlashcard  = (folderId, front, back) => apiFetch("/folders/flashcard", { method: "POST", body: JSON.stringify({ folder_id: folderId, front, back }) });
export const updateFlashcard  = (cardId, front, back)   => apiFetch(`/flashcards/${cardId}`, { method: "PUT",  body: JSON.stringify({ front, back }) });
export const deleteFlashcard  = (cardId)                => apiFetch(`/flashcards/${cardId}`, { method: "DELETE" });

// ── Studio ────────────────────────────────────────────────────
export const fetchNextCard = (folderId, recentIds = [], learnedIds = []) =>
  apiFetch("/study/next", { method: "POST", body: JSON.stringify({ folder_id: folderId, recent_ids: recentIds, learned_ids: learnedIds }) });

export const recordResult = (flashcardId, result) =>
  apiFetch("/study/result", { method: "POST", body: JSON.stringify({ flashcard_id: flashcardId, result }) });

// ── AI Generation ─────────────────────────────────────────────
// Genera flashcard automaticamente con Groq + Llama 3
// count: numero di card da generare (default 5, max 10)
export const generateFlashcards = (folderId, topic, count = 5) =>
  apiFetch("/ai/generate", {
    method: "POST",
    body: JSON.stringify({ folder_id: folderId, topic, count }),
  });