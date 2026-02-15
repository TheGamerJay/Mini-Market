import { Link } from "react-router-dom";

export default function Footer(){
  return (
    <div style={{
      textAlign:"center", padding:"20px 16px 80px",
      fontSize:11, color:"var(--muted)",
      lineHeight:1.8,
    }}>
      <div style={{ display:"flex", justifyContent:"center", gap:6, flexWrap:"wrap" }}>
        <Link to="/about" style={{ color:"var(--muted)", textDecoration:"none", fontWeight:600 }}>About</Link>
        <span>&middot;</span>
        <Link to="/privacy" style={{ color:"var(--muted)", textDecoration:"none", fontWeight:600 }}>Privacy</Link>
        <span>&middot;</span>
        <Link to="/terms" style={{ color:"var(--muted)", textDecoration:"none", fontWeight:600 }}>Terms</Link>
        <span>&middot;</span>
        <Link to="/contact" style={{ color:"var(--muted)", textDecoration:"none", fontWeight:600 }}>Contact</Link>
      </div>
      <div style={{ marginTop:4 }}>&copy; {new Date().getFullYear()} Pocket Market</div>
    </div>
  );
}
