import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthHeader from "../components/AuthHeader.jsx";
import { api } from "../api.js";

export default function Verify({ notify }){
  const [params] = useSearchParams();
  const [status, setStatus] = useState("verifying");

  useEffect(() => {
    const token = params.get("token");
    if (!token) { setStatus("error"); return; }
    (async () => {
      try {
        await api.verifyEmail(token);
        setStatus("success");
        notify("Email verified!");
      } catch (err) {
        setStatus("error");
        notify(err.message);
      }
    })();
  }, []);

  return (
    <>
      <AuthHeader title="Email Verification" />
      <div style={{ textAlign:"center", padding:"24px 0" }}>
        {status === "verifying" && <p className="muted">Verifying your email...</p>}
        {status === "success" && (
          <>
            <p style={{ fontSize:48, marginBottom:12 }}>&#10003;</p>
            <p style={{ fontWeight:700, fontSize:16 }}>Your email has been verified!</p>
            <p className="muted" style={{ marginTop:8 }}>You now have a verified badge on your profile.</p>
          </>
        )}
        {status === "error" && (
          <>
            <p style={{ fontSize:48, marginBottom:12 }}>&#10007;</p>
            <p style={{ fontWeight:700, fontSize:16 }}>Verification failed</p>
            <p className="muted" style={{ marginTop:8 }}>The link may be expired or invalid.</p>
          </>
        )}
        <div style={{ marginTop:24 }}>
          <Link to="/" style={{ color:"var(--cyan)", fontWeight:700 }}>Go Home</Link>
        </div>
      </div>
    </>
  );
}
