# ============================================================
# routes/folders.py — Versione completa con collaborazione
# ============================================================
from flask import Blueprint, request, jsonify
from bson import ObjectId
from bson.errors import InvalidId
from flask_cors import cross_origin
from datetime import datetime

from db import db
from models.folder import create_folder
from routes.auth import get_current_user

folders_bp = Blueprint("folders", __name__, url_prefix="/folders")


# ── Helper: serializza ObjectId ricorsivamente ───────────────
def serialize_doc(doc):
    if isinstance(doc, list):
        return [serialize_doc(d) for d in doc]
    elif isinstance(doc, dict):
        return {
            k: (str(v) if isinstance(v, ObjectId) else serialize_doc(v))
            for k, v in doc.items()
        }
    return doc


# ── Helper: verifica membership ─────────────────────────────
def get_member_role(folder, user_id_str):
    """
    Restituisce il ruolo dell'utente nella cartella ("owner", "member")
    oppure None se non è membro.
    """
    for m in folder.get("members", []):
        if str(m["userId"]) == user_id_str:
            return m["role"]
    return None


# ── GET /folders — cartelle dell'utente ─────────────────────
@folders_bp.route("", methods=["GET"])
@cross_origin(origin="http://localhost:5173")
def get_folders():
    user_id = get_current_user(request)
    if not user_id:
        return jsonify({"error": "non autorizzato"}), 401
    try:
        folders = list(db.folders.find({"members.userId": ObjectId(user_id)}))
        return jsonify(serialize_doc(folders))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── POST /folders — crea cartella ───────────────────────────
@folders_bp.route("", methods=["POST"])
@cross_origin(origin="http://localhost:5173")
def create_new_folder():
    user_id = get_current_user(request)
    if not user_id:
        return jsonify({"error": "non autorizzato"}), 401

    data = request.get_json()
    if not data or not data.get("name", "").strip():
        return jsonify({"error": "nome cartella mancante"}), 400

    try:
        folder = create_folder(data["name"].strip(), ObjectId(user_id))
        res = db.folders.insert_one(folder)
        folder["_id"] = res.inserted_id
        return jsonify(serialize_doc(folder)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET /folders/<id> — dettagli cartella ───────────────────
@folders_bp.route("/<folder_id>", methods=["GET"])
@cross_origin(origin="http://localhost:5173")
def get_folder(folder_id):
    user_id = get_current_user(request)
    if not user_id:
        return jsonify({"error": "non autorizzato"}), 401
    try:
        folder = db.folders.find_one({"_id": ObjectId(folder_id)})
    except (InvalidId, TypeError):
        return jsonify({"error": "folder_id non valido"}), 400

    if not folder:
        return jsonify({"error": "cartella non trovata"}), 404

    # Solo i membri possono vedere la cartella
    if not get_member_role(folder, user_id):
        return jsonify({"error": "accesso negato"}), 403

    return jsonify(serialize_doc(folder))


# ── POST /folders/join — unirsi con joinCode ────────────────
@folders_bp.route("/join", methods=["POST"])
@cross_origin(origin="http://localhost:5173")
def join_folder():
    user_id = get_current_user(request)
    if not user_id:
        return jsonify({"error": "non autorizzato"}), 401

    data = request.get_json()
    code = (data.get("code") or "").strip().upper()
    if not code:
        return jsonify({"error": "codice mancante"}), 400

    folder = db.folders.find_one({"joinCode": code})
    if not folder:
        return jsonify({"error": "codice non valido"}), 404

    # Se è già membro non fa nulla, restituisce la cartella
    if get_member_role(folder, user_id):
        return jsonify({"message": "già membro", "folder": serialize_doc(folder)})

    # Aggiunge come membro con ruolo "member"
    db.folders.update_one(
        {"_id": folder["_id"]},
        {"$push": {"members": {"userId": ObjectId(user_id), "role": "member"}}}
    )
    folder["members"].append({"userId": ObjectId(user_id), "role": "member"})
    return jsonify({"message": "unito con successo", "folder": serialize_doc(folder)}), 200


# ── DELETE /folders/<id> — elimina cartella (solo owner) ────
@folders_bp.route("/<folder_id>", methods=["DELETE"])
@cross_origin(origin="http://localhost:5173")
def delete_folder(folder_id):
    user_id = get_current_user(request)
    if not user_id:
        return jsonify({"error": "non autorizzato"}), 401
    try:
        folder_oid = ObjectId(folder_id)
    except (InvalidId, TypeError):
        return jsonify({"error": "folder_id non valido"}), 400

    folder = db.folders.find_one({"_id": folder_oid})
    if not folder:
        return jsonify({"error": "non trovata"}), 404

    if get_member_role(folder, user_id) != "owner":
        return jsonify({"error": "solo il proprietario può eliminare"}), 403

    db.flashcards.delete_many({"folderId": folder_oid})
    db.folders.delete_one({"_id": folder_oid})
    return jsonify({"status": "ok"})


# ── POST /folders/flashcard — crea flashcard ────────────────
@folders_bp.route("/flashcard", methods=["POST"])
@cross_origin(origin="http://localhost:5173")
def add_flashcard():
    user_id = get_current_user(request)
    if not user_id:
        return jsonify({"error": "non autorizzato"}), 401

    data = request.get_json()
    folder_id_str = (data or {}).get("folder_id")
    front = (data or {}).get("front", "").strip()
    back  = (data or {}).get("back", "").strip()

    if not folder_id_str or not front or not back:
        return jsonify({"error": "folder_id, front o back mancanti"}), 400

    try:
        folder_oid = ObjectId(folder_id_str)
    except (InvalidId, TypeError):
        return jsonify({"error": "folder_id non valido"}), 400

    folder = db.folders.find_one({"_id": folder_oid})
    if not folder:
        return jsonify({"error": "cartella non trovata"}), 404

    # Qualsiasi membro può aggiungere flashcard
    if not get_member_role(folder, user_id):
        return jsonify({"error": "accesso negato"}), 403

    card = {
        "folderId": folder_oid,
        "front": front,
        "back": back,
        "createdAt": datetime.now(),
    }
    res = db.flashcards.insert_one(card)
    card["_id"] = res.inserted_id
    return jsonify(serialize_doc(card)), 201