from pymongo import MongoClient

client = MongoClient("mongodb+srv://youssef:flashcard@clusterflashcards.xujfm3d.mongodb.net/?retryWrites=true&w=majority")
db = client.flashcards