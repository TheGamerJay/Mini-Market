from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timedelta

from extensions import db
from models import Listing, Offer, User
from email_utils import send_stale_listing_nudge

cron_bp = Blueprint("cron", __name__)


@cron_bp.post("/nudge-stale")
def nudge_stale_listings():
    if request.headers.get("X-Cron-Secret") != current_app.config.get("CRON_SECRET"):
        return jsonify({"error": "Unauthorized"}), 401

    cutoff = datetime.utcnow() - timedelta(days=7)
    stale = Listing.query.filter(
        Listing.created_at < cutoff,
        Listing.is_sold == False,
        Listing.is_draft == False,
        Listing.nudged_at == None,
    ).all()

    nudged = 0
    for listing in stale:
        if Offer.query.filter_by(listing_id=listing.id).count() > 0:
            continue
        seller = db.session.get(User, listing.user_id)
        if not seller:
            continue
        days_old = (datetime.utcnow() - listing.created_at).days
        try:
            send_stale_listing_nudge(seller.email, seller.display_name, listing.title, listing.id, days_old)
            listing.nudged_at = datetime.utcnow()
            nudged += 1
        except Exception as e:
            current_app.logger.error(f"Nudge failed for {listing.id}: {e}")

    db.session.commit()
    return jsonify({"ok": True, "stale_found": len(stale), "nudged": nudged}), 200
