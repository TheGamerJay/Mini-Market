import React from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";

export default function About(){
  const nav = useNavigate();

  return (
    <>
      <TopBar title="About Pocket Market" onBack={() => nav(-1)} />
      <div style={{ height:12 }} />

      <Card>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div className="muted" style={{ fontSize:12, lineHeight:1.7 }}>
            Pocket Market is a peer-to-peer marketplace that allows individuals to list and discover items locally.
          </div>
          <div className="muted" style={{ fontSize:12, lineHeight:1.7 }}>
            Pocket Market does not own, store, inspect, or ship items listed on the platform. All transactions occur directly between buyers and sellers.
          </div>
          <div className="muted" style={{ fontSize:12, lineHeight:1.7 }}>
            Pocket Market provides optional paid services such as listing boosts and subscription features.
          </div>
        </div>
      </Card>

      <div style={{ height:20 }} />
    </>
  );
}
