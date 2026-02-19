from datetime import datetime

def create_flashcard(folder_id, front, back):
    return {
        "folderId": folder_id,
        "front": front,
        "back": back,
        "createdAt": datetime.now()
    }