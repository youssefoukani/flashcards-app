from datetime import datetime

def create_folder(name, owner_id, is_shared=False):
    return {
        "name": name,
        "ownerId": owner_id,
        "isShared": is_shared,
        "members": [
            {
                "userId": owner_id,
                "role": "owner"
            }
        ],
        "createdAt": datetime.now()
    }