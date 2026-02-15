import React from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";

const STEPS = [
  "Users create listings for items they wish to sell.",
  "Buyers contact sellers directly through the platform.",
  "Payments for optional services (such as boosts or Pro subscriptions) are processed by Pocket Market.",
  "Item payments, delivery, and exchanges are handled between buyers and sellers.",
];

export default function HowItWorks(){
  const nav = useNavigate();

  return (
    <>
      <TopBar title="How It Works" onBack={() => nav(-1)} />
      <div style={{ height:12 }} />

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {STEPS.map((step, i) => (
          <Card key={i}>
            <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
              <div style={{
                width:28, height:28, borderRadius:8, flexShrink:0,
                background:"linear-gradient(135deg, rgba(62,224,255,.15), rgba(164,122,255,.15))",
                border:"1px solid rgba(62,224,255,.25)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:13, fontWeight:800, color:"var(--cyan)",
              }}>
                {i + 1}
              </div>
              <div className="muted" style={{ fontSize:12, lineHeight:1.7, paddingTop:4 }}>{step}</div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ height:20 }} />
    </>
  );
}
