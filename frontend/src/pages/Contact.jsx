import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import { api } from "../api.js";

export default function Contact({ notify }){
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", message: "" });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const supportEmail = "pocketmarket.help@gmail.com";

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.message.trim()) {
      notify && notify("Please fill in all fields");
      return;
    }
    setBusy(true);
    try {
      await api.supportContact({
        email: form.email, message: form.message, type: "support",
        user_agent: navigator.userAgent, page_url: window.location.href,
      });
      setSent(true);
      notify && notify("Message sent! We'll get back to you soon.");
    } catch(err) {
      notify && notify(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar title="Contact Us" onBack={() => nav(-1)} />
      <div style={{ height:12 }} />

      <Card>
        <div className="h2" style={{ marginBottom:4 }}>Get in Touch</div>
        <div className="muted" style={{ fontSize:12, marginBottom:16, lineHeight:1.6 }}>
          Have a question, concern, or feedback? Reach out to us by email or use the form below.
        </div>

        <div style={{
          background:"var(--panel2)", borderRadius:10, padding:"14px 16px", marginBottom:16,
          border:"1px solid var(--border)",
        }}>
          <div style={{ fontSize:12, fontWeight:700, marginBottom:4 }}>Email</div>
          <a href={`mailto:${supportEmail}`} style={{ color:"var(--cyan)", fontWeight:700, fontSize:14 }}>
            {supportEmail}
          </a>
          <div className="muted" style={{ fontSize:11, marginTop:4 }}>
            We typically respond within 24 hours.
          </div>
        </div>

        {sent ? (
          <div style={{ textAlign:"center", padding:"16px 0" }}>
            <div style={{ fontSize:32, marginBottom:8 }}>&#10003;</div>
            <div style={{ fontWeight:700, fontSize:14 }}>Thanks for reaching out!</div>
            <div className="muted" style={{ fontSize:12, marginTop:4 }}>We'll respond to your email within 24 hours.</div>
            <div style={{ height:12 }} />
            <Button variant="ghost" onClick={() => { setSent(false); setForm({ email:"", message:"" }); }}>
              Send Another
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <input
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="Your email address"
              type="email"
              required
              style={{
                width:"100%", padding:"10px 12px", borderRadius:10, marginBottom:8,
                background:"var(--panel2)", border:"1px solid var(--border)",
                color:"var(--text)", fontSize:13, fontFamily:"inherit",
                boxSizing:"border-box",
              }}
            />

            <textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="How can we help you?"
              rows={5}
              required
              style={{
                width:"100%", padding:"10px 12px", borderRadius:10, marginBottom:10,
                background:"var(--panel2)", border:"1px solid var(--border)",
                color:"var(--text)", fontSize:13, fontFamily:"inherit",
                resize:"vertical", boxSizing:"border-box",
              }}
            />

            <Button type="submit" disabled={busy}>
              {busy ? "Sending..." : "Send Message"}
            </Button>
          </form>
        )}
      </Card>

      <div style={{ height:20 }} />
    </>
  );
}
