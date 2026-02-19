from datetime import datetime

def create_flashcard_stats(user_id, flashcard_id):
    return {
        "userId": user_id,
        "flashcardId": flashcard_id,
        "lastSeen": None,
        "failCount": 0,
        "successCount": 0,
        "createdAt": datetime.now()
    }

def mark_fail():
    return {
        "$inc": {"failCount": 1},
        "$set": {"lastSeen": datetime.now()}
    }