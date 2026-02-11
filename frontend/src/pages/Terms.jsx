import React from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: "By accessing or using Pocket Market, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the platform.",
  },
  {
    title: "2. Eligibility",
    body: "You must be at least 18 years old to use Pocket Market. By creating an account, you represent that you are at least 18 years of age and are capable of entering into a legally binding agreement.",
  },
  {
    title: "3. User Accounts",
    body: "You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate information when creating your account and to update your information as needed. You are responsible for all activity that occurs under your account.",
  },
  {
    title: "4. Listings & Transactions",
    body: "Pocket Market is a platform that connects buyers and sellers. We do not own, sell, or resell any items listed on the platform. All transactions are between buyers and sellers directly. We are not responsible for the quality, safety, legality, or availability of items listed. Sellers are responsible for accurately describing their items and setting fair prices.",
  },
  {
    title: "5. Prohibited Items",
    body: "You may not list items that are illegal, stolen, counterfeit, hazardous, or otherwise prohibited by law. This includes but is not limited to: weapons, drugs, alcohol, tobacco, adult content, and items that infringe on intellectual property rights. We reserve the right to remove any listing that violates these guidelines.",
  },
  {
    title: "6. User Conduct",
    body: "You agree not to: harass, threaten, or intimidate other users; post false, misleading, or fraudulent listings; use the platform for any illegal purpose; attempt to circumvent any security features; scrape or collect data from the platform without permission; or interfere with the proper functioning of the platform.",
  },
  {
    title: "7. Safe Meetup",
    body: "Pocket Market provides Safe Meetup suggestions as a convenience. We recommend meeting in well-lit public places. However, we are not responsible for your safety during any in-person transaction. Always exercise caution and good judgment when meeting strangers.",
  },
  {
    title: "8. Pro Subscription",
    body: "Pocket Market Pro is a paid subscription service. By subscribing, you agree to pay the listed monthly fee. You can cancel at any time without penalty. Refunds are not provided for partial billing periods. We reserve the right to change pricing with advance notice.",
  },
  {
    title: "9. Content Ownership",
    body: "You retain ownership of content you post (photos, descriptions, etc.). By posting content, you grant Pocket Market a non-exclusive, royalty-free license to use, display, and distribute your content in connection with the platform.",
  },
  {
    title: "10. Limitation of Liability",
    body: "Pocket Market is provided \"as is\" without warranties of any kind. We are not liable for any damages arising from your use of the platform, including but not limited to: lost profits, data loss, personal injury, or property damage resulting from transactions arranged through the platform.",
  },
  {
    title: "11. Termination",
    body: "We reserve the right to suspend or terminate your account at any time for violations of these terms or for any other reason at our discretion. You may delete your account at any time by contacting support.",
  },
  {
    title: "12. Changes to Terms",
    body: "We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the new terms. We will notify users of significant changes via the app or email.",
  },
  {
    title: "13. Contact",
    body: "If you have questions about these Terms of Service, please contact us through the Help & Support page in the app.",
  },
];

export default function Terms(){
  const nav = useNavigate();

  return (
    <>
      <TopBar title="Terms of Service" onBack={() => nav(-1)} />
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
