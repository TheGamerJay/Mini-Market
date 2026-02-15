import os
from flask import Blueprint, request, jsonify, redirect, current_app
from flask_login import login_user
from authlib.integrations.flask_client import OAuth

from extensions import db
from models import User
from email_utils import send_welcome

oauth_bp = Blueprint("oauth", __name__)
oauth = OAuth()


def init_oauth(app):
    """Call in create_app() to register OAuth clients."""
    oauth.init_app(app)

    # Google OAuth
    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
    if client_id and client_secret:
        oauth.register(
            name="google",
            client_id=client_id,
            client_secret=client_secret,
            server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
            client_kwargs={"scope": "openid email profile"},
        )



@oauth_bp.get("/google/start")
def google_start():
    """Redirect the browser to Google's consent screen."""
    if not hasattr(oauth, "google"):
        return jsonify({"error": "Google OAuth not configured"}), 503
    redirect_uri = current_app.config["FRONTEND_ORIGIN"].rstrip("/") + "/api/auth/google/callback"
    return oauth.google.authorize_redirect(redirect_uri)


@oauth_bp.get("/google/callback")
def google_callback():
    """Google redirects here after consent. Create/find user, log in via session, redirect to frontend."""
    try:
        token = oauth.google.authorize_access_token()
    except Exception as e:
        current_app.logger.error(f"Google OAuth token exchange failed: {e}")
        return redirect(current_app.config["FRONTEND_ORIGIN"] + "/login?error=oauth_failed")
    userinfo = token.get("userinfo")
    if not userinfo:
        return redirect(current_app.config["FRONTEND_ORIGIN"] + "/login?error=no_user_info")

    sub = userinfo.get("sub")
    email = userinfo.get("email", "")
    name = userinfo.get("name", "")
    picture = userinfo.get("picture", "")

    # Find existing user by google_sub or email
    user = User.query.filter_by(google_sub=sub).first()
    if not user and email:
        user = User.query.filter_by(email=email).first()

    is_new = False
    if user:
        # Link Google to existing account and update profile
        user.google_sub = sub
        # Only use Google picture if user hasn't uploaded a custom avatar
        if not user.avatar_data:
            user.avatar_url = picture or user.avatar_url
        user.display_name = user.display_name or name
    else:
        # Create new user (no password since they auth via Google)
        is_new = True
        user = User(
            email=email,
            google_sub=sub,
            display_name=name or None,
            avatar_url=picture or None,
            is_verified=True,  # Google already verified the email
        )
        db.session.add(user)

    # Google users are always verified
    if not user.is_verified:
        user.is_verified = True

    db.session.commit()
    login_user(user)

    # Send welcome email for new users
    if is_new and email:
        try:
            send_welcome(email, name)
        except Exception:
            pass

    # Redirect to frontend
    return redirect(current_app.config["FRONTEND_ORIGIN"] + "/")


