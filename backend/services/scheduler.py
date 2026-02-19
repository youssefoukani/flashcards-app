import random
import hashlib
from datetime import datetime
from bson import ObjectId
from db import db
from models.stats import create_flashcard_stats

# ── Costanti di tuning ───────────────────────────────────────
FAIL_WEIGHT      = 6.0
SUCCESS_WEIGHT   = 3.0
MIN_HOURS_GAP    = 0.1
UNSEEN_BONUS     = 200.0
NO_REPEAT_WINDOW = 3


def hours_since(dt):
    if dt is None:
        return None
    delta = datetime.now() - dt
    return max(0.0, delta.total_seconds() / 3600)


def deterministic_jitter(card_id, user_id, salt="study"):
    """Float [0.85, 1.15] stabile per (card, user, giorno)."""
    daily_salt = datetime.now().strftime("%Y-%m-%d")
    key = f"{card_id}-{user_id}-{salt}-{daily_salt}"
    digest = hashlib.md5(key.encode()).hexdigest()
    base = int(digest[:8], 16) / 0xFFFFFFFF
    return 0.85 + base * 0.30


def compute_weight(stats, card_id, user_id):
    hours = hours_since(stats.get("lastSeen"))
    if hours is None:
        return UNSEEN_BONUS * deterministic_jitter(card_id, user_id, salt="unseen")
    fail_bonus    = stats.get("failCount", 0) * FAIL_WEIGHT
    success_malus = stats.get("successCount", 0) * SUCCESS_WEIGHT
    raw = max(0.5, hours + fail_bonus - success_malus + 1.0)
    return raw * deterministic_jitter(card_id, user_id)


def pick_flashcard(user_id, folder_id, recent_ids=None, learned_ids=None):
    """
    Seleziona la prossima flashcard escludendo quelle già imparate
    nella sessione corrente (learned_ids) e penalizzando quelle
    viste di recente (recent_ids).
    """
    user_oid   = ObjectId(user_id)
    folder_oid = ObjectId(folder_id)
    recent_ids  = [str(x) for x in (recent_ids or [])]
    # learned_ids: set di _id stringa delle card già imparate in sessione
    learned_ids = set(str(x) for x in (learned_ids or []))

    flashcards = list(db.flashcards.find({"folderId": folder_oid}))
    if not flashcards:
        return None

    # ── Esclude completamente le card già imparate in sessione ──
    remaining = [c for c in flashcards if str(c["_id"]) not in learned_ids]
    if not remaining:
        return None   # tutte imparate → sessione finita

    flashcard_ids = [card["_id"] for card in remaining]

    stats_list = list(db.flashcardStats.find({
        "userId": user_oid,
        "flashcardId": {"$in": flashcard_ids}
    }))
    stats_map = {s["flashcardId"]: s for s in stats_list}

    weighted_cards = []
    now = datetime.now()

    for card in remaining:
        card_id = card["_id"]

        if card_id not in stats_map:
            new_stats = create_flashcard_stats(user_oid, card_id)
            db.flashcardStats.insert_one(new_stats)
            stats = new_stats
        else:
            stats = stats_map[card_id]

        weight = compute_weight(stats, str(card_id), str(user_oid))

        # Penalizza card viste troppo di recente nella stessa sessione
        if str(card_id) in recent_ids:
            if len(remaining) > NO_REPEAT_WINDOW:
                weight *= 0.05

        weighted_cards.append((card, weight))

    # Escludi card viste da meno di MIN_HOURS_GAP se ci sono alternative
    available = [
        (c, w) for (c, w) in weighted_cards
        if not (
            stats_map.get(c["_id"], {}).get("lastSeen") and
            (now - stats_map[c["_id"]]["lastSeen"]).total_seconds() / 3600 < MIN_HOURS_GAP
        )
    ]
    if not available:
        available = weighted_cards

    cards   = [c for (c, _) in available]
    weights = [w for (_, w) in available]

    return random.choices(cards, weights=weights, k=1)[0]


def mark_fail(user_id, flashcard_id):
    return db.flashcardStats.update_one(
        {"userId": ObjectId(user_id), "flashcardId": ObjectId(flashcard_id)},
        {"$inc": {"failCount": 1}, "$set": {"lastSeen": datetime.now()}}
    )


def mark_success(user_id, flashcard_id):
    return db.flashcardStats.update_one(
        {"userId": ObjectId(user_id), "flashcardId": ObjectId(flashcard_id)},
        {
            "$inc": {"successCount": 1},
            "$set": {"lastSeen": datetime.now(), "consecutiveFails": 0}
        }
    )