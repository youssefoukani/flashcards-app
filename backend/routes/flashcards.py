# ============================================================
# routes/flashcards.py — GET, PUT, DELETE con membership check
# ============================================================
from flask import Blueprint, request, jsonify
from bson import ObjectId
from bson.errors import InvalidId
from flask_cors import cross_origin
from datetime import datetime

from db import db
from routes.auth import get_current_user
from routes.folders import serialize_doc, get_member_role

flashcards_bp = Blueprint("flashcards", __name__, url_prefix="/flashcards")


# ── GET /flashcards/<folder_id> — lista flashcard ───────────
@flashcards_bp.route("/<folder_id>", methods=["GET"])
@cross_origin(origin="http://localhost:5173")
def get_flashcards(folder_id):
    user_id = get_current_user(request)
    if not user_id:
        return jsonify({"error": "non autorizzato"}), 401
    try:
        folder_oid = ObjectId(folder_id)
    except (InvalidId, TypeError):
        return jsonify({"error": "folder_id non valido"}), 400

    folder = db.folders.find_one({"_id": folder_oid})
    if not folder:
        return jsonify({"error": "cartella non trovata"}), 404

    if not get_member_role(folder, user_id):
        return jsonify({"error": "accesso negato"}), 403

    cards = list(db.flashcards.find({"folderId": folder_oid}))
    return jsonify(serialize_doc(cards))


# ── PUT /flashcards/<card_id> — modifica flashcard ──────────
@flashcards_bp.route("/<card_id>", methods=["PUT"])
@cross_origin(origin="http://localhost:5173")
def update_flashcard(card_id):
    user_id = get_current_user(request)
    if not user_id:
        return jsonify({"error": "non autorizzato"}), 401
    try:
        card_oid = ObjectId(card_id)
    except (InvalidId, TypeError):
        return jsonify({"error": "card_id non valido"}), 400

    card = db.flashcards.find_one({"_id": card_oid})
    if not card:
        return jsonify({"error": "flashcard non trovata"}), 404

    folder = db.folders.find_one({"_id": card["folderId"]})
    if not folder or not get_member_role(folder, user_id):
        return jsonify({"error": "accesso negato"}), 403

    data  = request.get_json() or {}
    front = data.get("front", "").strip()
    back  = data.get("back", "").strip()
    if not front or not back:
        return jsonify({"error": "front e back obbligatori"}), 400

    db.flashcards.update_one(
        {"_id": card_oid},
        {"$set": {"front": front, "back": back, "updatedAt": datetime.now()}}
    )
    card.update({"front": front, "back": back})
    return jsonify(serialize_doc(card))


# ── DELETE /flashcards/<card_id> — elimina flashcard ────────
@flashcards_bp.route("/<card_id>", methods=["DELETE"])
@cross_origin(origin="http://localhost:5173")
def delete_flashcard(card_id):
    user_id = get_current_user(request)
    if not user_id:
        return jsonify({"error": "non autorizzato"}), 401
    try:
        card_oid = ObjectId(card_id)
    except (InvalidId, TypeError):
        return jsonify({"error": "card_id non valido"}), 400

    card = db.flashcards.find_one({"_id": card_oid})
    if not card:
        return jsonify({"error": "flashcard non trovata"}), 404

    folder = db.folders.find_one({"_id": card["folderId"]})
    if not folder or not get_member_role(folder, user_id):
        return jsonify({"error": "accesso negato"}), 403

    db.flashcards.delete_one({"_id": card_oid})
    return jsonify({"status": "ok"})