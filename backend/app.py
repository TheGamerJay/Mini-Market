import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from extensions import db, login_manager

load_dotenv()

app = Flask(__name__)

# --- Config ---
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
    'DATABASE_PUBLIC_URL',
    'sqlite:///mini_market.db'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# --- Init extensions with app ---
db.init_app(app)
login_manager.init_app(app)
CORS(app, supports_credentials=True)

login_manager.login_view = 'auth.login'

from models import User

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

# --- Register route blueprints ---
from routes.auth_routes import auth_bp
from routes.listing_routes import listing_bp
from routes.message_routes import message_bp

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(listing_bp, url_prefix='/api/listings')
app.register_blueprint(message_bp, url_prefix='/api/messages')

@app.route('/')
def index():
    return {'status': 'alive', 'app': 'Mini Market API'}

# --- Create tables on first run ---
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
