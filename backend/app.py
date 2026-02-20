import os, re
from datetime import datetime, timezone
from flask import Flask, jsonify, send_from_directory, request, make_response
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from dotenv import load_dotenv

from flask_login import current_user

from config import Config
from extensions import db, migrate, login_manager, limiter
from models import User, ListingImage, Listing
from routes import register_blueprints

load_dotenv()

# Sentry error tracking (init early to catch everything)
_sentry_dsn = os.getenv("SENTRY_DSN", "")
if _sentry_dsn:
    import sentry_sdk
    sentry_sdk.init(dsn=_sentry_dsn, traces_sample_rate=0.1, profiles_sample_rate=0.1)

STATIC_FOLDER = os.path.join(os.path.dirname(__file__), "static_frontend")

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Trust Railway's reverse proxy headers (X-Forwarded-Proto, etc.)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    # max upload size
    app.config["MAX_CONTENT_LENGTH"] = app.config["MAX_CONTENT_LENGTH_MB"] * 1024 * 1024

    # CORS
    CORS(
        app,
        supports_credentials=True,
        resources={r"/api/*": {"origins": [app.config["FRONTEND_ORIGIN"]]}}
    )

    # ensure upload folder exists
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    # init extensions
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    limiter.init_app(app)

    # Server-side sessions (Redis when available, PostgreSQL fallback)
    redis_url = app.config.get("REDIS_URL")
    if redis_url:
        import redis
        app.config["SESSION_REDIS"] = redis.from_url(redis_url)
    else:
        app.config["SESSION_SQLALCHEMY"] = db
    from flask_session import Session
    Session(app)

    with app.app_context():
        db.create_all()
        # Add columns that create_all() won't add to existing tables
        from sqlalchemy import text, inspect
        insp = inspect(db.engine)
        def _add_col(table, col, col_type):
            t_cols = {c["name"] for c in insp.get_columns(table)}
            if col not in t_cols:
                db.session.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
                return True
            return False

        changed = False
        changed |= _add_col("users", "avatar_data", "BYTEA")
        changed |= _add_col("users", "avatar_mime", "VARCHAR(32)")
        changed |= _add_col("users", "rating_avg", "NUMERIC DEFAULT 0")
        changed |= _add_col("users", "rating_count", "INTEGER DEFAULT 0")
        changed |= _add_col("users", "is_pro", "BOOLEAN DEFAULT FALSE")
        changed |= _add_col("listings", "buyer_id", "VARCHAR(36) REFERENCES users(id)")
        changed |= _add_col("users", "is_verified", "BOOLEAN DEFAULT FALSE")
        changed |= _add_col("users", "onboarding_done", "BOOLEAN DEFAULT FALSE")
        changed |= _add_col("listings", "renewed_at", "TIMESTAMP WITH TIME ZONE")
        changed |= _add_col("listings", "bundle_discount_pct", "INTEGER")
        changed |= _add_col("listings", "is_draft", "BOOLEAN DEFAULT FALSE")
        changed |= _add_col("listings", "is_demo", "BOOLEAN DEFAULT FALSE")
        changed |= _add_col("messages", "image_url", "TEXT")
        changed |= _add_col("users", "last_seen", "TIMESTAMP WITH TIME ZONE")
        changed |= _add_col("listings", "nudged_at", "TIMESTAMP WITH TIME ZONE")
        changed |= _add_col("users", "pro_free_boost_last_used_day", "VARCHAR(10)")
        changed |= _add_col("boosts", "boost_type", "VARCHAR(16) DEFAULT 'paid'")
        changed |= _add_col("boosts", "duration_hours", "INTEGER DEFAULT 24")
        changed |= _add_col("listing_images", "image_data", "BYTEA")
        changed |= _add_col("listing_images", "image_mime", "VARCHAR(32)")
        changed |= _add_col("reports", "listing_id", "VARCHAR(36) REFERENCES listings(id)")
        changed |= _add_col("users", "is_test_account", "BOOLEAN DEFAULT FALSE")
        changed |= _add_col("users", "is_admin", "BOOLEAN DEFAULT FALSE")
        changed |= _add_col("users", "is_banned", "BOOLEAN DEFAULT FALSE")
        changed |= _add_col("reports", "admin_notes", "TEXT")
        changed |= _add_col("reports", "resolved_by", "VARCHAR(36)")
        changed |= _add_col("reports", "resolved_at", "TIMESTAMP WITH TIME ZONE")
        if changed:
            db.session.commit()

        # Fix reports table columns that may have been created as INTEGER instead of VARCHAR(36)
        try:
            report_cols = {c["name"]: c for c in insp.get_columns("reports")}
            for col_name in ("id", "reporter_id", "reported_user_id"):
                col_info = report_cols.get(col_name)
                if col_info and "INT" in str(col_info["type"]).upper():
                    db.session.execute(text(
                        f"ALTER TABLE reports ALTER COLUMN {col_name} TYPE VARCHAR(36) USING {col_name}::VARCHAR(36)"
                    ))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # Partial unique index: only 1 active boost per listing at the DB level
        try:
            db.session.execute(text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_one_active_boost_per_listing "
                "ON boosts (listing_id) WHERE status = 'active'"
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()

        # One-time cleanup: remove old broken images (filesystem URLs) and empty listings
        # Use raw SQL to avoid ORM issues with missing columns
        try:
            result = db.session.execute(text(
                "DELETE FROM listing_images WHERE image_url LIKE '%/uploads/%' AND image_data IS NULL"
            ))
            if result.rowcount > 0:
                # Find listings with zero remaining images and delete them + dependents
                orphans = db.session.execute(text(
                    "SELECT id FROM listings WHERE id NOT IN (SELECT DISTINCT listing_id FROM listing_images)"
                )).fetchall()
                for (lid,) in orphans:
                    # Delete dependents via raw SQL — each wrapped individually
                    for tbl, col in [
                        ("boost_impressions", "boost_id IN (SELECT id FROM boosts WHERE listing_id=:lid)"),
                        ("boosts", "listing_id=:lid"),
                        ("messages", "conversation_id IN (SELECT id FROM conversations WHERE listing_id=:lid)"),
                        ("conversations", "listing_id=:lid"),
                        ("safe_meet_locations", "listing_id=:lid"),
                        ("safety_ack_events", "listing_id=:lid"),
                        ("observing", "listing_id=:lid"),
                        ("notifications", "listing_id=:lid"),
                        ("offers", "listing_id=:lid"),
                        ("price_history", "listing_id=:lid"),
                        ("reviews", "listing_id=:lid"),
                        ("listing_views", "listing_id=:lid"),
                        ("meetup_confirmations", "listing_id=:lid"),
                    ]:
                        try:
                            db.session.execute(text(f"DELETE FROM {tbl} WHERE {col}"), {"lid": lid})
                        except Exception:
                            db.session.rollback()
                    # Also try reports (column may not exist on older DBs)
                    try:
                        db.session.execute(text("DELETE FROM reports WHERE listing_id=:lid"), {"lid": lid})
                    except Exception:
                        db.session.rollback()
                    try:
                        db.session.execute(text("DELETE FROM listings WHERE id=:lid"), {"lid": lid})
                    except Exception:
                        db.session.rollback()
                db.session.commit()
        except Exception:
            db.session.rollback()

        # Bootstrap admin: promote ADMIN_EMAIL user to is_admin on startup
        admin_email = os.getenv("ADMIN_EMAIL", "").strip().lower()
        if admin_email:
            admin_user = User.query.filter_by(email=admin_email).first()
            if not admin_user:
                admin_user = User.query.filter(User.email.ilike(admin_email)).first()
            if admin_user and not admin_user.is_admin:
                admin_user.is_admin = True
                db.session.commit()

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, user_id)

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({"error": "Login required"}), 401

    register_blueprints(app)

    # Block write operations for test accounts (Stripe review)
    @app.before_request
    def _block_test_account_writes():
        if not current_user.is_authenticated:
            return
        if not getattr(current_user, "is_test_account", False):
            return
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return
        # Allow login/logout/me
        path = request.path
        if path in ("/api/auth/login", "/api/auth/logout", "/api/auth/me"):
            return
        return jsonify({"error": "This is a read-only review account"}), 403

    @app.before_request
    def _block_banned_users():
        if not current_user.is_authenticated:
            return
        if not getattr(current_user, "is_banned", False):
            return
        path = request.path
        if path in ("/api/auth/logout", "/api/auth/me"):
            return
        return jsonify({"error": "Your account has been suspended"}), 403

    @app.before_request
    def _update_last_seen():
        if not current_user.is_authenticated:
            return
        now = datetime.now(timezone.utc)
        # Only write to DB at most once per minute to avoid excessive writes
        if not current_user.last_seen or (now - current_user.last_seen).total_seconds() > 60:
            current_user.last_seen = now
            db.session.commit()

    @app.get("/api/health")
    def health():
        return jsonify({"ok": True}), 200

    @app.post("/api/admin/promote")
    def promote_admin():
        secret = request.headers.get("X-Cron-Secret") or request.args.get("secret")
        if secret != app.config["CRON_SECRET"]:
            return jsonify({"error": "Forbidden"}), 403
        data = request.get_json(force=True)
        email = (data.get("email") or "").strip().lower()
        u = User.query.filter_by(email=email).first()
        if not u:
            # Try case-insensitive search
            u = User.query.filter(User.email.ilike(email)).first()
        if not u:
            return jsonify({"error": "User not found", "searched": email}), 404
        u.is_admin = True
        db.session.commit()
        return jsonify({"ok": True, "email": u.email, "is_admin": True}), 200

    @app.get("/api/test-email")
    def test_email():
        import traceback
        try:
            from flask_login import current_user as cu
            if not cu.is_authenticated:
                return jsonify({"error": "Login required"}), 401
            from email_utils import send_email_sync
            status, result = send_email_sync(
                to=cu.email,
                subject="Pocket Market Test Email",
                body_html=f"<p>This is a test email for <b>{cu.display_name or cu.email}</b>. If you see this, email is working!</p>",
            )
            return jsonify({"ok": status < 400, "sent_to": cu.email, "status": status, "resend": result}), 200
        except Exception as e:
            return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

    @app.post("/api/admin/seed-demo")
    def seed_demo():
        import urllib.request
        secret = request.headers.get("X-Cron-Secret") or request.args.get("secret")
        if secret != app.config["CRON_SECRET"]:
            return jsonify({"error": "Forbidden"}), 403

        # Get or create a demo seller account
        demo_email = "demo@pocket-market.com"
        demo_user = User.query.filter_by(email=demo_email).first()
        if not demo_user:
            demo_user = User(
                email=demo_email,
                display_name="Demo Seller",
                is_verified=True,
            )
            demo_user.set_password("demo-not-a-real-account")
            db.session.add(demo_user)
            db.session.flush()

        _desc = "This is a demo listing. Pocket Market is a peer-to-peer marketplace where items are listed and sold by individual users."
        demos = [
            {"title":"Vintage Bluetooth Speaker (Demo)","price_cents":4500,"category":"Electronics","condition":"Like New","zip":"90001","pickup_or_shipping":"pickup","image_url":"https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80","description":_desc},
            {"title":"Mountain Bike - 21 Speed (Demo)","price_cents":12000,"category":"Sports","condition":"Used","zip":"90001","pickup_or_shipping":"pickup","image_url":"https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=600&q=80","description":_desc},
            {"title":"Leather Jacket - Size M (Demo)","price_cents":8500,"category":"Clothing","condition":"Like New","zip":"10001","pickup_or_shipping":"shipping","image_url":"https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80","description":_desc},
            {"title":"Standing Desk - Adjustable (Demo)","price_cents":22000,"category":"Furniture","condition":"Used","zip":"60601","pickup_or_shipping":"pickup","image_url":"https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600&q=80","description":_desc},
            {"title":"iPad Air 5th Gen 64GB (Demo)","price_cents":35000,"category":"Electronics","condition":"Like New","zip":"94102","pickup_or_shipping":"shipping","image_url":"https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80","description":_desc},
            {"title":"Acoustic Guitar - Yamaha (Demo)","price_cents":15000,"category":"Other","condition":"Used","zip":"78701","pickup_or_shipping":"pickup","image_url":"https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600&q=80","description":_desc},
            {"title":"Nike Air Max 90 Size 10 (Demo)","price_cents":6500,"category":"Clothing","condition":"New","zip":"33101","pickup_or_shipping":"shipping","image_url":"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80","description":_desc},
            {"title":"PS5 DualSense Controller (Demo)","price_cents":4000,"category":"Electronics","condition":"Like New","zip":"90001","pickup_or_shipping":"shipping","image_url":"https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=600&q=80","description":_desc},
            {"title":"Vintage Polaroid Camera (Demo)","price_cents":7500,"category":"Electronics","condition":"Used","zip":"02101","pickup_or_shipping":"shipping","image_url":"https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&q=80","description":_desc},
            {"title":"Camping Tent - 4 Person (Demo)","price_cents":9500,"category":"Sports","condition":"Used","zip":"80202","pickup_or_shipping":"pickup","image_url":"https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&q=80","description":_desc},
            {"title":"Mid-Century Coffee Table (Demo)","price_cents":18000,"category":"Furniture","condition":"Used","zip":"97201","pickup_or_shipping":"pickup","image_url":"https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=600&q=80","description":_desc},
            {"title":"Canon EOS Rebel T7 DSLR (Demo)","price_cents":42000,"category":"Electronics","condition":"Like New","zip":"10001","pickup_or_shipping":"shipping","image_url":"https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80","description":_desc},
            {"title":"Oil Painting - Abstract Art (Demo)","price_cents":25000,"category":"Art","condition":"New","zip":"60601","pickup_or_shipping":"shipping","image_url":"https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&q=80","description":_desc},
            {"title":"Harry Potter Complete Box Set (Demo)","price_cents":3500,"category":"Books","condition":"Like New","zip":"94102","pickup_or_shipping":"shipping","image_url":"https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80","description":_desc},
            {"title":"Yoga Mat - Extra Thick (Demo)","price_cents":2500,"category":"Sports","condition":"New","zip":"78701","pickup_or_shipping":"shipping","image_url":"https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&q=80","description":_desc},
            {"title":"LEGO Star Wars Millennium Falcon (Demo)","price_cents":11000,"category":"Toys","condition":"New","zip":"33101","pickup_or_shipping":"shipping","image_url":"https://images.unsplash.com/photo-1587654780291-39c9404d7dd0?w=600&q=80","description":_desc},
            {"title":"KitchenAid Stand Mixer (Demo)","price_cents":19500,"category":"Home","condition":"Used","zip":"02101","pickup_or_shipping":"pickup","image_url":"https://images.unsplash.com/photo-1594385208974-2f8bb63e236b?w=600&q=80","description":_desc},
            {"title":"Car Floor Mats - Universal (Demo)","price_cents":3000,"category":"Auto","condition":"New","zip":"80202","pickup_or_shipping":"shipping","image_url":"https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=600&q=80","description":_desc},
            {"title":"Wireless Earbuds - AirPods Pro (Demo)","price_cents":16000,"category":"Electronics","condition":"Like New","zip":"90001","pickup_or_shipping":"shipping","image_url":"https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=600&q=80","description":_desc},
            {"title":"Vintage Denim Jacket (Demo)","price_cents":5500,"category":"Clothing","condition":"Used","zip":"10001","pickup_or_shipping":"shipping","image_url":"https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&q=80","description":_desc},
            {"title":"Bookshelf - Solid Wood (Demo)","price_cents":14000,"category":"Furniture","condition":"Used","zip":"60601","pickup_or_shipping":"pickup","image_url":"https://images.unsplash.com/photo-1594620302200-9a762244a156?w=600&q=80","description":_desc},
            {"title":"Nintendo Switch OLED (Demo)","price_cents":28000,"category":"Electronics","condition":"Like New","zip":"94102","pickup_or_shipping":"shipping","image_url":"https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=600&q=80","description":_desc},
            {"title":"Watercolor Paint Set (Demo)","price_cents":4500,"category":"Art","condition":"New","zip":"78701","pickup_or_shipping":"shipping","image_url":"https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&q=80","description":_desc},
            {"title":"Running Shoes - Adidas (Demo)","price_cents":5000,"category":"Sports","condition":"Like New","zip":"33101","pickup_or_shipping":"shipping","image_url":"https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&q=80","description":_desc},
            {"title":"Board Game Collection (Demo)","price_cents":6000,"category":"Toys","condition":"Used","zip":"02101","pickup_or_shipping":"pickup","image_url":"https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=600&q=80","description":_desc},
            {"title":"Robot Vacuum Cleaner (Demo)","price_cents":17500,"category":"Home","condition":"Like New","zip":"80202","pickup_or_shipping":"pickup","image_url":"https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80","description":_desc},
            {"title":"Dash Cam - 4K Front+Rear (Demo)","price_cents":8000,"category":"Auto","condition":"New","zip":"97201","pickup_or_shipping":"shipping","image_url":"https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&q=80","description":_desc},
            {"title":"MacBook Pro 14\" M2 (Demo)","price_cents":120000,"category":"Electronics","condition":"Used","zip":"90001","pickup_or_shipping":"shipping","image_url":"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80","description":_desc},
            {"title":"Winter Puffer Jacket (Demo)","price_cents":7000,"category":"Clothing","condition":"Like New","zip":"10001","pickup_or_shipping":"shipping","image_url":"https://images.unsplash.com/photo-1544923246-77307dd270cb?w=600&q=80","description":_desc},
            {"title":"Dining Table Set - 6 Chairs (Demo)","price_cents":45000,"category":"Furniture","condition":"Used","zip":"60601","pickup_or_shipping":"pickup","image_url":"https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600&q=80","description":_desc},
            {"title":"Mechanical Keyboard RGB (Demo)","price_cents":8500,"category":"Electronics","condition":"New","zip":"94102","pickup_or_shipping":"shipping","image_url":"https://images.unsplash.com/photo-1595225476474-87563907a212?w=600&q=80","description":_desc},
            {"title":"Skateboard - Complete Setup (Demo)","price_cents":7500,"category":"Sports","condition":"Used","zip":"78701","pickup_or_shipping":"pickup","image_url":"https://images.unsplash.com/photo-1547447134-cd3f5c716030?w=600&q=80","description":_desc},
            {"title":"Framed Photography Print (Demo)","price_cents":12000,"category":"Art","condition":"New","zip":"33101","pickup_or_shipping":"shipping","image_url":"https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&q=80","description":_desc},
            {"title":"Cookbook Collection - 5 Books (Demo)","price_cents":2000,"category":"Books","condition":"Used","zip":"02101","pickup_or_shipping":"shipping","image_url":"https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=600&q=80","description":_desc},
            {"title":"Action Figure Set (Demo)","price_cents":3500,"category":"Toys","condition":"Like New","zip":"80202","pickup_or_shipping":"shipping","image_url":"https://images.unsplash.com/photo-1558507334-57300f59f0bd?w=600&q=80","description":_desc},
            {"title":"Air Purifier - HEPA Filter (Demo)","price_cents":13000,"category":"Home","condition":"Like New","zip":"97201","pickup_or_shipping":"pickup","image_url":"https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80","description":_desc},
            {"title":"Roof Rack - Universal Fit (Demo)","price_cents":15000,"category":"Auto","condition":"Used","zip":"90001","pickup_or_shipping":"pickup","image_url":"https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80","description":_desc},
            {"title":"Drone - DJI Mini 3 (Demo)","price_cents":38000,"category":"Electronics","condition":"Like New","zip":"10001","pickup_or_shipping":"shipping","image_url":"https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=600&q=80","description":_desc},
            {"title":"Sunglasses - Ray-Ban Aviator (Demo)","price_cents":9000,"category":"Clothing","condition":"New","zip":"60601","pickup_or_shipping":"shipping","image_url":"https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&q=80","description":_desc},
            {"title":"Bean Bag Chair - Giant (Demo)","price_cents":8000,"category":"Furniture","condition":"New","zip":"94102","pickup_or_shipping":"pickup","image_url":"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80","description":_desc},
        ]

        created = []
        for d in demos:
            image_url = d.pop("image_url")
            # Check if this demo listing already exists
            existing = Listing.query.filter_by(title=d["title"], is_demo=True).first()
            if existing:
                # Add image if missing
                has_img = ListingImage.query.filter_by(listing_id=existing.id).first()
                if not has_img:
                    try:
                        img_data = urllib.request.urlopen(image_url, timeout=15).read()
                        img_record = ListingImage(
                            listing_id=existing.id,
                            image_url="",
                            image_data=img_data,
                            image_mime="image/jpeg",
                        )
                        db.session.add(img_record)
                        db.session.flush()
                        img_record.image_url = f"/api/listings/image/{img_record.id}"
                        created.append(f"{existing.title} (image added)")
                    except Exception as e:
                        created.append(f"{existing.title} (image failed: {e})")
                else:
                    created.append(f"{existing.title} (already has image)")
                continue

            listing = Listing(user_id=demo_user.id, is_demo=True, **d)
            db.session.add(listing)
            db.session.flush()

            # Download and attach image
            try:
                img_data = urllib.request.urlopen(image_url, timeout=15).read()
                img_record = ListingImage(
                    listing_id=listing.id,
                    image_url="",
                    image_data=img_data,
                    image_mime="image/jpeg",
                )
                db.session.add(img_record)
                db.session.flush()
                img_record.image_url = f"/api/listings/image/{img_record.id}"
            except Exception:
                pass
            created.append(d["title"])

        db.session.commit()
        return jsonify({"ok": True, "created": created}), 201

    # ── Serve the React frontend ──
    OG_BOTS = ["facebookexternalhit", "twitterbot", "linkedinbot", "slackbot",
               "discordbot", "whatsapp", "telegrambot", "pinterest", "redditbot", "skypeuripreview"]

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        # Open Graph for social bots on listing pages
        ua = (request.headers.get("User-Agent") or "").lower()
        is_bot = any(b in ua for b in OG_BOTS)
        listing_match = re.match(r"^listing/([a-f0-9-]+)/?$", path)

        if is_bot and listing_match:
            from models import Listing, ListingImage
            lid = listing_match.group(1)
            listing = db.session.get(Listing, lid)
            if listing:
                img = ListingImage.query.filter_by(listing_id=lid).order_by(ListingImage.created_at.asc()).first()
                img_url = f"https://pocket-market.com{img.image_url}" if img else "https://pocket-market.com/pocketmarket_favicon_transparent_512x512.png"
                price = f"${listing.price_cents / 100:.2f}"
                desc = (listing.description or listing.title or "")[:200]
                og = f"""<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta property="og:type" content="product">
<meta property="og:title" content="{listing.title} - {price}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{img_url}">
<meta property="og:url" content="https://pocket-market.com/listing/{lid}">
<meta property="og:site_name" content="Pocket Market">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{listing.title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{img_url}">
<title>{listing.title} - Pocket Market</title>
</head><body><h1>{listing.title}</h1><p>{price}</p></body></html>"""
                return make_response(og, 200, {"Content-Type": "text/html; charset=utf-8"})

        full = os.path.join(STATIC_FOLDER, path)
        if path and os.path.isfile(full):
            return send_from_directory(STATIC_FOLDER, path)
        index = os.path.join(STATIC_FOLDER, "index.html")
        if os.path.isfile(index):
            return send_from_directory(STATIC_FOLDER, "index.html")
        return jsonify({"error": "Frontend not built"}), 404

    return app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
