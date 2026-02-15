import uuid
import requests as http_requests
from datetime import datetime, timezone

from flask import current_app


SUPPORT_EMAIL = "pocketmarket.help@gmail.com"
BRAND_COLOR = "#3ee0ff"

HEADER = f"""
<div style="text-align:center;padding:24px 0 16px;">
    <h1 style="margin:0;font-size:22px;color:{BRAND_COLOR};letter-spacing:0.5px;">Pocket Market</h1>
</div>
"""

FOOTER = f"""
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e0e0e0;font-size:11px;color:#999;line-height:1.6;text-align:center;">
    <p>Pocket Market &mdash; Buy &amp; sell locally, instantly.</p>
    <p><a href="https://pocket-market.com" style="color:{BRAND_COLOR};text-decoration:none;">pocket-market.com</a></p>
    <p style="margin-top:8px;">If you didn't expect this email, you can safely ignore it.<br>
    Pocket Market will never ask for your password.</p>
</div>
"""


def _wrap(inner_html):
    """Wrap email content in a consistent outer layout."""
    return f"""
    <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#333;">
        {HEADER}
        {inner_html}
        {FOOTER}
    </div>
    """


def _ticket_id(prefix="PM"):
    short = uuid.uuid4().hex[:6].upper()
    return f"{prefix}-{short}"


def send_email(to, subject, body_html, reply_to=None):
    """Send an email via Resend API (synchronous)."""
    api_key = current_app.config.get("RESEND_API_KEY")
    if not api_key:
        current_app.logger.warning("RESEND_API_KEY not set, skipping email")
        return

    from_addr = current_app.config.get("RESEND_FROM", "Pocket Market <noreply@pocket-market.com>")
    payload = {
        "from": from_addr,
        "to": [to],
        "subject": subject,
        "html": body_html,
    }
    if reply_to:
        payload["reply_to"] = reply_to

    try:
        resp = http_requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {api_key}"},
            json=payload,
            timeout=10,
        )
        if resp.status_code >= 400:
            current_app.logger.error(f"Resend API error {resp.status_code}: {resp.text}")
    except Exception as e:
        current_app.logger.error(f"Failed to send email: {e}")


def send_email_sync(to, subject, body_html, reply_to=None):
    """Send an email via Resend synchronously and return the result."""
    api_key = current_app.config.get("RESEND_API_KEY")
    if not api_key:
        raise ValueError("RESEND_API_KEY not set")

    from_addr = current_app.config.get("RESEND_FROM", "Pocket Market <noreply@pocket-market.com>")
    payload = {
        "from": from_addr,
        "to": [to],
        "subject": subject,
        "html": body_html,
    }
    if reply_to:
        payload["reply_to"] = reply_to

    resp = http_requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {api_key}"},
        json=payload,
        timeout=10,
    )
    return resp.status_code, resp.json()


# ── Email Templates ──────────────────────────────────────────────


def send_welcome(email, display_name):
    name = display_name or "there"
    send_email(
        to=email,
        subject=f"Welcome to Pocket Market, {name}!",
        reply_to=SUPPORT_EMAIL,
        body_html=_wrap(f"""
            <h2 style="color:{BRAND_COLOR};margin-top:0;">Welcome aboard!</h2>
            <p>Hi {name},</p>
            <p>Thanks for joining Pocket Market &mdash; the simple, fast way to buy and sell locally.</p>
            <p style="margin-top:20px;"><strong>Here's what you can do:</strong></p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                <tr>
                    <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;">
                        <strong>Post items</strong><br>
                        <span style="color:#666;font-size:13px;">List something in seconds &mdash; add a photo, set your price, done.</span>
                    </td>
                </tr>
                <tr>
                    <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;">
                        <strong>Browse &amp; search</strong><br>
                        <span style="color:#666;font-size:13px;">Find what you need from people nearby.</span>
                    </td>
                </tr>
                <tr>
                    <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;">
                        <strong>Message sellers</strong><br>
                        <span style="color:#666;font-size:13px;">Chat directly to ask questions or make offers.</span>
                    </td>
                </tr>
                <tr>
                    <td style="padding:10px 12px;font-size:14px;">
                        <strong>Save for later</strong><br>
                        <span style="color:#666;font-size:13px;">Bookmark items you want to come back to.</span>
                    </td>
                </tr>
            </table>
            <div style="text-align:center;margin:24px 0;">
                <a href="https://pocket-market.com" style="display:inline-block;background:{BRAND_COLOR};color:#000;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:15px;">Start Browsing</a>
            </div>
            <p style="font-size:13px;color:#666;">Need help? Just reply to this email &mdash; we're here for you.</p>
        """),
    )


