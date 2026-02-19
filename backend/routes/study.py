# ============================================================
# Esempio di route Flask che usa il nuovo algoritmo.
# Aggiungila al tuo blueprint esistente.
# ============================================================
# Il frontend chiama POST /study/next con body:
#   { "folder_id": "...", "recent_ids": ["id1", "id2", "id3"] }
# e riceve la prossima flashcard da mostrare.
# ============================================================

from flask import Blueprint, jsonify, request
from flask_cors import cross_origin
from routes.auth import get_current_user
from services.scheduler import pick_flashcard, mark_fail, mark_success

study_bp = Blueprint("study", __name__, url_prefix="/study")


@study_bp.route("/next", methods=["POST"])
@cross_origin(origin="http://localhost:5173")
def next_card():
    user_id = get_current_user(request)
    if not user_id:
        return jsonify({"error": "non autorizzato"}), 401

    data      = request.get_json()
    folder_id = data.get("folder_id")
    recent    = data.get("recent_ids", [])   # ultime card viste in sessione

    if not folder_id:
        return jsonify({"error": "folder_id mancante"}), 400

    card = pick_flashcard(user_id, folder_id, recent_ids=recent)
    if card is None:
        return jsonify({"error": "nessuna flashcard disponibile"}), 404

    # Serializza ObjectId
    card["_id"]      = str(card["_id"])
    card["folderId"] = str(card["folderId"])
    return jsonify(card)


@study_bp.route("/result", methods=["POST"])
@cross_origin(origin="http://localhost:5173")
def record_result():
    """Registra il risultato di una card: success o fail."""
    user_id = get_current_user(request)
    if not user_id:
        return jsonify({"error": "non autorizzato"}), 401

    data    = request.get_json()
    card_id = data.get("flashcard_id")
    result  = data.get("result")   # "success" | "fail"

    if not card_id or result not in ("success", "fail"):
        return jsonify({"error": "parametri mancanti o non validi"}), 400

    if result == "success":
        mark_success(user_id, card_id)
    else:
        mark_fail(user_id, card_id)

    return jsonify({"status": "ok"})