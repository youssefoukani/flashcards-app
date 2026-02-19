// ============================================================
// api.js — Funzioni fetch per il backend Flask
// Base URL: http://127.0.0.1:5000
// ============================================================

const BASE_URL = "http://127.0.0.1:5000";

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: authHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || "Errore sconosciuto");
  }
  return data;
}

// ── Auth ────────────────────────────────────────────────────

export async function login(email, password) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(email, password) {
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// ── Cartelle ────────────────────────────────────────────────

export async function getFolders() {
  return apiFetch("/folders");
}

export async function createFolder(name) {
  return apiFetch("/folders", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function deleteFolder(folderId) {
  return apiFetch(`/folders/${folderId}`, { method: "DELETE" });
}

// ── Flashcard ───────────────────────────────────────────────

export async function getFlashcards(folderId) {
  return apiFetch(`/flashcards/${folderId}`);
}

export async function createFlashcard(folderId, front, back) {
  return apiFetch("/folders/flashcard", {
    method: "POST",
    body: JSON.stringify({ folder_id: folderId, front, back }),
  });
}

export async function deleteFlashcard(cardId) {
  return apiFetch(`/flashcards/${cardId}`, { method: "DELETE" });
}

// ── Studio avanzato ─────────────────────────────────────────

// Chiede la prossima card all'algoritmo backend
// recentIds: array degli _id delle ultime card mostrate (anti-ripetizione)
export async function fetchNextCard(folderId, recentIds = [], learnedIds = []) {
  return apiFetch("/study/next", {
    method: "POST",
    body: JSON.stringify({ folder_id: folderId, recent_ids: recentIds, learned_ids: learnedIds }),
  });
}

// Registra il risultato: result = "success" | "fail"
export async function recordResult(flashcardId, result) {
  return apiFetch("/study/result", {
    method: "POST",
    body: JSON.stringify({ flashcard_id: flashcardId, result }),
  });
}