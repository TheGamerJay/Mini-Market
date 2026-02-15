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
    title: "4. Platform Role",
    body: "Pocket Market is a peer-to-peer marketplace platform. We connect buyers and sellers but do not own, sell, resell, or inspect any items listed. We do not participate in or guarantee any transaction between users. All deals are made directly between the buyer and seller.",
  },
  {
    title: "5. User-Generated Content",
    body: "All listings, descriptions, photos, messages, and other content posted on Pocket Market are created by users, not by Pocket Market. We do not endorse, verify, or guarantee the accuracy of any user-generated content. Users are solely responsible for the content they post, including ensuring it is accurate, lawful, and does not infringe on the rights of others.",
  },
  {
    title: "6. User Responsibilities",
    body: "Users are responsible for their own listings, communications, and transactions. Sellers must accurately describe items and set honest prices. Buyers should inspect items before completing a purchase. Both parties are responsible for arranging safe meetups and completing transactions on their own terms.",
  },
  {
    title: "7. Prohibited Items & Conduct",
    body: "You may not list items that are illegal, stolen, counterfeit, hazardous, or otherwise prohibited by law. This includes but is not limited to: weapons, drugs, alcohol, tobacco, adult content, and items that infringe on intellectual property rights. You agree not to: harass or threaten other users, post false or misleading listings, use the platform for any illegal purpose, attempt to circumvent any security features, or interfere with the proper functioning of the platform.",
  },
  {
    title: "8. Disputes Between Users",
    body: "Pocket Market is not responsible for disputes between buyers and sellers. We do not mediate transactions, issue refunds, or resolve disagreements about item quality, pricing, or delivery. If a dispute arises, users are expected to resolve it among themselves. We may, at our discretion, investigate reports of fraud or policy violations, but we are under no obligation to intervene in any transaction.",
  },
  {
    title: "9. Safe Meetup",
    body: "Pocket Market provides Safe Meetup suggestions as a convenience. We recommend meeting in well-lit public places. However, we are not responsible for your safety during any in-person transaction. Always exercise caution and good judgment when meeting someone in person.",
  },
  {
    title: "10. Pro Subscription",
    body: "Pocket Market Pro is a paid subscription service. By subscribing, you agree to pay the listed monthly fee. You can cancel at any time without penalty. Refunds are not provided for partial billing periods. We reserve the right to change pricing with advance notice. PRO status does not imply endorsement or verification by Pocket Market.",
  },
  {
    title: "11. Content Ownership & License",
    body: "You retain ownership of content you post (photos, descriptions, etc.). By posting content, you grant Pocket Market a non-exclusive, royalty-free license to use, display, and distribute your content in connection with operating the platform. This license ends when you delete your content or account.",
  },
  {
    title: "12. Limitation of Liability",
    body: "Pocket Market is provided \"as is\" without warranties of any kind, express or implied. We are not liable for any damages arising from your use of the platform, including but not limited to: lost profits, data loss, personal injury, property damage, or any loss resulting from transactions arranged through the platform. Our total liability to you for any claim shall not exceed the amount you paid to us in the twelve months preceding the claim.",
  },
  {
    title: "13. Account Termination",
    body: "We reserve the right to suspend or terminate your account at any time, with or without notice, for violations of these terms, fraudulent activity, harmful behavior toward other users, or for any other reason at our discretion. You may delete your account at any time by contacting support. Upon termination, your listings will be removed and your data will be handled according to our Privacy Policy.",
  },
  {
    title: "14. Changes to Terms",
    body: "We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the new terms. We will notify users of significant changes via the app or email.",
  },
  {
    title: "15. Contact",
    body: "If you have questions about these Terms of Service, please contact us at pocketmarket.help@gmail.com or visit our Contact page.",
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
