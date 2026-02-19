# ============================================================
# routes/ai.py — Generazione automatica flashcard con Groq + Llama 3
# ============================================================
# Setup:
#   pip install groq
#   Crea account gratuito su https://console.groq.com
#   Variabile d'ambiente: GROQ_API_KEY=gsk_...
#
# Registra in app.py:
#   from routes.ai import ai_bp
#   app.register_blueprint(ai_bp)
# ============================================================
import os
import json
import re
from groq import Groq
from flask import Blueprint, request, jsonify
from bson import ObjectId
from bson.errors import InvalidId
from flask_cors import cross_origin
from datetime import datetime

from db import db
from routes.auth import get_current_user
from routes.folders import serialize_doc, get_member_role

ai_bp = Blueprint("ai", __name__, url_prefix="/ai")

# Client Groq — legge GROQ_API_KEY dall'ambiente
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Modello gratuito da usare
GROQ_MODEL = "llama-3.3-70b-versatile"  # oppure "llama3-70b-8192" per qualità maggiore


# ── Helper: rileva lo stile predominante delle flashcard ─────
def analyze_style(cards):
    """
    Analizza le flashcard esistenti e restituisce:
      style  — tipo di domanda prevalente (stringa)
      length — lunghezza media delle risposte (per calibrare la difficoltà)
      sample — fino a 4 esempi da mostrare al modello
    """
    if not cards:
        return {
            "style": "domanda diretta con risposta concisa",
            "length": "breve (1-2 righe)",
            "sample": []
        }

    fronts = " ".join(c.get("front", "").lower() for c in cards)

    # Rilevamento stile per parole chiave
    if any(k in fronts for k in ["cos'è", "cosa si intende", "definisci", "definizione di"]):
        style = "definizione di concetti (Cos'è X? → risposta definitoria)"
    elif any(k in fronts for k in ["differenza tra", "confronta", " vs ", "versus"]):
        style = "confronto tra concetti (Differenza tra X e Y? → distinzione chiara)"
    elif any(k in fronts for k in ["calcola", "risolvi", "quanto vale", "formula", "equazione"]):
        style = "esercizio numerico o formula (es: Formula di X? → formula con breve spiegazione)"
    elif any(k in fronts for k in ["vero o falso", "true or false"]):
        style = "vero o falso (Affermazione → Vero/Falso + motivazione breve)"
    elif any(k in fronts for k in ["completa", "___", "..."]):
        style = "completamento di frase (Frase incompleta → parola/frase mancante)"
    elif any(k in fronts for k in ["perché", "spiega perché", "come funziona", "come mai"]):
        style = "spiegazione causale (Perché X? → spiegazione concisa)"
    elif any(k in fronts for k in ["elenca", "quali sono", "nomina", "cita"]):
        style = "enumerazione (Quali sono X? → lista puntata breve)"
    else:
        style = "domanda diretta con risposta concisa"

    # Calibra lunghezza risposta attesa
    avg = sum(len(c.get("back", "")) for c in cards) / len(cards)
    if avg < 60:
        length = "molto breve (max 1 riga)"
    elif avg < 130:
        length = "breve (1-2 righe)"
    else:
        length = "medio (2-4 righe)"

    # Fino a 4 esempi rappresentativi
    sample = [{"front": c["front"], "back": c["back"]} for c in cards[:4]]

    return {"style": style, "length": length, "sample": sample}


# ── Helper: costruisce il prompt ─────────────────────────────
def build_prompt(topic, style_info, existing_cards, n):
    existing_fronts = [c.get("front", "") for c in existing_cards]
    sample_json     = json.dumps(style_info["sample"], ensure_ascii=False, indent=2)
    existing_json   = json.dumps(existing_fronts[:20], ensure_ascii=False)

    return f"""Sei un esperto creatore di flashcard didattiche.

COMPITO: Genera esattamente {n} flashcard sull'argomento: "{topic}"

STILE DA RISPETTARE (analizzato dalle flashcard esistenti):
- Tipo di domanda: {style_info["style"]}
- Lunghezza risposta attesa: {style_info["length"]}

ESEMPI DI FLASHCARD GIÀ PRESENTI NEL MAZZO (imita questo stile esatto):
{sample_json}

ARGOMENTI GIÀ COPERTI — NON generare domande su questi concetti:
{existing_json}

REGOLE OBBLIGATORIE:
1. Rispetta esattamente lo stile delle flashcard esistenti
2. Non duplicare concetti già presenti
3. Ogni flashcard deve essere autonoma e comprensibile
4. Lunghezza front: max 12 parole
5. Lunghezza back: rispetta la lunghezza target indicata sopra
6. Argomento: pertinente a "{topic}"
7. Output: SOLO JSON valido, nessun testo fuori dal JSON, nessun markdown

OUTPUT RICHIESTO (array JSON puro):
[
  {{"front": "...", "back": "..."}},
  {{"front": "...", "back": "..."}}
]"""


