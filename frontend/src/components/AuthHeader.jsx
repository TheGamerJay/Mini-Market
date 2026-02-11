import { useNavigate } from "react-router-dom";
import { IconBack } from "./Icons.jsx";

export default function AuthHeader({ title }){
  const nav = useNavigate();
  return (
    <>
      <div style={{ display:"flex", alignItems:"center", padding:"12px 0" }}>
        <button onClick={() => window.history.length > 1 ? nav(-1) : nav("/")} style={{
          background:"none", border:"none", color:"var(--text)",
          cursor:"pointer", padding:4, display:"flex",
        }}>
          <IconBack size={22} />
        </button>
      </div>
      <div className="auth-header">
        <div className="auth-logo">
          <img src="/pocketmarket_favicon_transparent_512x512.png" alt="Pocket Market" style={{ width:100, height:100 }} />
          <span className="gradient-text" style={{ fontSize:22, fontWeight:800 }}>Pocket Market</span>
        </div>
        <h1 style={{ fontSize:24, fontWeight:800, marginTop:16, marginBottom:0 }}>{title}</h1>
      </div>
    </>
  );
}
