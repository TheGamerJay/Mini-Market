import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from config import Config
from extensions import db, migrate, login_manager
from models import User
from routes import register_blueprints

load_dotenv()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # max upload size
    app.config["MAX_CONTENT_LENGTH"] = app.config["MAX_CONTENT_LENGTH_MB"] * 1024 * 1024

    # CORS
    CORS(
        app,
        supports_credentials=True,
        resources={r"/api/*": {"origins": [app.config["FRONTEND_ORIGIN"]]}}
    )

    # ensure upload folder exists
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    # init extensions
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, user_id)

    register_blueprints(app)

    @app.get("/api/health")
    def health():
        return jsonify({"ok": True}), 200

    return app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
