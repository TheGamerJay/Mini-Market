from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from extensions import db
from models import User

auth_bp = Blueprint('auth', __name__)


# ── SIGNUP ───────────────────────────────────────────────
@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()

    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Username, email, and password are required'}), 400

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 409

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already taken'}), 409

    user = User(
        username=data['username'],
        email=data['email'],
        location_name=data.get('location_name'),
        location_lat=data.get('location_lat'),
        location_lng=data.get('location_lng')
    )
    user.set_password(data['password'])

    db.session.add(user)
    db.session.commit()

    login_user(user)
    return jsonify({'message': 'Account created', 'user': user.to_dict()}), 201


# ── LOGIN ────────────────────────────────────────────────
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=data['email']).first()

    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid email or password'}), 401

    login_user(user)
    return jsonify({'message': 'Logged in', 'user': user.to_dict()}), 200


# ── LOGOUT ───────────────────────────────────────────────
@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out'}), 200


# ── GET CURRENT USER ─────────────────────────────────────
@auth_bp.route('/me', methods=['GET'])
@login_required
def me():
    return jsonify({'user': current_user.to_dict()}), 200


# ── UPDATE PROFILE ───────────────────────────────────────
@auth_bp.route('/me', methods=['PUT'])
@login_required
def update_profile():
    data = request.get_json()

    if data.get('bio'):
        current_user.bio = data['bio']
    if data.get('avatar_url'):
        current_user.avatar_url = data['avatar_url']
    if data.get('location_name'):
        current_user.location_name = data['location_name']
    if data.get('location_lat'):
        current_user.location_lat = data['location_lat']
    if data.get('location_lng'):
        current_user.location_lng = data['location_lng']

    db.session.commit()
    return jsonify({'message': 'Profile updated', 'user': current_user.to_dict()}), 200
