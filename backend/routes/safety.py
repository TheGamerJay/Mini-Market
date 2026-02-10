from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from extensions import db
from models import Listing, SafeMeetLocation, SafetyAckEvent

safety_bp = Blueprint("safety", __name__)

WARNING_TEXT = [
    "Meet in a public place (police station recommended).",
    "Inspect the item before paying.",
    "Never share your residence location."
]

@safety_bp.get("/warning-text")
def warning_text():
    return jsonify({"warning": WARNING_TEXT}), 200

@safety_bp.post("/listing/<listing_id>/safe-meet")
@login_required
def set_safe_meet(listing_id):
    l = db.session.get(Listing, listing_id)
    if not l:
        return jsonify({"error": "Listing not found"}), 404
    if l.user_id != current_user.id:
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(force=True)
    required = ["place_name","address","lat","lng","place_type"]
    if any(k not in data for k in required):
        return jsonify({"error": f"Required fields: {required}"}), 400

    SafeMeetLocation.query.filter_by(listing_id=listing_id).delete()

    rec = SafeMeetLocation(
        listing_id=listing_id,
        place_name=data["place_name"],
        address=data["address"],
        lat=data["lat"],
        lng=data["lng"],
        place_type=data["place_type"]
    )
    db.session.add(rec)
    db.session.commit()
    return jsonify({"ok": True}), 200

@safety_bp.post("/ack")
@login_required
def ack():
    data = request.get_json(force=True)
    event_type = (data.get("event_type") or "").strip()
    ack_text = (data.get("ack_text") or "").strip()
    listing_id = data.get("listing_id")

    if not event_type or not ack_text:
        return jsonify({"error": "event_type and ack_text required"}), 400

    db.session.add(SafetyAckEvent(
        user_id=current_user.id,
        listing_id=listing_id,
        event_type=event_type,
        ack_text=ack_text
    ))
    db.session.commit()
    return jsonify({"ok": True}), 201
