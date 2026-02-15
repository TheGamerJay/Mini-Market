import React from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";

const SECTIONS = [
  {
    title: "1. Information We Collect",
    body: "We collect information you provide when creating an account (email address, display name, profile photo) and when using the platform (listings, messages, location data for Safe Meetup). We also collect basic usage data such as device type, browser type, IP address, and app interactions to improve our service.",
  },
  {
    title: "2. How We Use Your Information",
    body: "We use your information to: provide and improve the Pocket Market platform, facilitate communication between buyers and sellers, display listings and search results, send notifications about observed items, process Pro subscriptions, serve relevant advertisements, analyze platform usage and performance, and ensure platform safety and security.",
  },
  {
    title: "3. Cookies and Tracking Technologies",
    body: "We use cookies and similar technologies for several purposes. Session cookies keep you logged in and remember your preferences. Analytics cookies help us understand how users interact with the platform so we can improve the experience. Third-party advertising partners, including Google AdSense, may use cookies and web beacons to serve ads based on your prior visits to our site or other sites on the internet. You can manage cookie preferences through your browser settings. Disabling cookies may affect some platform functionality.",
  },
  {
    title: "4. Advertising",
    body: "Pocket Market displays advertisements provided by third-party ad networks, including Google AdSense. These services may collect and use information about your visits to this and other websites to provide advertisements about goods and services that may interest you. Google uses cookies (such as the DART cookie) to serve ads based on your visits to this site and other sites. You may opt out of personalized advertising by visiting Google's Ads Settings (https://adssettings.google.com) or the Network Advertising Initiative opt-out page (https://optout.networkadvertising.org). Pocket Market Pro subscribers do not see ads.",
  },
  {
    title: "5. Analytics",
    body: "We use analytics tools to understand how users interact with Pocket Market. This includes tracking page views, feature usage, session duration, and general usage patterns. Analytics data is used in aggregate to improve the platform and is not used to personally identify individual users.",
  },
  {
    title: "6. Information Sharing",
    body: "We do not sell your personal information to third parties. We may share limited information with: other users as part of the marketplace (display name, profile photo, listings), advertising partners in anonymized or aggregated form, service providers who help us operate the platform (email delivery, payment processing), and law enforcement when required by law.",
  },
  {
    title: "7. Google & Social Login",
    body: "If you sign in with Google, we receive basic profile information (name, email, profile photo) from that service. We do not access your contacts, calendar, or other data from these accounts.",
  },
  {
    title: "8. Location Data",
    body: "We collect location data only when you explicitly provide it for Safe Meetup locations or listing locations. We do not track your location in the background. You can use the platform without sharing your location.",
  },
  {
    title: "9. Photos & Media",
    body: "Photos you upload for listings are stored on our servers and are visible to all users. When you delete a listing, associated photos are also deleted. Profile photos are visible to other users in messages and on your listings.",
  },
  {
    title: "10. Messages",
    body: "Messages sent through Pocket Market are stored on our servers to provide the messaging feature. We do not read your messages unless required for safety investigations or legal compliance.",
  },
  {
    title: "11. Data Security",
    body: "We use industry-standard security measures including HTTPS encryption, secure password hashing, and protected database access. However, no system is 100% secure and we cannot guarantee absolute security of your data.",
  },
  {
    title: "12. Data Retention",
    body: "We retain your account data as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required by law to retain it.",
  },
  {
    title: "13. Children's Privacy",
    body: "Pocket Market is not intended for users under 18 years of age. We do not knowingly collect information from children. If we discover that a child has created an account, we will delete it promptly.",
  },
  {
    title: "14. Your Rights",
    body: "You have the right to: access your personal data, correct inaccurate data, delete your account and data, export your data, and opt out of non-essential communications. Contact us at pocketmarket.help@gmail.com to exercise these rights.",
  },
  {
    title: "15. Changes to This Policy",
    body: "We may update this Privacy Policy from time to time. We will notify users of significant changes via the app or email. Continued use of the platform after changes constitutes acceptance.",
  },
  {
    title: "16. Contact",
    body: "If you have questions about this Privacy Policy or your data, please contact us at pocketmarket.help@gmail.com or visit our Contact page.",
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
