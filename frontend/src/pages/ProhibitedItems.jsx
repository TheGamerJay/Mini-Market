import React from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";

const ITEMS = [
  "Illegal drugs, narcotics, or controlled substances",
  "Drug paraphernalia",
  "Weapons, firearms, ammunition, explosives, or weapon parts",
  "Stolen property or items obtained illegally",
  "Counterfeit or pirated goods",
  "Adult services, escorting, or sexual services",
  "Pornographic content",
  "Financial services, investment schemes, or loans",
  "Cryptocurrency sales or financial instruments",
  "Prescription medications or medical devices requiring approval",
  "Hazardous materials",
  "Items that violate local, state, or federal laws",
  "Hate speech, violent content, or items promoting harm",
  "Services that require licensing the seller does not possess",
];

export default function ProhibitedItems(){
  const nav = useNavigate();

  return (
    <>
      <TopBar title="Prohibited Items" onBack={() => nav(-1)} />
      <div style={{ height:12 }} />

      <Card>
        <div className="muted" style={{ fontSize:12, lineHeight:1.7, marginBottom:16 }}>
          The following items and activities are strictly prohibited on Pocket Market. Listings violating these rules may be removed without notice, and accounts may be suspended.
        </div>

        <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>
          Prohibited items include, but are not limited to:
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {ITEMS.map((item, i) => (
            <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
              <div style={{
                width:6, height:6, borderRadius:"50%", background:"var(--red, #e74c3c)",
                flexShrink:0, marginTop:6,
              }} />
              <div style={{ fontSize:13, lineHeight:1.6 }}>{item}</div>
            </div>
          ))}
        </div>

        <div className="muted" style={{ fontSize:12, lineHeight:1.7, marginTop:16 }}>
          Pocket Market reserves the right to remove any listing that violates these rules or applicable laws.
        </div>
      </Card>

      <div style={{ height:20 }} />
    </>
  );
}
