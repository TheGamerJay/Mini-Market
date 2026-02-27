import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Card from "../components/Card.jsx";
import SkeletonCard from "../components/SkeletonCard.jsx";
import { IconSearch, IconBack, IconCamera, IconChevronRight } from "../components/Icons.jsx";
import { api } from "../api.js";

function money(cents){
  const d = cents / 100;
  return d % 1 === 0 ? `$${d}` : `$${d.toFixed(2)}`;
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

const CATEGORIES = ["electronics","clothing","furniture","art","books","sports","toys","home","auto","other"];
const CONDITIONS = ["new","like new","used","fair"];
const SORT_OPTIONS = [
  { value:"newest", label:"Newest" },
  { value:"oldest", label:"Oldest" },
  { value:"price_low", label:"Price: Low → High" },
  { value:"price_high", label:"Price: High → Low" },
];
const RADIUS_OPTIONS = [
  { value:8,   label:"5 mi" },
  { value:16,  label:"10 mi" },
  { value:40,  label:"25 mi" },
  { value:80,  label:"50 mi" },
  { value:160, label:"100 mi" },
];

function Pill({ active, onClick, children }){
  return (
    <button onClick={onClick} style={{
      padding:"7px 14px", borderRadius:20, fontSize:12, fontWeight:700,
      cursor:"pointer", fontFamily:"inherit", border:"1.5px solid",
      borderColor: active ? "var(--cyan)" : "var(--border)",
      background: active ? "rgba(62,224,255,.15)" : "var(--panel2)",
      color: active ? "var(--cyan)" : "var(--muted)",
      boxShadow: active ? "0 0 10px rgba(62,224,255,.20)" : "none",
      transform: active ? "scale(1.04)" : "scale(1)",
      transition:"all 150ms ease",
      whiteSpace:"nowrap",
    }}>
      {children}
    </button>
  );
}

function AccordionSection({ title, isOpen, onToggle, children, activeCount }){
  const contentRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen, children]);

  return (
    <div style={{ borderBottom:"1px solid var(--border)" }}>
      <button onClick={onToggle} style={{
        width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:"14px 0", background:"none", border:"none", cursor:"pointer",
        fontFamily:"inherit", color:"var(--text)",
      }}>
        <span style={{ fontWeight:700, fontSize:14 }}>
          {title}
          {activeCount > 0 && (
            <span style={{
              marginLeft:8, background:"var(--cyan)", color:"#000",
              borderRadius:10, fontSize:10, fontWeight:800,
              padding:"2px 7px",
            }}>{activeCount}</span>
          )}
        </span>
        <span style={{
          transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
          transition:"transform 200ms ease",
          color:"var(--muted)",
          display:"flex",
        }}>
          <IconChevronRight size={16} />
        </span>
      </button>
      <div style={{
        height, overflow:"hidden",
        transition:"height 220ms cubic-bezier(.4,0,.2,1)",
      }}>
        <div ref={contentRef} style={{ paddingBottom:14 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Search({ notify }){
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openSection, setOpenSection] = useState("sort");
  const drawerRef = useRef(null);

  // Pending filter state (inside drawer before Apply)
  const [pendingSort, setPendingSort] = useState("newest");
  const [pendingCategory, setPendingCategory] = useState("");
  const [pendingCondition, setPendingCondition] = useState("");
  const [pendingMinPrice, setPendingMinPrice] = useState("");
  const [pendingMaxPrice, setPendingMaxPrice] = useState("");
  const [pendingZip, setPendingZip] = useState("");
  const [pendingRadius, setPendingRadius] = useState(null);
  const [pendingSafeMeet, setPendingSafeMeet] = useState(false);
  const [pendingLat, setPendingLat] = useState(null);
  const [pendingLng, setPendingLng] = useState(null);

  // Applied filter state (actual search params)
  const [appliedSort, setAppliedSort] = useState("newest");
  const [appliedCategory, setAppliedCategory] = useState("");
  const [appliedCondition, setAppliedCondition] = useState("");
  const [appliedMinPrice, setAppliedMinPrice] = useState("");
  const [appliedMaxPrice, setAppliedMaxPrice] = useState("");
  const [appliedZip, setAppliedZip] = useState("");
  const [appliedRadius, setAppliedRadius] = useState(null);
  const [appliedSafeMeet, setAppliedSafeMeet] = useState(false);
  const [appliedLat, setAppliedLat] = useState(null);
  const [appliedLng, setAppliedLng] = useState(null);

  // Preview count for Apply button
  const [previewCount, setPreviewCount] = useState(null);
  const previewTimer = useRef(null);
  const [locBusy, setLocBusy] = useState(false);

  useEffect(() => {
    const q = searchParams.get("q") || "";
    if (q) {
      setQuery(q);
      doSearch(q, {});
    } else {
      inputRef.current?.focus();
    }
  }, []);

  // Sync pending filters into drawer when it opens
  useEffect(() => {
    if (drawerOpen) {
      setPendingSort(appliedSort);
      setPendingCategory(appliedCategory);
      setPendingCondition(appliedCondition);
      setPendingMinPrice(appliedMinPrice);
      setPendingMaxPrice(appliedMaxPrice);
      setPendingZip(appliedZip);
      setPendingRadius(appliedRadius);
      setPendingSafeMeet(appliedSafeMeet);
      setPendingLat(appliedLat);
      setPendingLng(appliedLng);
    }
  }, [drawerOpen]);

  // Debounced preview count when pending filters change (only when drawer open)
  useEffect(() => {
    if (!drawerOpen || !searched) return;
    clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(async () => {
      try {
        const data = await buildAndSearch(query, {
          sort: pendingSort, category: pendingCategory, condition: pendingCondition,
          minPrice: pendingMinPrice, maxPrice: pendingMaxPrice,
          zip: pendingZip, radius: pendingRadius,
          safeMeet: pendingSafeMeet, lat: pendingLat, lng: pendingLng,
        });
        setPreviewCount(data.listings?.length ?? null);
      } catch { setPreviewCount(null); }
    }, 350);
    return () => clearTimeout(previewTimer.current);
  }, [pendingSort, pendingCategory, pendingCondition, pendingMinPrice, pendingMaxPrice,
      pendingZip, pendingRadius, pendingSafeMeet, pendingLat, pendingLng, drawerOpen]);

  async function buildAndSearch(q, opts){
    const params = { q: q || query };
    if (opts.category) params.category = opts.category;
    if (opts.condition) params.condition = opts.condition;
    if (opts.minPrice) params.min_price = opts.minPrice;
    if (opts.maxPrice) params.max_price = opts.maxPrice;
    if (opts.zip) params.zip = opts.zip;
    if (opts.sort && opts.sort !== "newest") params.sort = opts.sort;
    if (opts.safeMeet) params.has_safe_meet = "1";
    if (opts.lat != null && opts.lng != null) {
      params.lat = opts.lat;
      params.lng = opts.lng;
      if (opts.radius) params.radius_km = opts.radius;
    }
    return api.search(params);
  }

  const doSearch = async (q, opts) => {
    const term = (q ?? query).trim();
    if (!term) return;
    setBusy(true);
    setSearched(true);
    try {
      const data = await buildAndSearch(term, opts ?? {
        sort: appliedSort, category: appliedCategory, condition: appliedCondition,
        minPrice: appliedMinPrice, maxPrice: appliedMaxPrice,
        zip: appliedZip, radius: appliedRadius,
        safeMeet: appliedSafeMeet, lat: appliedLat, lng: appliedLng,
      });
      setResults(data.listings || []);
      const params = { q: term };
      if (appliedCategory) params.category = appliedCategory;
      setSearchParams(params, { replace: true });
    } catch(err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e) => { e.preventDefault(); doSearch(query); };

  const applyFilters = async () => {
    setAppliedSort(pendingSort);
    setAppliedCategory(pendingCategory);
    setAppliedCondition(pendingCondition);
    setAppliedMinPrice(pendingMinPrice);
    setAppliedMaxPrice(pendingMaxPrice);
    setAppliedZip(pendingZip);
    setAppliedRadius(pendingRadius);
    setAppliedSafeMeet(pendingSafeMeet);
    setAppliedLat(pendingLat);
    setAppliedLng(pendingLng);
    setDrawerOpen(false);

    if (query.trim()) {
      setBusy(true);
      setSearched(true);
      try {
        const data = await buildAndSearch(query, {
          sort: pendingSort, category: pendingCategory, condition: pendingCondition,
          minPrice: pendingMinPrice, maxPrice: pendingMaxPrice,
          zip: pendingZip, radius: pendingRadius,
          safeMeet: pendingSafeMeet, lat: pendingLat, lng: pendingLng,
        });
        setResults(data.listings || []);
      } catch(err) { notify(err.message); }
      finally { setBusy(false); }
    }
  };

  const clearFilters = () => {
    setPendingSort("newest"); setPendingCategory(""); setPendingCondition("");
    setPendingMinPrice(""); setPendingMaxPrice(""); setPendingZip("");
    setPendingRadius(null); setPendingSafeMeet(false);
    setPendingLat(null); setPendingLng(null);
    setPreviewCount(null);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { notify("Geolocation not supported"); return; }
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPendingLat(pos.coords.latitude);
        setPendingLng(pos.coords.longitude);
        if (!pendingRadius) setPendingRadius(40); // default 25mi
        setLocBusy(false);
      },
      () => { notify("Could not get location"); setLocBusy(false); }
    );
  };

  const activeFilterCount = [
    appliedCategory, appliedCondition, appliedMinPrice, appliedMaxPrice, appliedZip,
    appliedRadius, appliedSafeMeet ? "1" : "",
  ].filter(Boolean).length + (appliedSort !== "newest" ? 1 : 0);

  const pendingFilterCount = [
    pendingCategory, pendingCondition, pendingMinPrice, pendingMaxPrice, pendingZip,
    pendingRadius, pendingSafeMeet ? "1" : "",
  ].filter(Boolean).length + (pendingSort !== "newest" ? 1 : 0);

  const toggleSection = (s) => setOpenSection(prev => prev === s ? null : s);

  return (
    <>
      {/* Search header */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 0", width:"100%" }}>
        <button onClick={() => nav(-1)} style={{
          background:"none", border:"none", color:"var(--text)",
          cursor:"pointer", padding:4, display:"flex", flexShrink:0,
        }}>
          <IconBack size={22} />
        </button>

        <form onSubmit={onSubmit} style={{
          flex:1, minWidth:0, display:"flex", alignItems:"center", gap:10,
          padding:"10px 14px", borderRadius:14,
          background:"var(--panel)", border:"1px solid var(--border)",
        }}>
          <IconSearch size={18} color="var(--muted)" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search for items..."
            style={{
              flex:1, minWidth:0, background:"none", border:"none", outline:"none",
              color:"var(--text)", fontSize:14, fontFamily:"inherit",
            }}
          />
        </form>

        {/* Filter button */}
        <button onClick={() => setDrawerOpen(true)} style={{
          background: drawerOpen || activeFilterCount ? "rgba(62,224,255,.15)" : "var(--panel)",
          border:"1.5px solid", borderColor: activeFilterCount ? "var(--cyan)" : "var(--border)",
          borderRadius:12, padding:"10px 12px", cursor:"pointer",
          color: activeFilterCount ? "var(--cyan)" : "var(--muted)",
          display:"flex", alignItems:"center", gap:4, fontSize:12, fontWeight:700,
          fontFamily:"inherit", position:"relative", flexShrink:0,
          boxShadow: activeFilterCount ? "0 0 12px rgba(62,224,255,.20)" : "none",
          transition:"all 150ms ease",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="12" y1="18" x2="20" y2="18"/>
          </svg>
          {activeFilterCount > 0 && (
            <span style={{
              position:"absolute", top:-5, right:-5,
              background:"var(--cyan)", color:"#000",
              width:17, height:17, borderRadius:"50%",
              fontSize:9, fontWeight:800,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>{activeFilterCount}</span>
          )}
        </button>
      </div>

      {/* Results */}
      {busy ? (
        <div className="grid">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : !searched ? (
        <div className="muted" style={{ textAlign:"center", marginTop:40, fontSize:14 }}>
          Type something and press enter to search
        </div>
      ) : results.length === 0 ? (
        <div className="muted" style={{ textAlign:"center", marginTop:40, fontSize:14 }}>
          No results for "{query}"
        </div>
      ) : (
        <>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div className="muted" style={{ fontSize:12 }}>{results.length} result{results.length !== 1 ? "s" : ""}</div>
            <button onClick={async () => {
              try { await api.saveSearch({ query }); notify("Search saved!"); }
              catch(err) { notify(err.message); }
            }} style={{
              background:"none", border:"1px solid var(--border)", borderRadius:8,
              color:"var(--cyan)", fontSize:11, fontWeight:700, padding:"4px 10px",
              cursor:"pointer", fontFamily:"inherit",
            }}>Save Search</button>
          </div>
          <div className="grid">
            {results.map(l => (
              <Link key={l.id} to={`/listing/${l.id}`}>
                <Card noPadding>
                  <div style={{ position:"relative" }}>
                    {l.images?.length > 0 ? (
                      <img src={`${api.base}${l.images[0]}`} alt={l.title} className="card-image"
                        onError={e => { e.target.onerror=null; e.target.src=""; e.target.className="card-image-placeholder"; }} />
                    ) : (
                      <div className="card-image-placeholder"><IconCamera size={28} /></div>
                    )}
                    {l.is_sold && (
                      <div style={{
                        position:"absolute", top:6, left:6,
                        background:"var(--red,#e74c3c)", color:"#fff",
                        fontSize:9, fontWeight:800, padding:"2px 6px",
                        borderRadius:5, letterSpacing:0.5,
                      }}>SOLD</div>
                    )}
                    {l.safe_meet && (
                      <div style={{
                        position:"absolute", bottom:5, left:5,
                        background:"rgba(0,0,0,.65)", color:"var(--cyan)",
                        fontSize:8, fontWeight:800, padding:"2px 5px",
                        borderRadius:4, letterSpacing:0.3,
                      }}>🛡 SAFE</div>
                    )}
                    {l.is_pro_seller && !l.is_sold && (
                      <div style={{
                        position:"absolute", top:6, right:6,
                        background:"linear-gradient(135deg,var(--cyan),var(--violet))", color:"#fff",
                        fontSize:8, fontWeight:800, padding:"2px 5px",
                        borderRadius:4, letterSpacing:0.5,
                      }}>PRO</div>
                    )}
                  </div>
                  <div style={{ padding:"8px 10px" }}>
                    <div style={{ fontWeight:700, fontSize:12, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {l.title}
                    </div>
                    <div style={{ marginTop:2, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontWeight:800, fontSize:12 }}>{money(l.price_cents)}</span>
                      <span className="muted" style={{ fontSize:10 }}>{timeAgo(l.created_at)}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* ── Bottom sheet drawer ── */}
      {/* Backdrop */}
      <div onClick={() => setDrawerOpen(false)} style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,.55)",
        zIndex:200,
        opacity: drawerOpen ? 1 : 0,
        pointerEvents: drawerOpen ? "auto" : "none",
        transition:"opacity 280ms ease",
      }} />

      {/* Drawer panel */}
      <div ref={drawerRef} style={{
        position:"fixed", left:0, right:0, bottom:0,
        height:"90dvh",
        background:"var(--bg)",
        borderTop:"1px solid var(--border)",
        borderRadius:"20px 20px 0 0",
        zIndex:201,
        transform: drawerOpen ? "translateY(0)" : "translateY(105%)",
        transition:"transform 320ms cubic-bezier(.32,0,.23,1)",
        display:"flex", flexDirection:"column",
        overflowY:"hidden",
      }}>
        {/* Drag handle */}
        <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 4px" }}>
          <div style={{ width:40, height:4, borderRadius:4, background:"var(--border)" }} />
        </div>

        {/* Header */}
        <div style={{
          display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"8px 20px 12px",
          borderBottom:"1px solid var(--border)",
        }}>
          <span style={{ fontWeight:800, fontSize:16 }}>Filters</span>
          <button onClick={() => setDrawerOpen(false)} style={{
            background:"none", border:"none", color:"var(--muted)",
            cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:700,
          }}>Done</button>
        </div>

        {/* Scrollable filter content */}
        <div style={{ flex:1, overflowY:"auto", padding:"0 20px" }}>

          {/* Sort */}
          <AccordionSection
            title="Sort"
            isOpen={openSection === "sort"}
            onToggle={() => toggleSection("sort")}
            activeCount={pendingSort !== "newest" ? 1 : 0}
          >
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {SORT_OPTIONS.map(s => (
                <Pill key={s.value} active={pendingSort === s.value} onClick={() => setPendingSort(s.value)}>
                  {s.label}
                </Pill>
              ))}
            </div>
          </AccordionSection>

          {/* Category */}
          <AccordionSection
            title="Category"
            isOpen={openSection === "category"}
            onToggle={() => toggleSection("category")}
            activeCount={pendingCategory ? 1 : 0}
          >
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <Pill active={!pendingCategory} onClick={() => setPendingCategory("")}>All</Pill>
              {CATEGORIES.map(c => (
                <Pill key={c} active={pendingCategory === c} onClick={() => setPendingCategory(pendingCategory === c ? "" : c)}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </Pill>
              ))}
            </div>
          </AccordionSection>

          {/* Condition */}
          <AccordionSection
            title="Condition"
            isOpen={openSection === "condition"}
            onToggle={() => toggleSection("condition")}
            activeCount={pendingCondition ? 1 : 0}
          >
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <Pill active={!pendingCondition} onClick={() => setPendingCondition("")}>All</Pill>
              {CONDITIONS.map(c => (
                <Pill key={c} active={pendingCondition === c} onClick={() => setPendingCondition(pendingCondition === c ? "" : c)}>
                  {c.split(" ").map(w => w[0].toUpperCase() + w.slice(1)).join(" ")}
                </Pill>
              ))}
            </div>
          </AccordionSection>

          {/* Price Range */}
          <AccordionSection
            title="Price Range"
            isOpen={openSection === "price"}
            onToggle={() => toggleSection("price")}
            activeCount={(pendingMinPrice || pendingMaxPrice) ? 1 : 0}
          >
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <div style={{ flex:1, position:"relative" }}>
                <span style={{
                  position:"absolute", left:12, top:"50%", transform:"translateY(-50%)",
                  color:"var(--muted)", fontSize:13, pointerEvents:"none",
                }}>$</span>
                <input
                  type="number" placeholder="Min" value={pendingMinPrice}
                  onChange={e => setPendingMinPrice(e.target.value)}
                  style={{
                    width:"100%", padding:"10px 10px 10px 24px", borderRadius:12, fontSize:14,
                    background:"var(--panel2)", border:"1px solid var(--border)",
                    color:"var(--text)", fontFamily:"inherit", outline:"none",
                  }}
                />
              </div>
              <span className="muted" style={{ fontSize:13, flexShrink:0 }}>to</span>
              <div style={{ flex:1, position:"relative" }}>
                <span style={{
                  position:"absolute", left:12, top:"50%", transform:"translateY(-50%)",
                  color:"var(--muted)", fontSize:13, pointerEvents:"none",
                }}>$</span>
                <input
                  type="number" placeholder="Max" value={pendingMaxPrice}
                  onChange={e => setPendingMaxPrice(e.target.value)}
                  style={{
                    width:"100%", padding:"10px 10px 10px 24px", borderRadius:12, fontSize:14,
                    background:"var(--panel2)", border:"1px solid var(--border)",
                    color:"var(--text)", fontFamily:"inherit", outline:"none",
                  }}
                />
              </div>
            </div>
          </AccordionSection>

          {/* Location */}
          <AccordionSection
            title="Location"
            isOpen={openSection === "location"}
            onToggle={() => toggleSection("location")}
            activeCount={(pendingZip || pendingLat || pendingRadius) ? 1 : 0}
          >
            <div className="col" style={{ gap:12 }}>
              {/* ZIP */}
              <div>
                <div style={{ fontSize:11, color:"var(--muted)", fontWeight:700, marginBottom:6 }}>Near ZIP Code</div>
                <input
                  type="text" inputMode="numeric" placeholder="e.g. 01826" value={pendingZip}
                  onChange={e => setPendingZip(e.target.value.replace(/[^0-9]/g,"").slice(0,5))}
                  style={{
                    width:"100%", padding:"10px 12px", borderRadius:12, fontSize:14,
                    background:"var(--panel2)", border:"1px solid var(--border)",
                    color:"var(--text)", fontFamily:"inherit", outline:"none",
                  }}
                />
              </div>

              {/* OR use geolocation + radius */}
              <div>
                <div style={{ fontSize:11, color:"var(--muted)", fontWeight:700, marginBottom:6 }}>
                  Or use my location
                  {pendingLat && <span style={{ color:"var(--cyan)", marginLeft:6 }}>✓ Located</span>}
                </div>
                <button onClick={useMyLocation} disabled={locBusy} style={{
                  padding:"9px 16px", borderRadius:12, fontSize:13, fontWeight:700,
                  cursor:"pointer", fontFamily:"inherit",
                  background: pendingLat ? "rgba(62,224,255,.15)" : "var(--panel2)",
                  border: `1.5px solid ${pendingLat ? "var(--cyan)" : "var(--border)"}`,
                  color: pendingLat ? "var(--cyan)" : "var(--muted)",
                }}>
                  {locBusy ? "Locating..." : pendingLat ? "Update location" : "Use my location"}
                </button>
              </div>

              {/* Radius (only if geo location used) */}
              {pendingLat && (
                <div>
                  <div style={{ fontSize:11, color:"var(--muted)", fontWeight:700, marginBottom:6 }}>Distance</div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {RADIUS_OPTIONS.map(r => (
                      <Pill key={r.value} active={pendingRadius === r.value} onClick={() => setPendingRadius(r.value)}>
                        {r.label}
                      </Pill>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </AccordionSection>

          {/* Safe Meetup */}
          <AccordionSection
            title="Safety"
            isOpen={openSection === "safety"}
            onToggle={() => toggleSection("safety")}
            activeCount={pendingSafeMeet ? 1 : 0}
          >
            <button onClick={() => setPendingSafeMeet(p => !p)} style={{
              width:"100%", display:"flex", alignItems:"center", gap:12,
              padding:"12px 14px", borderRadius:14, cursor:"pointer",
              background: pendingSafeMeet ? "rgba(62,224,255,.12)" : "var(--panel2)",
              border: `1.5px solid ${pendingSafeMeet ? "var(--cyan)" : "var(--border)"}`,
              fontFamily:"inherit", textAlign:"left",
              transition:"all 150ms ease",
            }}>
              <div style={{
                width:22, height:22, borderRadius:6, flexShrink:0,
                border: pendingSafeMeet ? "none" : "2px solid var(--border)",
                background: pendingSafeMeet ? "var(--cyan)" : "transparent",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                {pendingSafeMeet && <span style={{ color:"#000", fontSize:13, fontWeight:800 }}>✓</span>}
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:13, color: pendingSafeMeet ? "var(--cyan)" : "var(--text)" }}>
                  🛡 Safe Meetup Sellers Only
                </div>
                <div style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>
                  Only show listings with a verified meetup location set
                </div>
              </div>
            </button>
          </AccordionSection>

          <div style={{ height:16 }} />
        </div>

        {/* Sticky footer */}
        <div style={{
          padding:"14px 20px",
          borderTop:"1px solid var(--border)",
          background:"var(--bg)",
          display:"flex", gap:10,
        }}>
          <button onClick={clearFilters} style={{
            flex:1, padding:"13px 16px", borderRadius:14, fontSize:14, fontWeight:700,
            cursor:"pointer", fontFamily:"inherit",
            background:"var(--panel2)", border:"1px solid var(--border)", color:"var(--muted)",
          }}>
            Clear All
          </button>
          <button onClick={applyFilters} style={{
            flex:2, padding:"13px 16px", borderRadius:14, fontSize:14, fontWeight:800,
            cursor:"pointer", fontFamily:"inherit",
            background:"linear-gradient(135deg, var(--cyan), #0099cc)",
            border:"none", color:"#000",
            boxShadow:"0 4px 20px rgba(62,224,255,.35)",
          }}>
            {previewCount != null
              ? `Show ${previewCount} result${previewCount !== 1 ? "s" : ""}`
              : pendingFilterCount > 0 ? "Apply Filters" : "Apply"}
          </button>
        </div>
      </div>
    </>
  );
}
