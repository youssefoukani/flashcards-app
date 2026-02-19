import random
from datetime import datetime
from bson import ObjectId

from db import db
from models.stats import create_flashcard_stats


def hours_since(dt):
    if dt is None:
        # mai vista → priorità massima
        return 999
    delta = datetime.now() - dt
    return delta.total_seconds() / 3600


def compute_weight(stats):
    """
    peso = ore_da_last_seen + (failCount * 5) + 1
    """

    age_weight = hours_since(stats.get("lastSeen"))
    fail_weight = stats.get("failCount", 0) * 5

    return age_weight + fail_weight + 1


def pick_flashcard(user_id, folder_id):
    """
    Restituisce UNA flashcard usando random pesato.
    Se una flashcard non ha stats, le crea automaticamente.
    """

    user_id = ObjectId(user_id)
    folder_id = ObjectId(folder_id)

    # 1. carica tutte le flashcard della cartella
    flashcards = list(db.flashcards.find({"folderId": folder_id}))

    if not flashcards:
        return None

    flashcard_ids = [card["_id"] for card in flashcards]

    # 2. carica stats dell'utente
    stats_list = list(db.flashcardStats.find({
        "userId": user_id,
        "flashcardId": {"$in": flashcard_ids}
    }))

    # dizionario: flashcardId -> stats
    stats_map = {s["flashcardId"]: s for s in stats_list}

    weighted_cards = []

    for card in flashcards:
        card_id = card["_id"]

        # se non esistono stats → creale
        if card_id not in stats_map:
            new_stats = create_flashcard_stats(user_id, card_id)
            db.flashcardStats.insert_one(new_stats)
            stats = new_stats
        else:
            stats = stats_map[card_id]

        weight = compute_weight(stats)

        weighted_cards.append((card, weight))

    # 3. random pesato
    cards = [c[0] for c in weighted_cards]
    weights = [c[1] for c in weighted_cards]

    selected = random.choices(cards, weights=weights, k=1)[0]

    return selected


def mark_fail(user_id, flashcard_id):
    return db.flashcardStats.update_one(
        {
            "userId": ObjectId(user_id),
            "flashcardId": ObjectId(flashcard_id)
        },
        {
            "$inc": {"failCount": 1},
            "$set": {"lastSeen": datetime.now()}
        }
    )


def mark_success(user_id, flashcard_id):
    return db.flashcardStats.update_one(
        {
            "userId": ObjectId(user_id),
            "flashcardId": ObjectId(flashcard_id)
        },
        {
            "$inc": {"successCount": 1},
            "$set": {"lastSeen": datetime.now()}
        }
    )