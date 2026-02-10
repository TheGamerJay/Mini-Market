from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user

from extensions import db
from models import Subscription

billing_bp = Blueprint("billing", __name__)

@billing_bp.get("/status")
@login_required
def status():
    sub = Subscription.query.filter_by(user_id=current_user.id).order_by(Subscription.created_at.desc()).first()
    return jsonify({
        "is_pro": current_user.is_pro,
        "subscription": None if not sub else {
            "status": sub.status,
            "current_period_end": None if not sub.current_period_end else sub.current_period_end.isoformat()
        }
    }), 200

@billing_bp.post("/set-pro")
@login_required
def set_pro():
    data = request.get_json(force=True)
    make_pro = bool(data.get("is_pro"))
    current_user.is_pro = make_pro
    db.session.commit()
    return jsonify({"ok": True, "is_pro": current_user.is_pro}), 200
