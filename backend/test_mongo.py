from db import db

try:
    # prova a contare le collezioni
    print("Collezioni disponibili:", db.list_collection_names())
    print("Connessione a MongoDB Atlas riuscita ✅")
except Exception as e:
    print("Errore connessione MongoDB:", e)