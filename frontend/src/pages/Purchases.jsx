import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import { IconCamera } from "../components/Icons.jsx";
import { api } from "../api.js";

function money(cents){
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

function timeAgo(iso){
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff/86400)}d ago`;
  return `${Math.floor(diff/604800)}w ago`;
}

export default function Purchases({ notify }){
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.purchases();
        setItems(res.purchases || []);
      } catch(err) { notify(err.message); }
      finally { setBusy(false); }
    })();
  }, []);

  return (
    <>
      <TopBar title="My Purchases" onBack={() => nav(-1)} />
      <div style={{ height:12 }} />

      {busy ? (
        <Card><div className="muted">Loading...</div></Card>
      ) : items.length === 0 ? (
        <Card>
          <div className="muted" style={{ textAlign:"center", padding:"20px 0" }}>
            No purchases yet. Items you buy will appear here.
          </div>
        </Card>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {items.map(l => (
            <Link key={l.id} to={`/listing/${l.id}`} style={{ textDecoration:"none", color:"inherit" }}>
              <div className="panel" style={{
                display:"flex", gap:12, padding:12, alignItems:"center", borderRadius:14,
              }}>
                <div style={{
                  width:56, height:56, borderRadius:10, overflow:"hidden",
                  flexShrink:0, background:"var(--panel2)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  {l.images?.length > 0 ? (
                    <img src={`${api.base}${l.images[0]}`} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  ) : (
                    <IconCamera size={22} color="var(--muted)" />
                  )}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {l.title}
                  </div>
                  <div style={{ marginTop:4, display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontWeight:800, fontSize:13 }}>{money(l.price_cents)}</span>
                    <span className="muted" style={{ fontSize:11 }}>from {l.seller_name}</span>
                  </div>
                  <div className="muted" style={{ fontSize:10, marginTop:2 }}>{timeAgo(l.created_at)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
