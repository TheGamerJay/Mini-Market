import { useEffect, useRef } from "react";

const AD_CLIENT = "ca-pub-3366413043572786";
const ADS_ENABLED = true;

let scriptLoaded = false;

function loadAdScript() {
  if (scriptLoaded) return;
  if (document.querySelector(`script[src*="adsbygoogle"]`)) { scriptLoaded = true; return; }
  const s = document.createElement("script");
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`;
  s.async = true;
  s.crossOrigin = "anonymous";
  document.head.appendChild(s);
  scriptLoaded = true;
}

export default function AdFooter({ isPro }) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!ADS_ENABLED || isPro) return;
    loadAdScript();
    // push ad after script has had time to load
    const t = setTimeout(() => {
      if (!pushed.current) {
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
        pushed.current = true;
      }
    }, 800);
    return () => clearTimeout(t);
  }, [isPro]);

  if (!ADS_ENABLED || isPro) return null;

  return (
    <div style={{ margin: "20px 0 12px", minHeight: 100, textAlign: "center" }}>
      <div className="muted" style={{ fontSize: 10, marginBottom: 4 }}>Advertisement</div>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={AD_CLIENT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