# ── Helper: estrae JSON dall'output del modello ───────────────
def extract_json(text):
    """
    Estrae il primo array JSON valido dalla risposta del modello,
    gestendo casi in cui il modello aggiunge testo extra o markdown.
    """
    # Rimuove blocchi ```json ... ```
    text = re.sub(r"```(?:json)?", "", text).replace("```", "").strip()

    # Cerca il primo [...] nella stringa
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if match:
        return json.loads(match.group())

    raise ValueError(f"Nessun JSON valido trovato nella risposta: {text[:200]}")


# ── POST /ai/generate — endpoint principale ──────────────────
@ai_bp.route("/generate", methods=["POST"])
@cross_origin(origin="http://localhost:5173")
def generate_flashcards():
    """
    Body: {
      "folder_id": "<id cartella>",
      "topic":     "Teorema di Bayes",
      "count":     5            # opzionale, default 5, max 10
    }

    Risposta: {
      "generated": [ { "front": "...", "back": "..." }, ... ],
      "saved":     [ { "_id": "...", "front": "...", "back": "..." }, ... ],
      "style_detected": "...",
      "count": 5
    }
    """
    user_id = get_current_user(request)
    if not user_id:
        return jsonify({"error": "non autorizzato"}), 401

    data      = request.get_json() or {}
    folder_id = data.get("folder_id", "").strip()
    topic     = data.get("topic", "").strip()
    count     = min(int(data.get("count", 5)), 10)  # max 10 per chiamata

    if not folder_id or not topic:
        return jsonify({"error": "folder_id e topic sono obbligatori"}), 400

    # Verifica che la cartella esista e che l'utente sia membro
    try:
        folder_oid = ObjectId(folder_id)
    except (InvalidId, TypeError):
        return jsonify({"error": "folder_id non valido"}), 400

    folder = db.folders.find_one({"_id": folder_oid})
    if not folder:
        return jsonify({"error": "cartella non trovata"}), 404
    if not get_member_role(folder, user_id):
        return jsonify({"error": "accesso negato"}), 403

    # 1. Carica tutte le flashcard esistenti nella cartella
    existing_cards = list(db.flashcards.find({"folderId": folder_oid}))

    # 2. Analizza stile predominante
    style_info = analyze_style(existing_cards)

    # 3. Costruisce prompt e chiama Groq
    prompt = build_prompt(topic, style_info, existing_cards, count)

    try:
        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Sei un assistente specializzato nella creazione di flashcard didattiche. "
                        "Rispondi SOLO con JSON valido, senza testo aggiuntivo, senza markdown."
                    )
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,   # creatività moderata
            max_tokens=1500,
        )
    except Exception as e:
        return jsonify({"error": f"Errore API Groq: {str(e)}"}), 502

    raw = response.choices[0].message.content

    # 4. Estrae e valida il JSON
    try:
        generated = extract_json(raw)
    except (json.JSONDecodeError, ValueError) as e:
        return jsonify({
            "error": "Il modello non ha restituito JSON valido",
            "raw": raw[:300]
        }), 502

    # 5. Valida struttura: ogni elemento deve avere front e back
    valid = [
        c for c in generated
        if isinstance(c, dict)
        and c.get("front", "").strip()
        and c.get("back", "").strip()
    ]
    if not valid:
        return jsonify({"error": "Nessuna flashcard valida generata", "raw": raw[:300]}), 502

    # 6. Salva nel database
    docs = [
        {
            "folderId":  folder_oid,
            "front":     c["front"].strip(),
            "back":      c["back"].strip(),
            "createdAt": datetime.now(),
            "aiGenerated": True,   # flag utile per analytics future
        }
        for c in valid
    ]
    result  = db.flashcards.insert_many(docs)
    for doc, inserted_id in zip(docs, result.inserted_ids):
        doc["_id"] = inserted_id

    return jsonify({
        "generated":      serialize_doc(docs),
        "count":          len(docs),
        "style_detected": style_info["style"],
    }), 201