import json
from pywebpush import webpush, WebPushException
from flask import current_app

from extensions import db
from models import PushSubscription


def send_push_to_user(user_id, title, body, url="/", tag="default"):
    """Send a web push notification to all of a user's subscribed devices."""
    subs = PushSubscription.query.filter_by(user_id=user_id).all()
    if not subs:
        return

    vapid_private = current_app.config.get("VAPID_PRIVATE_KEY")
    vapid_claims = current_app.config.get("VAPID_CLAIMS", {})
    if not vapid_private:
        return

    payload = json.dumps({"title": title, "body": body, "url": url, "tag": tag})

    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=payload,
                vapid_private_key=vapid_private,
                vapid_claims=vapid_claims,
            )
        except WebPushException as e:
            if e.response and e.response.status_code in (404, 410):
                db.session.delete(sub)
            else:
                current_app.logger.error(f"Push failed: {e}")
        except Exception as e:
            current_app.logger.error(f"Push error: {e}")

    db.session.commit()