def send_support_auto_reply(email, display_name, message_type):
    name = display_name or "there"
    ticket = _ticket_id("PM")
    label = "bug report" if message_type == "report" else "message"
    send_email(
        to=email,
        subject=f"We got your {label} [{ticket}]",
        reply_to=SUPPORT_EMAIL,
        body_html=_wrap(f"""
            <p style="font-size:12px;color:#999;margin-top:0;">Ticket: {ticket}</p>
            <h2 style="color:{BRAND_COLOR};margin-top:8px;">We got your {label}!</h2>
            <p>Hi {name},</p>
            <p>Thanks for reaching out. Our team has received your {label} and will review it shortly.</p>
            <div style="background:#f8f8f8;border-left:3px solid {BRAND_COLOR};padding:12px 16px;margin:20px 0;border-radius:4px;">
                <p style="margin:0;font-size:14px;"><strong>What happens next?</strong></p>
                <p style="margin:8px 0 0;font-size:13px;color:#666;">You can expect a reply within <strong>24&ndash;48 hours</strong>. If you need to add anything, just reply to this email &mdash; it will be attached to your ticket.</p>
            </div>
            <p style="font-size:13px;color:#666;">Thanks for helping us make Pocket Market better.</p>
            <p>&mdash; <strong>Pocket Market Support</strong></p>
        """),
    )


def send_report_auto_reply(email, display_name, reason, listing_title=None):
    name = display_name or "there"
    ticket = _ticket_id("PM-RPT")
    listing_line = f'<p style="margin:4px 0;font-size:13px;"><strong>Listing:</strong> {listing_title}</p>' if listing_title else ""
    send_email(
        to=email,
        subject=f"Report received [{ticket}]",
        reply_to=SUPPORT_EMAIL,
        body_html=_wrap(f"""
            <p style="font-size:12px;color:#999;margin-top:0;">Ticket: {ticket}</p>
            <h2 style="color:{BRAND_COLOR};margin-top:8px;">Report Received</h2>
            <p>Hi {name},</p>
            <p>Thanks for helping keep Pocket Market safe. We've received your report and our team will review it.</p>
            <div style="background:#f8f8f8;padding:12px 16px;margin:20px 0;border-radius:8px;border:1px solid #eee;">
                {listing_line}
                <p style="margin:4px 0;font-size:13px;"><strong>Reason:</strong> {reason}</p>
            </div>
            <p style="font-size:13px;color:#666;">We take every report seriously. While we may not be able to share the specific outcome, please know that every report is reviewed by our team.</p>
            <p>Appreciate you looking out,<br><strong>Pocket Market Safety Team</strong></p>
        """),
    )


