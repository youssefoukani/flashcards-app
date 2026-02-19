import datetime

def create_user(email, password_hash):
    return {
        "email": email,
        "passwordHash": password_hash,
        "createdAt": datetime.now()
    }