from flask import Flask, jsonify
from flask_cors import CORS

from routes.auth import auth_bp
from routes.folders import folders_bp
from routes.study import study_bp
from routes.flashcards import flashcards_bp
from routes.ai import ai_bp
from dotenv import load_dotenv

load_dotenv()

def create_app():
    app = Flask(__name__)
    CORS(app, origins=["http://localhost:5173"])
    

    # ------------------------
    # Register blueprints
    # ------------------------
    app.register_blueprint(auth_bp)
    app.register_blueprint(folders_bp)
    app.register_blueprint(study_bp)
    app.register_blueprint(flashcards_bp)
    app.register_blueprint(ai_bp)

    # ------------------------
    # Health check
    # ------------------------
    @app.route("/health")
    def health():
        return jsonify({"status": "ok"})

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)