import random
from datetime import datetime
from flask import Blueprint, jsonify, request
from flask_login import current_user

from extensions import db
from models import Boost, BoostImpression, Listing

boosts_bp = Blueprint("boosts", __name__)

@boosts_bp.get("/featured")
def featured():
    now = datetime.utcnow()
    active = Boost.query.filter(Boost.status == "active", Boost.ends_at > now).all()
    if not active:
        return jsonify({"featured_listing_ids": []}), 200

    sample = random.sample(active, k=min(5, len(active)))
    listing_ids = [b.listing_id for b in sample]

    viewer_id = current_user.id if current_user.is_authenticated else None
    for b in sample:
        db.session.add(BoostImpression(boost_id=b.id, viewer_user_id=viewer_id))
    db.session.commit()

    return jsonify({"featured_listing_ids": listing_ids}), 200

@boosts_bp.get("/durations")
def durations():
    return jsonify({
        "durations": [
            {"label": "24 Hours", "hours": 24, "price_usd": 3},
            {"label": "3 Days", "hours": 72, "price_usd": 7}
        ]
    }), 200