def notify_support_contact(user_email, display_name, user_id, message, message_type,
                           user_agent=None, page_url=None):
    """Send support/report notification to admin inbox. Reply-To = user's email."""
    label = "Bug Report" if message_type == "report" else "Support Request"
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    name = display_name or "Unknown"

    device_line = f"<tr><td style='padding:4px 8px;font-weight:600;'>Device</td><td style='padding:4px 8px;'>{user_agent}</td></tr>" if user_agent else ""
    page_line = f"<tr><td style='padding:4px 8px;font-weight:600;'>Page</td><td style='padding:4px 8px;'>{page_url}</td></tr>" if page_url else ""
    uid_line = f"<tr><td style='padding:4px 8px;font-weight:600;'>User ID</td><td style='padding:4px 8px;'>{user_id}</td></tr>" if user_id else ""

    send_email(
        to=SUPPORT_EMAIL,
        subject=f"[Pocket Market] {label} from {name}",
        reply_to=user_email,
        body_html=f"""
        <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:16px;color:#333;">
            <h2 style="color:{BRAND_COLOR};margin-top:0;">New {label}</h2>
            <table style="border-collapse:collapse;font-size:14px;margin:12px 0;">
                <tr><td style="padding:4px 8px;font-weight:600;">From</td><td style="padding:4px 8px;">{name} ({user_email})</td></tr>
                {uid_line}
                <tr><td style="padding:4px 8px;font-weight:600;">Time</td><td style="padding:4px 8px;">{now}</td></tr>
                {device_line}
                {page_line}
            </table>
            <hr style="border:0;border-top:1px solid #e0e0e0;margin:16px 0;">
            <p style="font-weight:600;margin-bottom:8px;">Message:</p>
            <div style="background:#f5f5f5;padding:14px;border-radius:8px;white-space:pre-wrap;font-size:14px;line-height:1.5;">{message}</div>
            <p style="margin-top:16px;font-size:12px;color:#999;">Reply directly to respond to the user.</p>
        </div>
        """,
    )


def notify_report(reporter_email, reported_email, listing_title, listing_id, reason,
                  reporter_id=None):
    """Send report notification to admin inbox. Reply-To = reporter's email."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    send_email(
        to=SUPPORT_EMAIL,
        subject=f"[Report] {reason} — {listing_title or 'User report'}",
        reply_to=reporter_email,
        body_html=f"""
        <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:16px;color:#333;">
            <h2 style="color:#e74c3c;margin-top:0;">Listing Report</h2>
            <table style="border-collapse:collapse;font-size:14px;margin:12px 0;">
                <tr><td style="padding:4px 8px;font-weight:600;">Reporter</td><td style="padding:4px 8px;">{reporter_email}</td></tr>
                <tr><td style="padding:4px 8px;font-weight:600;">Reported user</td><td style="padding:4px 8px;">{reported_email}</td></tr>
                <tr><td style="padding:4px 8px;font-weight:600;">Listing</td><td style="padding:4px 8px;">{listing_title or 'N/A'} (ID: {listing_id})</td></tr>
                <tr><td style="padding:4px 8px;font-weight:600;">Reason</td><td style="padding:4px 8px;">{reason}</td></tr>
                <tr><td style="padding:4px 8px;font-weight:600;">Time</td><td style="padding:4px 8px;">{now}</td></tr>
            </table>
            <hr style="border:0;border-top:1px solid #e0e0e0;margin:16px 0;">
            <p style="font-size:13px;color:#666;"><strong>Action:</strong> Review listing + user history.</p>
            <p style="margin-top:16px;font-size:12px;color:#999;">Reply directly to respond to the reporter.</p>
        </div>
        """,
    )


# ── New email templates ─────────────────────────────────────────


def send_password_reset(email, display_name, token):
    name = display_name or "there"
    link = f"https://pocket-market.com/reset?token={token}"
    send_email(
        to=email,
        subject="Reset your Pocket Market password",
        reply_to=SUPPORT_EMAIL,
        body_html=_wrap(f"""
            <h2 style="color:{BRAND_COLOR};margin-top:0;">Password Reset</h2>
            <p>Hi {name},</p>
            <p>We received a request to reset your password. Click the button below to choose a new one:</p>
            <div style="text-align:center;margin:24px 0;">
                <a href="{link}" style="display:inline-block;background:{BRAND_COLOR};color:#000;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:15px;">Reset Password</a>
            </div>
            <p style="font-size:13px;color:#666;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        """),
    )


def send_verification_email(email, display_name, token):
    name = display_name or "there"
    link = f"https://pocket-market.com/verify?token={token}"
    send_email(
        to=email,
        subject="Verify your Pocket Market email",
        reply_to=SUPPORT_EMAIL,
        body_html=_wrap(f"""
            <h2 style="color:{BRAND_COLOR};margin-top:0;">Verify Your Email</h2>
            <p>Hi {name},</p>
            <p>Please verify your email address to unlock your verified badge and full access to Pocket Market.</p>
            <div style="text-align:center;margin:24px 0;">
                <a href="{link}" style="display:inline-block;background:{BRAND_COLOR};color:#000;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:15px;">Verify Email</a>
            </div>
            <p style="font-size:13px;color:#666;">This link expires in 7 days.</p>
        """),
    )


