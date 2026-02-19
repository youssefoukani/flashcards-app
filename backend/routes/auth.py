from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import jwt
import bcrypt
from bson import ObjectId
import os

from db import db

SECRET_KEY = os.getenv("SECRET_KEY")

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


def generate_token(user_id):
    payload = {
        "user_id": str(user_id),
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token


def get_current_user(request):
    auth = request.headers.get("Authorization")
    if not auth:
        return None
    try:
        token = auth.split(" ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload["user_id"]
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


# ---------------- REGISTER ----------------
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "campi mancanti"}), 400

    if db.users.find_one({"email": email}):
        return jsonify({"error": "utente già esistente"}), 400

    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

    user = {
        "email": email,
        "passwordHash": pw_hash,
        "createdAt": datetime.utcnow()
    }

    res = db.users.insert_one(user)

    token = generate_token(res.inserted_id)

    return jsonify({"token": token})


# ---------------- LOGIN ----------------
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    user = db.users.find_one({"email": email})
    if not user:
        return jsonify({"error": "utente non trovato"}), 401

    if not bcrypt.checkpw(password.encode(), user["passwordHash"]):
        return jsonify({"error": "password errata"}), 401

    token = generate_token(user["_id"])

    return jsonify({"token": token})