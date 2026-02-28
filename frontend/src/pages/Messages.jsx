import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import { IconCamera } from "../components/Icons.jsx";
import { api } from "../api.js";

function timeAgo(iso){
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function Messages({ notify }){
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    (async () => {
      try{
        const res = await api.conversations();
        setRows(res.conversations || []);
      }catch(err){ notify(err.message); }
      finally{ setBusy(false); }
    })();
  }, []);

  return (
    <>
      <TopBar title="Messages" />
      <div style={{height:12}}/>

      {busy ? (
        <Card><div className="muted">Loading...</div></Card>
      ) : rows.length === 0 ? (
        <div style={{ textAlign:"center", padding:"40px 20px" }}>
          <div style={{ fontSize:52, marginBottom:16, lineHeight:1 }}>💬</div>
          <div style={{ fontWeight:800, fontSize:18, marginBottom:8 }}>No messages yet</div>
          <div className="muted" style={{ fontSize:14, lineHeight:1.6, marginBottom:24 }}>
            When you message a seller,{"\n"}conversations will appear here.
          </div>
          <Button onClick={() => nav("/")}>Browse Listings</Button>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {rows.map(c => (
            <Link key={c.id} to={`/chat/${c.id}`} style={{ textDecoration:"none", color:"inherit" }}>
              <div className="panel" style={{
                display:"flex", gap:12, padding:12, alignItems:"center",
                borderRadius:14, cursor:"pointer",
              }}>
                {/* Listing thumbnail */}
                <div style={{
                  width:52, height:52, borderRadius:10, overflow:"hidden",
                  flexShrink:0, background:"var(--panel2)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  {c.listing_image ? (
                    <img src={`${api.base}${c.listing_image}`} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  ) : (
                    <IconCamera size={22} color="var(--muted)" />
                  )}
                </div>

                {/* Text content */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ fontWeight: c.unread_count > 0 ? 800 : 700, fontSize:14 }}>{c.other_user_name}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                      {c.unread_count > 0 && (
                        <div style={{
                          minWidth:18, height:18, borderRadius:9, padding:"0 5px",
                          background:"var(--cyan)", color:"#000",
                          fontSize:10, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center",
                        }}>{c.unread_count}</div>
                      )}
                      <div className="muted" style={{ fontSize:11 }}>{timeAgo(c.last_message_at)}</div>
                    </div>
                  </div>
                  <div className="muted" style={{ fontSize:12, marginTop:2 }}>{c.listing_title}</div>
                  {c.last_message && (
                    <div style={{
                      fontSize:13, marginTop:4, color:"var(--text)",
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                      opacity:0.7,
                    }}>
                      {c.last_message}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
