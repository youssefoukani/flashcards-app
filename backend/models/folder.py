# ============================================================
# models/folder.py — Schema aggiornato con joinCode
# ============================================================
import random
import string
from datetime import datetime
from db import db


def generate_join_code(length=7):
    """
    Genera un codice univoco alfanumerico maiuscolo (es. "A3K9XWZ").
    Controlla il DB finché non trova un codice non ancora usato.
    """
    chars = string.ascii_uppercase + string.digits
    while True:
        code = "".join(random.choices(chars, k=length))
        # Garantisce unicità nel database
        if not db.folders.find_one({"joinCode": code}):
            return code


def create_folder(name, owner_id):
    """
    Crea il documento cartella con:
      - name        : nome della cartella
      - ownerId     : ObjectId del creatore
      - joinCode    : codice univoco per unirsi
      - members     : lista membri [{ userId, role }]
      - createdAt   : timestamp
    """
    return {
        "name": name,
        "ownerId": owner_id,
        "joinCode": generate_join_code(),
        "members": [
            {
                "userId": owner_id,
                "role": "owner",
            }
        ],
        "createdAt": datetime.now(),
    }