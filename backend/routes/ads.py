from flask import Blueprint, jsonify
from flask_login import current_user
from models import Ad

ads_bp = Blueprint("ads", __name__)

@ads_bp.get("")
def get_ads():
    if current_user.is_authenticated and current_user.is_pro:
        return jsonify({"ads": []}), 200

    ads = Ad.query.filter_by(active=True).order_by(Ad.created_at.desc()).limit(3).all()
    return jsonify({"ads": [{
        "id": a.id,
        "title": a.title,
        "image_url": a.image_url,
        "link_url": a.link_url
    } for a in ads]}), 200
