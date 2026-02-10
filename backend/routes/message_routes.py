from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from sqlalchemy import or_, and_
from extensions import db
from models import Message, User

message_bp = Blueprint('messages', __name__)


# ── SEND MESSAGE ─────────────────────────────────────────
@message_bp.route('/', methods=['POST'])
@login_required
def send_message():
    data = request.get_json()

    if not data or not data.get('receiver_id') or not data.get('body'):
        return jsonify({'error': 'Receiver and message body are required'}), 400

    receiver = db.session.get(User, data['receiver_id'])
    if not receiver:
        return jsonify({'error': 'Receiver not found'}), 404

    if data['receiver_id'] == current_user.id:
        return jsonify({'error': 'Cannot message yourself'}), 400

    msg = Message(
        sender_id=current_user.id,
        receiver_id=data['receiver_id'],
        listing_id=data.get('listing_id'),
        body=data['body']
    )

    db.session.add(msg)
    db.session.commit()
    return jsonify({'message': 'Message sent', 'data': msg.to_dict()}), 201


# ── GET CONVERSATIONS (inbox) ────────────────────────────
@message_bp.route('/conversations', methods=['GET'])
@login_required
def get_conversations():
    # Get distinct users the current user has chatted with
    sent_to = db.session.query(Message.receiver_id).filter_by(sender_id=current_user.id).distinct()
    received_from = db.session.query(Message.sender_id).filter_by(receiver_id=current_user.id).distinct()

    partner_ids = set()
    for row in sent_to:
        partner_ids.add(row[0])
    for row in received_from:
        partner_ids.add(row[0])

    conversations = []
    for pid in partner_ids:
        partner = db.session.get(User, pid)
        last_msg = Message.query.filter(
            or_(
                and_(Message.sender_id == current_user.id, Message.receiver_id == pid),
                and_(Message.sender_id == pid, Message.receiver_id == current_user.id)
            )
        ).order_by(Message.created_at.desc()).first()

        unread = Message.query.filter_by(
            sender_id=pid, receiver_id=current_user.id, read=False
        ).count()

        conversations.append({
            'partner': partner.to_dict(),
            'last_message': last_msg.to_dict() if last_msg else None,
            'unread_count': unread
        })

    conversations.sort(key=lambda c: c['last_message']['created_at'] if c['last_message'] else '', reverse=True)
    return jsonify({'conversations': conversations}), 200


# ── GET THREAD WITH SPECIFIC USER ────────────────────────
@message_bp.route('/thread/<int:partner_id>', methods=['GET'])
@login_required
def get_thread(partner_id):
    messages = Message.query.filter(
        or_(
            and_(Message.sender_id == current_user.id, Message.receiver_id == partner_id),
            and_(Message.sender_id == partner_id, Message.receiver_id == current_user.id)
        )
    ).order_by(Message.created_at.asc()).all()

    # Mark received messages as read
    unread = Message.query.filter_by(
        sender_id=partner_id, receiver_id=current_user.id, read=False
    ).all()
    for msg in unread:
        msg.read = True
    db.session.commit()

    return jsonify({'messages': [m.to_dict() for m in messages]}), 200
