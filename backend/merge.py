"""
merge_flashcards.py
────────────────────────────────────────────────────────────
Copia tutte le flashcard dei capitoli in una nuova cartella
"Tutte le carte" (o il nome che preferisci).

USO:
  1. Modifica le variabili nella sezione CONFIG
  2. python merge_flashcards.py
"""

import requests
import sys

# ════════════════════════════════════════════════
#  CONFIG — modifica queste variabili
# ════════════════════════════════════════════════

BASE_URL  = "https://flashcards-app-4x4f.onrender.com"
EMAIL     = "1@1"       # ← la tua email
PASSWORD  = "1"         # ← la tua password

# Nome da dare alla cartella unificata
MERGED_NAME = "prova merge 2"

# Lascia vuoto [] per copiare TUTTE le tue cartelle,
# oppure metti i nomi esatti dei capitoli da includere:
# INCLUDE_FOLDERS = ["Cap 1", "Cap 2", "Cap 3"]
INCLUDE_FOLDERS = ["big data real", "condivido"]   # [] = tutte le cartelle

# ════════════════════════════════════════════════

def log(msg): print(f"  {msg}", flush=True)

def login():
    r = requests.post(f"{BASE_URL}/auth/login",
                      json={"email": EMAIL, "password": PASSWORD})
    r.raise_for_status()
    data = r.json()
    token = data.get("token") or data.get("access_token")
    if not token:
        print("❌ Login fallito:", data)
        sys.exit(1)
    print(f"✓ Login OK")
    return token

def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

def get_folders(token):
    r = requests.get(f"{BASE_URL}/folders", headers=headers(token))
    r.raise_for_status()
    data = r.json()
    return data if isinstance(data, list) else data.get("folders", [])

def get_cards(token, folder_id):
    r = requests.get(f"{BASE_URL}/flashcards/{folder_id}", headers=headers(token))
    r.raise_for_status()
    data = r.json()
    return data if isinstance(data, list) else data.get("flashcards", [])

def create_folder(token, name):
    r = requests.post(f"{BASE_URL}/folders",
                      json={"name": name}, headers=headers(token))
    r.raise_for_status()
    data = r.json()
    # supporta sia {"folder": {...}} sia {"_id": ...}
    folder = data.get("folder") or data
    return folder.get("_id") or folder.get("id")

def create_card(token, folder_id, front, back):
    r = requests.post(f"{BASE_URL}/folders/flashcard",
                      json={
                          "folder_id": folder_id,   # 👈 FIX QUI
                          "front": front,
                          "back": back
                      },
                      headers=headers(token))
    r.raise_for_status()
# ════════════════════════════════════════════════

def main():
    print("\n🔗 Connessione al backend…")
    token = login()

    print("\n📂 Recupero cartelle…")
    all_folders = get_folders(token)

    # Filtra la cartella unificata stessa (per sicurezza, se già esiste)
    source_folders = [
        f for f in all_folders
        if f.get("name") != MERGED_NAME
    ]

    # Applica filtro per nome se specificato
    if INCLUDE_FOLDERS:
        source_folders = [
            f for f in source_folders
            if f.get("name") in INCLUDE_FOLDERS
        ]

    if not source_folders:
        print("❌ Nessuna cartella trovata con i criteri specificati.")
        sys.exit(1)

    print(f"\n  Cartelle da unire ({len(source_folders)}):")
    for f in source_folders:
        print(f"    • {f['name']}")

    # Raccoglie tutte le flashcard (de-duplica per fronte)
    print("\n🃏 Raccolta flashcard…")
    all_cards = []
    seen_fronts = set()
    duplicates  = 0

    for folder in source_folders:
        fid   = folder.get("_id") or folder.get("id")
        fname = folder.get("name")
        cards = get_cards(token, fid)
        new   = 0
        for card in cards:
            front = (card.get("front") or "").strip()
            back  = (card.get("back")  or "").strip()
            if not front or not back:
                continue
            key = front.lower()
            if key in seen_fronts:
                duplicates += 1
                continue
            seen_fronts.add(key)
            all_cards.append({"front": front, "back": back})
            new += 1
        log(f"{fname}: {new} card  ({len(cards) - new} doppioni saltati)")

    print(f"\n  Totale unique: {len(all_cards)}  |  Doppioni scartati: {duplicates}")

    if not all_cards:
        print("❌ Nessuna flashcard da copiare.")
        sys.exit(1)

    # Crea cartella unificata
    print(f"\n✨ Creo cartella \"{MERGED_NAME}\"…")
    merged_id = create_folder(token, MERGED_NAME)
    if not merged_id:
        print("❌ Creazione cartella fallita.")
        sys.exit(1)
    print(f"  ID: {merged_id}")

    # Inserisce le card
    print(f"\n📥 Inserimento {len(all_cards)} flashcard…")
    errors = 0
    for i, card in enumerate(all_cards, 1):
        try:
            create_card(token, merged_id, card["front"], card["back"])
            if i % 10 == 0 or i == len(all_cards):
                print(f"  {i}/{len(all_cards)}", end="\r")
        except Exception as e:
            log(f"❌ Errore card {i}: {e}")
            errors += 1

    print(f"\n\n✅ Fatto!  {len(all_cards) - errors} flashcard copiate in \"{MERGED_NAME}\"")
    if errors:
        print(f"  ⚠  {errors} card non inserite (vedi errori sopra)")

if __name__ == "__main__":
    main()