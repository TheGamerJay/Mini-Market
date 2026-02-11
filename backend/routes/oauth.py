import os
from flask import Blueprint, request, jsonify, redirect, current_app
from flask_login import login_user
from authlib.integrations.flask_client import OAuth

from extensions import db
from models import User

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

    # Facebook OAuth
    fb_app_id = os.environ.get("FACEBOOK_APP_ID")
    fb_app_secret = os.environ.get("FACEBOOK_APP_SECRET")
    if fb_app_id and fb_app_secret:
        oauth.register(
            name="facebook",
            client_id=fb_app_id,
            client_secret=fb_app_secret,
            authorize_url="https://www.facebook.com/v19.0/dialog/oauth",
            access_token_url="https://graph.facebook.com/v19.0/oauth/access_token",
            api_base_url="https://graph.facebook.com/v19.0/",
            client_kwargs={"scope": "email public_profile"},
        )


@oauth_bp.get("/google/start")
def google_start():
    """Redirect the browser to Google's consent screen."""
    if not hasattr(oauth, "google"):
        return jsonify({"error": "Google OAuth not configured"}), 503
    redirect_uri = request.url_root.rstrip("/") + "/api/auth/google/callback"
    return oauth.google.authorize_redirect(redirect_uri)


@oauth_bp.get("/google/callback")
def google_callback():
    """Google redirects here after consent. Create/find user, log in via session, redirect to frontend."""
    token = oauth.google.authorize_access_token()
    userinfo = token.get("userinfo")
    if not userinfo:
        return jsonify({"error": "Google did not return user info"}), 400

    sub = userinfo.get("sub")
    email = userinfo.get("email", "")
    name = userinfo.get("name", "")
    picture = userinfo.get("picture", "")

    # Find existing user by google_sub or email
    user = User.query.filter_by(google_sub=sub).first()
    if not user and email:
        user = User.query.filter_by(email=email).first()

    if user:
        # Link Google to existing account and update profile
        user.google_sub = sub
        user.avatar_url = picture or user.avatar_url
        user.display_name = user.display_name or name
    else:
        # Create new user (no password since they auth via Google)
        user = User(
            email=email,
            google_sub=sub,
            display_name=name or None,
            avatar_url=picture or None,
        )
        db.session.add(user)

    db.session.commit()
    login_user(user)

    # Redirect to frontend
    return redirect(current_app.config["FRONTEND_ORIGIN"] + "/")


@oauth_bp.get("/facebook/start")
def facebook_start():
    """Redirect the browser to Facebook's consent screen."""
    if not hasattr(oauth, "facebook"):
        return jsonify({"error": "Facebook OAuth not configured"}), 503
    redirect_uri = request.url_root.rstrip("/") + "/api/auth/facebook/callback"
    return oauth.facebook.authorize_redirect(redirect_uri)


@oauth_bp.get("/facebook/callback")
def facebook_callback():
    """Facebook redirects here after consent. Create/find user, log in via session, redirect to frontend."""
    token = oauth.facebook.authorize_access_token()

    resp = oauth.facebook.get("me?fields=id,name,email,picture.width(200).height(200)")
    userinfo = resp.json()
    if not userinfo or not userinfo.get("id"):
        return jsonify({"error": "Facebook did not return user info"}), 400

    fb_id = userinfo["id"]
    email = userinfo.get("email", "")
    name = userinfo.get("name", "")
    picture = ""
    if userinfo.get("picture", {}).get("data", {}).get("url"):
        picture = userinfo["picture"]["data"]["url"]

    # Find existing user by facebook_id or email
    user = User.query.filter_by(facebook_id=fb_id).first()
    if not user and email:
        user = User.query.filter_by(email=email).first()

    if user:
        user.facebook_id = fb_id
        user.avatar_url = picture or user.avatar_url
        user.display_name = user.display_name or name
    else:
        if not email:
            return jsonify({"error": "Facebook account has no email. Please use a different login method."}), 400
        user = User(
            email=email,
            facebook_id=fb_id,
            display_name=name or None,
            avatar_url=picture or None,
        )
        db.session.add(user)

    db.session.commit()
    login_user(user)

    return redirect(current_app.config["FRONTEND_ORIGIN"] + "/")
