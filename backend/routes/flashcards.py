from flask import Blueprint, jsonify, request
from bson import ObjectId
from bson.errors import InvalidId
from flask_cors import cross_origin

from db import db
from routes.auth import get_current_user
from routes.folders import serialize_doc   # riusa la funzione già esistente

flashcards_bp = Blueprint("flashcards", __name__, url_prefix="/flashcards")


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

    # Verifica che l'utente sia membro della cartella
    folder = db.folders.find_one({
        "_id": folder_oid,
        "members.userId": ObjectId(user_id)
    })
    if not folder:
        return jsonify({"error": "cartella non trovata o accesso negato"}), 404

    try:
        cards = list(db.flashcards.find({"folderId": folder_oid}))
        cards = serialize_doc(cards)
        return jsonify(cards)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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

    # Verifica che l'utente sia membro della cartella proprietaria
    folder = db.folders.find_one({
        "_id": card["folderId"],
        "members.userId": ObjectId(user_id)
    })
    if not folder:
        return jsonify({"error": "accesso negato"}), 403

    db.flashcards.delete_one({"_id": card_oid})
    return jsonify({"status": "ok"})