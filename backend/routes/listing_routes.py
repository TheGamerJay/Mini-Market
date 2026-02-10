import json
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from extensions import db
from models import Listing, Favorite

listing_bp = Blueprint('listings', __name__)


# ── CREATE LISTING ───────────────────────────────────────
@listing_bp.route('/', methods=['POST'])
@login_required
def create_listing():
    data = request.get_json()

    if not data or not data.get('title') or data.get('price') is None:
        return jsonify({'error': 'Title and price are required'}), 400

    listing = Listing(
        seller_id=current_user.id,
        title=data['title'],
        description=data.get('description'),
        price=float(data['price']),
        category=data.get('category'),
        condition=data.get('condition'),
        image_urls=json.dumps(data.get('image_urls', [])),
        location_lat=data.get('location_lat', current_user.location_lat),
        location_lng=data.get('location_lng', current_user.location_lng),
        location_name=data.get('location_name', current_user.location_name),
        radius_km=data.get('radius_km', 10.0)
    )

    db.session.add(listing)
    db.session.commit()
    return jsonify({'message': 'Listing created', 'listing': listing.to_dict()}), 201


# ── GET ALL LISTINGS ─────────────────────────────────────
@listing_bp.route('/', methods=['GET'])
def get_listings():
    category = request.args.get('category')
    min_price = request.args.get('min_price', type=float)
    max_price = request.args.get('max_price', type=float)
    search = request.args.get('q')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    query = Listing.query.filter_by(status='active')

    if category:
        query = query.filter_by(category=category)
    if min_price is not None:
        query = query.filter(Listing.price >= min_price)
    if max_price is not None:
        query = query.filter(Listing.price <= max_price)
    if search:
        query = query.filter(Listing.title.ilike(f'%{search}%'))

    query = query.order_by(Listing.created_at.desc())
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'listings': [l.to_dict() for l in paginated.items],
        'total': paginated.total,
        'page': paginated.page,
        'pages': paginated.pages
    }), 200


# ── GET SINGLE LISTING ──────────────────────────────────
@listing_bp.route('/<int:listing_id>', methods=['GET'])
def get_listing(listing_id):
    listing = db.session.get(Listing, listing_id)
    if not listing:
        return jsonify({'error': 'Listing not found'}), 404
    return jsonify({'listing': listing.to_dict()}), 200


# ── UPDATE LISTING ───────────────────────────────────────
@listing_bp.route('/<int:listing_id>', methods=['PUT'])
@login_required
def update_listing(listing_id):
    listing = db.session.get(Listing, listing_id)
    if not listing:
        return jsonify({'error': 'Listing not found'}), 404
    if listing.seller_id != current_user.id:
        return jsonify({'error': 'Not your listing'}), 403

    data = request.get_json()
    if data.get('title'):
        listing.title = data['title']
    if data.get('description') is not None:
        listing.description = data['description']
    if data.get('price') is not None:
        listing.price = float(data['price'])
    if data.get('category'):
        listing.category = data['category']
    if data.get('condition'):
        listing.condition = data['condition']
    if data.get('image_urls') is not None:
        listing.image_urls = json.dumps(data['image_urls'])
    if data.get('status'):
        listing.status = data['status']

    db.session.commit()
    return jsonify({'message': 'Listing updated', 'listing': listing.to_dict()}), 200


# ── DELETE LISTING ───────────────────────────────────────
@listing_bp.route('/<int:listing_id>', methods=['DELETE'])
@login_required
def delete_listing(listing_id):
    listing = db.session.get(Listing, listing_id)
    if not listing:
        return jsonify({'error': 'Listing not found'}), 404
    if listing.seller_id != current_user.id:
        return jsonify({'error': 'Not your listing'}), 403

    listing.status = 'removed'
    db.session.commit()
    return jsonify({'message': 'Listing removed'}), 200


# ── FAVORITE / UNFAVORITE ────────────────────────────────
@listing_bp.route('/<int:listing_id>/favorite', methods=['POST'])
@login_required
def toggle_favorite(listing_id):
    listing = db.session.get(Listing, listing_id)
    if not listing:
        return jsonify({'error': 'Listing not found'}), 404

    existing = Favorite.query.filter_by(user_id=current_user.id, listing_id=listing_id).first()

    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify({'message': 'Unfavorited'}), 200

    fav = Favorite(user_id=current_user.id, listing_id=listing_id)
    db.session.add(fav)
    db.session.commit()
    return jsonify({'message': 'Favorited'}), 201


# ── GET MY FAVORITES ─────────────────────────────────────
@listing_bp.route('/favorites', methods=['GET'])
@login_required
def get_favorites():
    favs = Favorite.query.filter_by(user_id=current_user.id).all()
    listings = [db.session.get(Listing, f.listing_id).to_dict() for f in favs]
    return jsonify({'favorites': listings}), 200
