from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user

from extensions import db
from models import Conversation, Message, Listing

messages_bp = Blueprint("messages", __name__)

@messages_bp.post("/start")
@login_required
def start_conversation():
    data = request.get_json(force=True)
    listing_id = data.get("listing_id")
    seller_id = data.get("seller_id")

    if not listing_id or not seller_id:
        return jsonify({"error": "listing_id and seller_id required"}), 400

    l = db.session.get(Listing, listing_id)
    if not l:
        return jsonify({"error": "Listing not found"}), 404

    buyer_id = current_user.id
    if buyer_id == seller_id:
        return jsonify({"error": "Cannot message yourself"}), 400

    conv = Conversation.query.filter_by(listing_id=listing_id, buyer_id=buyer_id, seller_id=seller_id).first()
    if not conv:
        conv = Conversation(listing_id=listing_id, buyer_id=buyer_id, seller_id=seller_id)
        db.session.add(conv)
        db.session.commit()

    return jsonify({"ok": True, "conversation_id": conv.id}), 200

@messages_bp.get("/conversations")
@login_required
def my_conversations():
    uid = current_user.id
    rows = Conversation.query.filter((Conversation.buyer_id == uid) | (Conversation.seller_id == uid)).order_by(Conversation.created_at.desc()).all()
    return jsonify({"conversations": [{
        "id": c.id,
        "listing_id": c.listing_id,
        "buyer_id": c.buyer_id,
        "seller_id": c.seller_id,
        "created_at": c.created_at.isoformat()
    } for c in rows]}), 200

@messages_bp.get("/<conversation_id>")
@login_required
def get_messages(conversation_id):
    c = db.session.get(Conversation, conversation_id)
    if not c:
        return jsonify({"error": "Not found"}), 404
    if current_user.id not in [c.buyer_id, c.seller_id]:
        return jsonify({"error": "Forbidden"}), 403

    msgs = Message.query.filter_by(conversation_id=conversation_id).order_by(Message.created_at.asc()).all()
    return jsonify({"messages": [{
        "id": m.id,
        "sender_id": m.sender_id,
        "body": m.body,
        "created_at": m.created_at.isoformat()
    } for m in msgs]}), 200

@messages_bp.post("/<conversation_id>")
@login_required
def send_message(conversation_id):
    c = db.session.get(Conversation, conversation_id)
    if not c:
        return jsonify({"error": "Not found"}), 404
    if current_user.id not in [c.buyer_id, c.seller_id]:
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json(force=True)
    body = (data.get("body") or "").strip()
    if not body:
        return jsonify({"error": "Message body required"}), 400

    m = Message(conversation_id=conversation_id, sender_id=current_user.id, body=body)
    db.session.add(m)
    db.session.commit()

    return jsonify({"ok": True, "message_id": m.id}), 201
