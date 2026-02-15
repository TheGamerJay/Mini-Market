from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user

from extensions import db
from models import PushSubscription

push_bp = Blueprint("push", __name__)


@push_bp.get("/vapid")
def get_vapid_key():
    return jsonify({"public_key": current_app.config["VAPID_PUBLIC_KEY"]}), 200


@push_bp.post("/subscribe")
@login_required
def subscribe():
    data = request.get_json(force=True)
    endpoint = data.get("endpoint")
    keys = data.get("keys", {})
    p256dh = keys.get("p256dh")
    auth = keys.get("auth")

    if not endpoint or not p256dh or not auth:
        return jsonify({"error": "Invalid subscription data"}), 400

    existing = PushSubscription.query.filter_by(endpoint=endpoint).first()
    if existing:
        existing.user_id = current_user.id
    else:
        db.session.add(PushSubscription(
            user_id=current_user.id,
            endpoint=endpoint,
            p256dh=p256dh,
            auth=auth,
        ))

    db.session.commit()
    return jsonify({"ok": True}), 201


@push_bp.delete("/unsubscribe")
@login_required
def unsubscribe():
    data = request.get_json(force=True)
    endpoint = data.get("endpoint")
    if endpoint:
        PushSubscription.query.filter_by(endpoint=endpoint).delete()
    else:
        PushSubscription.query.filter_by(user_id=current_user.id).delete()
    db.session.commit()
    return jsonify({"ok": True}), 200
