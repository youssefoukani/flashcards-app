from flask import Blueprint, request, jsonify
from bson import ObjectId

from db import db
from services.scheduler import pick_flashcard, mark_fail, mark_success

study_bp = Blueprint("study", __name__, url_prefix="/study")


# ---------------------------------------------------
# GET prossima flashcard di una cartella
# ---------------------------------------------------
@study_bp.route("/<folder_id>", methods=["GET"])
def get_next_flashcard(folder_id):

    # TEMP: user_id preso da query (?user_id=...)
    # In produzione sostituisci con JWT
    user_id = request.args.get("user_id")

    if not user_id:
        return jsonify({"error": "user_id mancante"}), 400

    card = pick_flashcard(user_id, folder_id)

    if card is None:
        return jsonify({"message": "Nessuna flashcard nella cartella"}), 404

    return jsonify({
        "flashcardId": str(card["_id"]),
        "front": card["front"],
        "back": card["back"]
    })


# ---------------------------------------------------
# POST risposta flashcard
# body:
# {
#   "user_id": "...",
#   "flashcard_id": "...",
#   "result": "success" | "fail"
# }
# ---------------------------------------------------
@study_bp.route("/answer", methods=["POST"])
def answer_flashcard():

    data = request.json

    user_id = data.get("user_id")
    flashcard_id = data.get("flashcard_id")
    result = data.get("result")

    if not user_id or not flashcard_id or not result:
        return jsonify({"error": "campi mancanti"}), 400

    if result == "fail":
        mark_fail(user_id, flashcard_id)

    elif result == "success":
        mark_success(user_id, flashcard_id)

    else:
        return jsonify({"error": "result deve essere 'success' o 'fail'"}), 400

    return jsonify({"status": "ok"})


# ---------------------------------------------------
# GET statistiche utente per una cartella (opzionale)
# ---------------------------------------------------
@study_bp.route("/stats/<folder_id>", methods=["GET"])
def get_folder_stats(folder_id):

    user_id = request.args.get("user_id")

    if not user_id:
        return jsonify({"error": "user_id mancante"}), 400

    flashcards = list(db.flashcards.find({"folderId": ObjectId(folder_id)}))
    flashcard_ids = [c["_id"] for c in flashcards]

    stats = list(db.flashcardStats.find({
        "userId": ObjectId(user_id),
        "flashcardId": {"$in": flashcard_ids}
    }))

    response = []

    for s in stats:
        response.append({
            "flashcardId": str(s["flashcardId"]),
            "failCount": s.get("failCount", 0),
            "successCount": s.get("successCount", 0),
            "lastSeen": s.get("lastSeen")
        })

    return jsonify(response)