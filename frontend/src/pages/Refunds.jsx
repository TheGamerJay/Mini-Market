import React from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";

export default function Refunds(){
  const nav = useNavigate();

  return (
    <>
      <TopBar title="Refund Policy" onBack={() => nav(-1)} />
      <div style={{ height:12 }} />

      <Card>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div className="muted" style={{ fontSize:12, lineHeight:1.7 }}>
            Refunds for optional platform services (such as listing boosts or subscriptions) are handled by Pocket Market.
          </div>
          <div className="muted" style={{ fontSize:12, lineHeight:1.7 }}>
            Item disputes are handled directly between buyers and sellers. Pocket Market may provide moderation support but is not responsible for item quality, delivery, or payment disputes.
          </div>
        </div>
      </Card>

      <div style={{ height:20 }} />
    </>
  );
}
