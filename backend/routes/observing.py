from flask import Blueprint, jsonify
from flask_login import login_required, current_user
from extensions import db
from models import Observing, Listing

observing_bp = Blueprint("observing", __name__)

@observing_bp.post("/toggle/<listing_id>")
@login_required
def toggle(listing_id):
    existing = Observing.query.filter_by(user_id=current_user.id, listing_id=listing_id).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify({"ok": True, "observing": False}), 200

    if not db.session.get(Listing, listing_id):
        return jsonify({"error": "Listing not found"}), 404

    db.session.add(Observing(user_id=current_user.id, listing_id=listing_id))
    db.session.commit()
    return jsonify({"ok": True, "observing": True}), 200

@observing_bp.get("")
@login_required
def my_observing():
    rows = Observing.query.filter_by(user_id=current_user.id).order_by(Observing.created_at.desc()).all()
    return jsonify({"observing": [{"listing_id": r.listing_id, "created_at": r.created_at.isoformat()} for r in rows]}), 200
