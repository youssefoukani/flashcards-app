from flask import Blueprint, request, jsonify, Response
from bson import ObjectId
from bson.errors import InvalidId
from flask_cors import cross_origin

from db import db
from models.folder import create_folder
from models.flashcard import create_flashcard
from routes.auth import get_current_user

folders_bp = Blueprint("folders", __name__, url_prefix="/folders")

# ---------------- Funzione helper per serializzare ObjectId ----------------
def serialize_doc(doc):
    """
    Converte ricorsivamente tutti gli ObjectId di un documento o lista in stringhe
    """
    if isinstance(doc, list):
        return [serialize_doc(d) for d in doc]
    elif isinstance(doc, dict):
        new_doc = {}
        for k, v in doc.items():
            if isinstance(v, ObjectId):
                new_doc[k] = str(v)
            elif isinstance(v, dict) or isinstance(v, list):
                new_doc[k] = serialize_doc(v)
            else:
                new_doc[k] = v
        return new_doc
    elif isinstance(doc, ObjectId):
        return str(doc)
    else:
        return doc
# ---------------- GET cartelle utente ----------------
@folders_bp.route("", methods=["GET"])
@cross_origin(origin="http://localhost:5173")
def get_folders():
    user_id = get_current_user(request)
    if not user_id:
        return jsonify({"error": "non autorizzato"}), 401

    try:
        folders = list(db.folders.find({"members.userId": ObjectId(user_id)}))
        folders = serialize_doc(folders)
        return jsonify(folders)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- CREA cartella ----------------
@folders_bp.route("", methods=["POST"])
@cross_origin(origin="http://localhost:5173")
def create_new_folder():
    user_id = get_current_user(request)
    if not user_id:
        return jsonify({"error": "non autorizzato"}), 401

    data = request.get_json()
    if not data or "name" not in data:
        return jsonify({"error": "nome cartella mancante"}), 400

    try:
        name = data["name"]
        folder = create_folder(name, ObjectId(user_id), True)
        res = db.folders.insert_one(folder)
        folder["_id"] = res.inserted_id
        folder = serialize_doc(folder)
        return jsonify(folder)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- INVITA utente ----------------
@folders_bp.route("/invite", methods=["POST"])
@cross_origin(origin="http://localhost:5173")
def invite_user():
    user_id = get_current_user(request)
    if not user_id:
        return jsonify({"error": "non autorizzato"}), 401

    data = request.get_json()
    folder_id = data.get("folder_id")
    email = data.get("email")

    if not folder_id or not email:
        return jsonify({"error": "folder_id o email mancanti"}), 400

    try:
        invited = db.users.find_one({"email": email})
        if not invited:
            return jsonify({"error": "utente non trovato"}), 404

        db.folders.update_one(
            {"_id": ObjectId(folder_id)},
            {"$push": {
                "members": {
                    "userId": invited["_id"],
                    "role": "editor"
                }
            }}
        )
        return jsonify({"status": "ok"})
    except (InvalidId, TypeError):
        return jsonify({"error": "folder_id non valido"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- CREA flashcard ----------------
@folders_bp.route("/flashcard", methods=["POST"])
@cross_origin(origin="http://localhost:5173")
def add_flashcard():
    user_id = get_current_user(request)
    if not user_id:
        return jsonify({"error": "non autorizzato"}), 401

    data = request.get_json()
    folder_id_str = data.get("folder_id")
    front = data.get("front")
    back = data.get("back")
    

    if not folder_id_str or not front or not back:
        return jsonify({"error": "folder_id, fronte o retro mancanti"}), 400

    try:
        folder_id = ObjectId(folder_id_str)
        card = create_flashcard(folder_id, front, back)
        res = db.flashcards.insert_one(card)
        card["_id"] = res.inserted_id
        card = serialize_doc(card)
        return jsonify(card)
    except (InvalidId, TypeError):
        return jsonify({"error": "folder_id non valido"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@folders_bp.route("/<folder_id>", methods=["DELETE"])
@cross_origin(origin="http://localhost:5173")
def delete_folder(folder_id):
    owner_id = get_current_user(request)
    if not owner_id:
        return jsonify({"error": "non autorizzato"}), 401
    try:
        folder_oid = ObjectId(folder_id)
    except (InvalidId, TypeError):
        return jsonify({"error": "folder_id non valido"}), 400

    # Verifica che l'utente sia owner (admin) della cartella
    folder = db.folders.find_one({
        "_id": folder_oid,
        "members": {"$elemMatch": {"userId": ObjectId(owner_id), "role": "owner"}}
    })
    if not folder:
        return jsonify({"error": "non trovata o permessi insufficienti"}), 404

    db.flashcards.delete_many({"folderId": folder_oid})  # elimina anche le card
    db.folders.delete_one({"_id": folder_oid})
    return jsonify({"status": "ok"})

