import React from "react";
import { Link, useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";

export default function About(){
  const nav = useNavigate();

  return (
    <>
      <TopBar title="About Pocket Market" onBack={() => nav(-1)} />
      <div style={{ height:12 }} />

      <Card>
        <div className="muted" style={{ fontSize:11, marginBottom:12 }}>
          Last updated: February 2026
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>What is Pocket Market?</div>
            <div className="muted" style={{ fontSize:12, lineHeight:1.7 }}>
              Pocket Market is a peer-to-peer online marketplace where individuals can buy and sell items locally. We provide the platform that connects buyers and sellers in their area, making it easy to post listings, browse items, and communicate directly.
            </div>
          </div>

          <div>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>How it works</div>
            <div className="muted" style={{ fontSize:12, lineHeight:1.7 }}>
              Sellers create listings with photos, descriptions, and prices. Buyers browse, search, and message sellers to arrange purchases. All transactions happen directly between users. Pocket Market does not process payments, ship items, or act as an intermediary in any transaction.
            </div>
          </div>

          <div>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>What we are not</div>
            <div className="muted" style={{ fontSize:12, lineHeight:1.7 }}>
              Pocket Market does not own, sell, or resell any items listed on the platform. We do not guarantee the quality, safety, legality, or authenticity of any listing. We do not guarantee that any transaction will be completed successfully. Users are responsible for their own interactions, and we encourage everyone to exercise caution when buying or selling.
            </div>
          </div>

          <div>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>Safety</div>
            <div className="muted" style={{ fontSize:12, lineHeight:1.7 }}>
              We provide features like Safe Meetup location suggestions and user reporting tools to help keep the community safe. However, personal safety during in-person transactions is ultimately the responsibility of each user. We recommend meeting in well-lit public places and bringing a friend when possible.
            </div>
          </div>

          <div>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>PRO Sellers</div>
            <div className="muted" style={{ fontSize:12, lineHeight:1.7 }}>
              Pocket Market offers an optional PRO subscription for sellers who want additional features such as a PRO badge, priority placement in search results, more photos per listing, and an ad-free browsing experience. PRO status does not imply endorsement or verification by Pocket Market.
            </div>
          </div>

          <div>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>Contact us</div>
            <div className="muted" style={{ fontSize:12, lineHeight:1.7 }}>
              Have questions or feedback? Visit our <Link to="/contact" style={{ color:"var(--cyan)", fontWeight:700, textDecoration:"underline" }}>Contact</Link> page or email us at{" "}
              <a href="mailto:pocketmarket.help@gmail.com" style={{ color:"var(--cyan)", fontWeight:700 }}>pocketmarket.help@gmail.com</a>.
            </div>
          </div>
        </div>
      </Card>

      <div style={{ height:20 }} />
    </>
  );
}
