import React, { useState } from "react";
import Button from "./Button.jsx";
import { api } from "../api.js";

export default function Onboarding({ me, refreshMe, notify }){
  const [step, setStep] = useState(0);

  const steps = [
    {
      emoji: "\u{1F44B}",
      title: "Welcome to Pocket Market!",
      desc: "Buy and sell locally with people in your area. Let's get you set up in 3 quick steps.",
    },
    {
      emoji: "\u{1F4F8}",
      title: "Set Your Profile Photo",
      desc: "Add a profile photo so buyers and sellers know who they're dealing with. You can do this from your Profile page.",
    },
    {
      emoji: "\u{1F4E6}",
      title: "Post Your First Item",
      desc: "Got something to sell? Tap the + button to create your first listing with photos, a price, and a description.",
    },
  ];

  const finish = async () => {
    try {
      await api.onboardingDone();
      await refreshMe();
    } catch(err) { notify(err.message); }
  };

  const s = steps[step];

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9999,
      background:"rgba(0,0,0,.7)", backdropFilter:"blur(8px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:20,
    }}>
      <div style={{
        width:"100%", maxWidth:360, padding:"32px 24px",
        borderRadius:20, background:"var(--bg)",
        border:"1px solid var(--border)",
        textAlign:"center",
      }}>
        <div style={{ fontSize:48, marginBottom:12 }}>{s.emoji}</div>
        <div style={{ fontWeight:800, fontSize:20, marginBottom:8 }}>{s.title}</div>
        <div className="muted" style={{ fontSize:14, lineHeight:1.6, marginBottom:24 }}>{s.desc}</div>

        {/* Dots */}
        <div style={{ display:"flex", justifyContent:"center", gap:6, marginBottom:20 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width:8, height:8, borderRadius:"50%",
              background: i === step ? "var(--cyan)" : "var(--border)",
            }} />
          ))}
        </div>

        {step < steps.length - 1 ? (
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={finish} style={{
              flex:1, padding:"12px 0", borderRadius:12, fontSize:14, fontWeight:600,
              cursor:"pointer", fontFamily:"inherit",
              background:"none", border:"1px solid var(--border)", color:"var(--muted)",
            }}>
              Skip
            </button>
            <Button onClick={() => setStep(step + 1)} style={{ flex:2 }}>
              Next
            </Button>
          </div>
        ) : (
          <Button onClick={finish} style={{ width:"100%" }}>
            Get Started
          </Button>
        )}
      </div>
    </div>
  );
}
