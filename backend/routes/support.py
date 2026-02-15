from flask import Blueprint, request, jsonify
from flask_login import current_user

from extensions import limiter
from email_utils import send_support_auto_reply, notify_support_contact

support_bp = Blueprint("support", __name__)


@support_bp.post("/contact")
@limiter.limit("3 per minute")
def contact():
    data = request.get_json(force=True)
    email = (data.get("email") or "").strip()
    message = (data.get("message") or "").strip()
    msg_type = data.get("type", "support")
    user_agent = data.get("user_agent")
    page_url = data.get("page_url")

    if not email or not message:
        return jsonify({"error": "Email and message required"}), 400

    user_name = ""
    user_id = None
    if current_user.is_authenticated:
        user_name = current_user.display_name or ""
        user_id = current_user.id

    # Notify support inbox (Reply-To = user's email so you can reply directly)
    notify_support_contact(
        user_email=email,
        display_name=user_name,
        user_id=user_id,
        message=message,
        message_type=msg_type,
        user_agent=user_agent,
        page_url=page_url,
    )

    # Auto-reply to user
    send_support_auto_reply(email, user_name, msg_type)

    return jsonify({"ok": True}), 200
