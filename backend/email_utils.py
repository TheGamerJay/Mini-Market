import threading
import uuid
import smtplib
import re
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText as MIMETextPart
from email.utils import formatdate, make_msgid

from flask import current_app


SUPPORT_EMAIL = "pocketmarket.help@gmail.com"

FOOTER = """
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e0e0e0;font-size:11px;color:#999;line-height:1.6;">
    <p>If you didn't request this, you can ignore this email.</p>
    <p>Pocket Market will never ask for your password.</p>
</div>
"""


def _ticket_id(prefix="PM"):
    short = uuid.uuid4().hex[:6].upper()
    return f"{prefix}-{short}"


def _html_to_text(html):
    """Strip HTML tags to create a plain-text version."""
    text = re.sub(r'<br\s*/?>', '\n', html)
    text = re.sub(r'<li[^>]*>', '- ', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'&mdash;', '--', text)
    text = re.sub(r'&ndash;', '-', text)
    text = re.sub(r'&amp;', '&', text)
    text = re.sub(r'&[a-z]+;', '', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def _send_async(app, to, subject, body_html, reply_to=None):
    with app.app_context():
        try:
            sender = app.config.get("MAIL_USERNAME")
            password = app.config.get("MAIL_PASSWORD")

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"Pocket Market <{sender}>"
            msg["To"] = to
            msg["Date"] = formatdate(localtime=True)
            msg["Message-ID"] = make_msgid(domain="pocket-market.com")
            if reply_to:
                msg["Reply-To"] = reply_to

            # Plain text version (required for good deliverability)
            msg.attach(MIMETextPart(_html_to_text(body_html), "plain", "utf-8"))
            # HTML version
            msg.attach(MIMETextPart(body_html, "html", "utf-8"))

            smtp = smtplib.SMTP("smtp.gmail.com", 587)
            smtp.starttls()
            smtp.login(sender, password)
            smtp.sendmail(sender, [to], msg.as_string())
            smtp.quit()
        except Exception as e:
            app.logger.error(f"Failed to send email: {e}")


def send_email(to, subject, body_html, reply_to=None):
    """Send an email in a background thread so it doesn't block the request."""
    if not current_app.config.get("MAIL_USERNAME"):
        current_app.logger.warning("MAIL_USERNAME not set, skipping email")
        return

    app = current_app._get_current_object()
    thread = threading.Thread(target=_send_async, args=(app, to, subject, body_html, reply_to))
    thread.start()


def send_welcome(email, display_name):
    name = display_name or "there"
    send_email(
        to=email,
        subject=f"Welcome to Pocket Market, {name} \U0001F44B",
        reply_to=SUPPORT_EMAIL,
        body_html=f"""
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
            <h2 style="color:#3ee0ff;">Welcome to Pocket Market!</h2>
            <p>Hi {name},</p>
            <p>Welcome to Pocket Market &mdash; your simple, fast way to buy and sell locally.</p>
            <p>Here's what you can do right now:</p>
            <ul style="line-height:2;">
                <li>\U0001F4F8 <strong>Post items</strong> in seconds (title, price, photo)</li>
                <li>\U0001F50D <strong>Browse listings</strong> and search what you need</li>
                <li>\U0001F4AC <strong>Message sellers</strong> directly</li>
                <li>\u2B50 <strong>Save items</strong> you want to check later</li>
            </ul>
            <p>If you ever need help, just reply to this email &mdash; we actually read every message.</p>
            <p>Welcome again,<br>
            <strong>Pocket Market Support</strong><br>
            <a href="mailto:{SUPPORT_EMAIL}" style="color:#3ee0ff;">{SUPPORT_EMAIL}</a></p>
            {FOOTER}
        </div>
        """,
    )


def send_support_auto_reply(email, display_name, message_type):
    name = display_name or "there"
    ticket = _ticket_id("PM")
    send_email(
        to=email,
        subject="We got your message \u2705",
        reply_to=SUPPORT_EMAIL,
        body_html=f"""
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
            <p style="font-size:12px;color:#999;">Ticket ID: {ticket}</p>
            <h2 style="color:#3ee0ff;">We got your message!</h2>
            <p>Hi {name},</p>
            <p>Thanks for reaching out &mdash; we received your message and our team will review it.<br>
            You can expect a reply within <strong>24&ndash;48 business hours</strong>.</p>
            <p>If you need to add anything else, just reply to this email and it will attach to your request.</p>
            <p>&mdash; Pocket Market Support<br>
            <a href="mailto:{SUPPORT_EMAIL}" style="color:#3ee0ff;">{SUPPORT_EMAIL}</a></p>
            {FOOTER}
        </div>
        """,
    )


def send_report_auto_reply(email, display_name, reason, listing_title=None):
    name = display_name or "there"
    ticket = _ticket_id("PM-RPT")
    listing_line = f"<p><strong>Listing:</strong> {listing_title}</p>" if listing_title else ""
    send_email(
        to=email,
        subject="We received your report \u2705",
        reply_to=SUPPORT_EMAIL,
        body_html=f"""
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
            <p style="font-size:12px;color:#999;">Ticket ID: {ticket}</p>
            <h2 style="color:#3ee0ff;">Report Received</h2>
            <p>Hi {name},</p>
            <p>Thanks for helping keep Pocket Market safe. We received your report for:</p>
            {listing_line}
            <p><strong>Reason selected:</strong> {reason}</p>
            <p>Our team will review it and take appropriate action if needed.<br>
            We may not be able to share the outcome, but every report is reviewed.</p>
            <p>Appreciate you,<br>
            <strong>Pocket Market Safety Team</strong></p>
            {FOOTER}
        </div>
        """,
    )


def notify_support_contact(user_email, display_name, user_id, message, message_type,
                           user_agent=None, page_url=None):
    """Send support/report notification to admin inbox. Reply-To = user's email."""
    label = "Bug Report" if message_type == "report" else "Support Request"
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    name = display_name or "Unknown"

    device_line = f"<p><strong>Device:</strong> {user_agent}</p>" if user_agent else ""
    page_line = f"<p><strong>Page:</strong> {page_url}</p>" if page_url else ""
    uid_line = f"<p><strong>User ID:</strong> {user_id}</p>" if user_id else ""

    send_email(
        to=SUPPORT_EMAIL,
        subject=f"[Pocket Market] {label} from {user_email}",
        reply_to=user_email,
        body_html=f"""
        <div style="font-family:sans-serif;padding:16px;">
            <h3>New {label}</h3>
            <p><strong>Name:</strong> {name}</p>
            <p><strong>Email:</strong> {user_email}</p>
            {uid_line}
            <p><strong>Time:</strong> {now}</p>
            <hr style="border:0;border-top:1px solid #e0e0e0;margin:16px 0;">
            <p><strong>Message:</strong></p>
            <div style="background:#f5f5f5;padding:12px;border-radius:8px;white-space:pre-wrap;">{message}</div>
            {device_line}
            {page_line}
            <p style="margin-top:16px;font-size:12px;color:#999;">Reply directly to respond to the user.</p>
        </div>
        """,
    )


def notify_report(reporter_email, reported_email, listing_title, listing_id, reason,
                  reporter_id=None):
    """Send report notification to admin inbox. Reply-To = reporter's email."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    listing_line = f"<p><strong>Listing:</strong> {listing_title} (ID: {listing_id})</p>" if listing_title else ""

    send_email(
        to=SUPPORT_EMAIL,
        subject=f"[Report] {reason} \u2014 {listing_title or 'User report'}",
        reply_to=reporter_email,
        body_html=f"""
        <div style="font-family:sans-serif;padding:16px;">
            <h3>New Listing Report</h3>
            <p><strong>Reporter:</strong> {reporter_email}</p>
            <p><strong>Reported user:</strong> {reported_email}</p>
            {listing_line}
            <p><strong>Reason:</strong> {reason}</p>
            <p><strong>Time:</strong> {now}</p>
            <hr style="border:0;border-top:1px solid #e0e0e0;margin:16px 0;">
            <p><strong>Suggested action:</strong> review listing + user history.</p>
            <p style="margin-top:16px;font-size:12px;color:#999;">Reply directly to respond to the reporter.</p>
        </div>
        """,
    )