def send_message_notification(recipient_email, recipient_name, sender_name, listing_title, conversation_id):
    name = recipient_name or "there"
    sender = sender_name or "Someone"
    listing = listing_title or "a listing"
    link = f"https://pocket-market.com/chat/{conversation_id}"
    send_email(
        to=recipient_email,
        subject=f"{sender} sent you a message on Pocket Market",
        reply_to=SUPPORT_EMAIL,
        body_html=_wrap(f"""
            <h2 style="color:{BRAND_COLOR};margin-top:0;">New Message</h2>
            <p>Hi {name},</p>
            <p><strong>{sender}</strong> sent you a message about <strong>{listing}</strong>.</p>
            <div style="text-align:center;margin:24px 0;">
                <a href="{link}" style="display:inline-block;background:{BRAND_COLOR};color:#000;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:15px;">View Message</a>
            </div>
            <p style="font-size:13px;color:#666;">You're receiving this because you haven't been online recently.</p>
        """),
    )


def send_price_drop_alert(observer_email, observer_name, listing_title, listing_id, old_price_cents, new_price_cents):
    name = observer_name or "there"
    old_price = f"${old_price_cents / 100:.2f}"
    new_price = f"${new_price_cents / 100:.2f}"
    link = f"https://pocket-market.com/listing/{listing_id}"
    send_email(
        to=observer_email,
        subject=f"Price drop! {listing_title} is now {new_price}",
        reply_to=SUPPORT_EMAIL,
        body_html=_wrap(f"""
            <h2 style="color:{BRAND_COLOR};margin-top:0;">Price Drop Alert</h2>
            <p>Hi {name},</p>
            <p>An item you're watching just got cheaper!</p>
            <div style="background:#f8f8f8;padding:16px;border-radius:8px;margin:16px 0;text-align:center;">
                <div style="font-weight:700;font-size:16px;margin-bottom:8px;">{listing_title}</div>
                <span style="text-decoration:line-through;color:#999;font-size:14px;">{old_price}</span>
                <span style="font-size:20px;font-weight:800;color:#27ae60;margin-left:8px;">{new_price}</span>
            </div>
            <div style="text-align:center;margin:24px 0;">
                <a href="{link}" style="display:inline-block;background:{BRAND_COLOR};color:#000;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:15px;">View Listing</a>
            </div>
        """),
    )


def send_stale_listing_nudge(seller_email, seller_name, listing_title, listing_id, days_old):
    name = seller_name or "there"
    link = f"https://pocket-market.com/listing/{listing_id}"
    send_email(
        to=seller_email,
        subject=f"Your listing \"{listing_title}\" hasn't had any offers",
        reply_to=SUPPORT_EMAIL,
        body_html=_wrap(f"""
            <h2 style="color:{BRAND_COLOR};margin-top:0;">Time for a Price Check?</h2>
            <p>Hi {name},</p>
            <p>Your listing <strong>{listing_title}</strong> has been up for <strong>{days_old} days</strong> without any offers.</p>
            <div style="background:#f8f8f8;border-left:3px solid {BRAND_COLOR};padding:12px 16px;margin:20px 0;border-radius:4px;">
                <p style="margin:0;font-size:14px;"><strong>Quick tips to sell faster:</strong></p>
                <ul style="margin:8px 0 0;padding-left:20px;font-size:13px;color:#666;line-height:1.8;">
                    <li>Lower the price to attract offers</li>
                    <li>Add more photos from different angles</li>
                    <li>Update the description with more details</li>
                </ul>
            </div>
            <div style="text-align:center;margin:24px 0;">
                <a href="{link}" style="display:inline-block;background:{BRAND_COLOR};color:#000;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:15px;">Edit Listing</a>
            </div>
        """),
    )
