import random
import hashlib
from datetime import datetime
from bson import ObjectId
from db import db
from models.stats import create_flashcard_stats

# ============================================================
# Costanti di tuning — modifica questi valori per bilanciare
# ============================================================

# Peso per ogni fallimento passato
FAIL_WEIGHT     = 6.0
# Peso per ogni successo passato (riduce la priorità)
SUCCESS_WEIGHT  = 3.0
# Ore minime prima che una card già vista possa tornare
MIN_HOURS_GAP   = 0.1
# Bonus massimo per card mai viste
UNSEEN_BONUS    = 200.0
# Quante card diverse devono apparire prima che la stessa possa ripetersi
# (evita pattern ripetitivi) — requisito 5
NO_REPEAT_WINDOW = 3


# ============================================================
# Helpers
# ============================================================

def hours_since(dt):
    """Ore trascorse dall'ultima visualizzazione. None → mai vista."""
    if dt is None:
        return None
    delta = datetime.now() - dt
    return max(0.0, delta.total_seconds() / 3600)


def deterministic_jitter(card_id, user_id, salt="study"):
    """
    Requisito 2 + 3: pseudo-casualità controllata e deterministica.
    Produce un float [0.85, 1.15] stabile per la coppia (card, user),
    così due sessioni diverse per lo stesso utente hanno variazioni
    coerenti ma non identiche ogni volta.
    Requisito 4: il salt cambia ogni giorno → evita pattern settimanali.
    """
    daily_salt = datetime.now().strftime("%Y-%m-%d")
    key = f"{card_id}-{user_id}-{salt}-{daily_salt}"
    digest = hashlib.md5(key.encode()).hexdigest()
    # Converte i primi 8 hex in un float [0, 1]
    base = int(digest[:8], 16) / 0xFFFFFFFF
    # Mappa a [0.85, 1.15]
    return 0.85 + base * 0.30


def compute_weight(stats, card_id, user_id):
    """
    Requisito 1: priorità temporale (due date).
    Requisito 2 + 3: jitter deterministico con variazione controllata.

    Formula:
        base  = ore_da_last_seen  (più vecchia = più urgente)
        bonus = failCount * FAIL_WEIGHT
        malus = successCount * SUCCESS_WEIGHT
        peso  = max(0.5, base + bonus - malus + 1) * jitter
    """
    hours = hours_since(stats.get("lastSeen"))

    # Card mai vista → priorità massima fissa
    if hours is None:
        return UNSEEN_BONUS * deterministic_jitter(card_id, user_id, salt="unseen")

    fail_bonus    = stats.get("failCount", 0) * FAIL_WEIGHT
    success_malus = stats.get("successCount", 0) * SUCCESS_WEIGHT

    raw = hours + fail_bonus - success_malus + 1.0
    raw = max(0.5, raw)  # peso minimo per mantenere ogni card raggiungibile

    jitter = deterministic_jitter(card_id, user_id)
    return raw * jitter


# ============================================================
# Selezione principale
# ============================================================

def pick_flashcard(user_id, folder_id, recent_ids=None):
    """
    Restituisce UNA flashcard usando random pesato avanzato.

    Parametri:
        user_id    — stringa o ObjectId dell'utente
        folder_id  — stringa o ObjectId della cartella
        recent_ids — lista degli _id (stringhe) delle ultime NO_REPEAT_WINDOW
                     card mostrate, per evitare ripetizioni immediate (req. 5)

    Ritorna: il documento flashcard selezionato, o None se vuoto.
    """
    user_oid   = ObjectId(user_id)
    folder_oid = ObjectId(folder_id)
    recent_ids = recent_ids or []

    # 1. Carica tutte le flashcard della cartella
    flashcards = list(db.flashcards.find({"folderId": folder_oid}))
    if not flashcards:
        return None

    flashcard_ids = [card["_id"] for card in flashcards]

    # 2. Carica stats utente in un unico round-trip
    stats_list = list(db.flashcardStats.find({
        "userId": user_oid,
        "flashcardId": {"$in": flashcard_ids}
    }))
    stats_map = {s["flashcardId"]: s for s in stats_list}

    # 3. Calcola pesi
    weighted_cards = []
    for card in flashcards:
        card_id = card["_id"]

        # Crea stats se non esistono
        if card_id not in stats_map:
            new_stats = create_flashcard_stats(user_oid, card_id)
            db.flashcardStats.insert_one(new_stats)
            stats = new_stats
        else:
            stats = stats_map[card_id]

        weight = compute_weight(stats, str(card_id), str(user_oid))

        # Requisito 5: penalizza card viste di recente nella stessa sessione
        # Se la card è nelle ultime NO_REPEAT_WINDOW, abbassa drasticamente il peso.
        # Se c'è una sola card disponibile, l'eccezione è inevitabile.
        if str(card_id) in [str(r) for r in recent_ids]:
            if len(flashcards) > NO_REPEAT_WINDOW:
                weight *= 0.05  # quasi impossibile ma non esclusa del tutto

        weighted_cards.append((card, weight))

    # 4. Requisito 1: se una card è stata vista da meno di MIN_HOURS_GAP ore
    #    e ci sono alternative, escludila temporaneamente
    now = datetime.now()
    def seen_too_recently(card):
        cid = card["_id"]
        s = stats_map.get(cid)
        if not s or s.get("lastSeen") is None:
            return False
        hrs = (now - s["lastSeen"]).total_seconds() / 3600
        return hrs < MIN_HOURS_GAP

    available = [(c, w) for (c, w) in weighted_cards if not seen_too_recently(c)]
    if not available:
        available = weighted_cards  # fallback: usa tutte

    cards   = [c for (c, _) in available]
    weights = [w for (_, w) in available]

    # 5. Selezione pesata casuale — requisito 3
    selected = random.choices(cards, weights=weights, k=1)[0]
    return selected


# ============================================================
# Aggiornamento stats
# ============================================================

def mark_fail(user_id, flashcard_id):
    """Segna un fallimento e aggiorna lastSeen."""
    return db.flashcardStats.update_one(
        {
            "userId":      ObjectId(user_id),
            "flashcardId": ObjectId(flashcard_id)
        },
        {
            "$inc": {"failCount": 1},
            "$set": {"lastSeen": datetime.now()}
        }
    )


def mark_success(user_id, flashcard_id):
    """Segna un successo, aggiorna lastSeen e azzera failCount consecutivi."""
    return db.flashcardStats.update_one(
        {
            "userId":      ObjectId(user_id),
            "flashcardId": ObjectId(flashcard_id)
        },
        {
            "$inc": {"successCount": 1},
            "$set": {
                "lastSeen":          datetime.now(),
                "consecutiveFails":  0         # azzera streak di errori
            }
        }
    )