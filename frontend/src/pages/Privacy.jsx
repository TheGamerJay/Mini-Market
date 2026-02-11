import React from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";

const SECTIONS = [
  {
    title: "1. Information We Collect",
    body: "We collect information you provide when creating an account (email address, display name, profile photo) and when using the platform (listings, messages, location data for Safe Meetup). We also collect basic usage data such as device type and app interactions to improve our service.",
  },
  {
    title: "2. How We Use Your Information",
    body: "We use your information to: provide and improve the Pocket Market platform, facilitate communication between buyers and sellers, display listings and search results, send notifications about observed items, process Pro subscriptions, and ensure platform safety and security.",
  },
  {
    title: "3. Information Sharing",
    body: "We do not sell your personal information to third parties. We may share limited information with: other users as part of the marketplace (display name, profile photo, listings), service providers who help us operate the platform, and law enforcement when required by law.",
  },
  {
    title: "4. Google & Social Login",
    body: "If you sign in with Google or Facebook, we receive basic profile information (name, email, profile photo) from those services. We do not access your contacts, calendar, or other data from these accounts.",
  },
  {
    title: "5. Location Data",
    body: "We collect location data only when you explicitly provide it for Safe Meetup locations or listing locations. We do not track your location in the background. You can use the platform without sharing your location.",
  },
  {
    title: "6. Photos & Media",
    body: "Photos you upload for listings are stored on our servers and are visible to all users. When you delete a listing, associated photos are also deleted. Profile photos are visible to other users in messages and on your listings.",
  },
  {
    title: "7. Messages",
    body: "Messages sent through Pocket Market are stored on our servers to provide the messaging feature. We do not read your messages unless required for safety investigations or legal compliance.",
  },
  {
    title: "8. Data Security",
    body: "We use industry-standard security measures including HTTPS encryption, secure password hashing, and protected database access. However, no system is 100% secure and we cannot guarantee absolute security of your data.",
  },
  {
    title: "9. Data Retention",
    body: "We retain your account data as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required by law to retain it.",
  },
  {
    title: "10. Cookies",
    body: "We use session cookies to keep you logged in and to remember your preferences. We do not use tracking cookies or share cookie data with advertisers.",
  },
  {
    title: "11. Children's Privacy",
    body: "Pocket Market is not intended for users under 18 years of age. We do not knowingly collect information from children. If we discover that a child has created an account, we will delete it promptly.",
  },
  {
    title: "12. Your Rights",
    body: "You have the right to: access your personal data, correct inaccurate data, delete your account and data, export your data, and opt out of non-essential communications. Contact us through the Help & Support page to exercise these rights.",
  },
  {
    title: "13. Changes to This Policy",
    body: "We may update this Privacy Policy from time to time. We will notify users of significant changes via the app or email. Continued use of the platform after changes constitutes acceptance.",
  },
  {
    title: "14. Contact",
    body: "If you have questions about this Privacy Policy or your data, please contact us through the Help & Support page in the app.",
  },
];

export default function Privacy(){
  const nav = useNavigate();

  return (
    <>
      <TopBar title="Privacy Policy" onBack={() => nav(-1)} />
      <div style={{ height:12 }} />

      <Card>
        <div className="muted" style={{ fontSize:11, marginBottom:12 }}>
          Last updated: February 2026
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {SECTIONS.map((s, i) => (
            <div key={i}>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>{s.title}</div>
              <div className="muted" style={{ fontSize:12, lineHeight:1.7 }}>{s.body}</div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ height:20 }} />
    </>
  );
}
