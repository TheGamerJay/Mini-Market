import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
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
        <Card><div className="muted" style={{ textAlign:"center" }}>No conversations yet. Message a seller to start chatting.</div></Card>
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
                    <div style={{ fontWeight:700, fontSize:14 }}>{c.other_user_name}</div>
                    <div className="muted" style={{ fontSize:11, flexShrink:0 }}>{timeAgo(c.last_message_at)}</div>
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
