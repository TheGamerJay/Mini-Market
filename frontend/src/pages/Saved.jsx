import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import { IconCamera, IconSearch, IconX, IconChevronRight } from "../components/Icons.jsx";
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

const CONDITION_COLORS = {
  "new":      { bg:"rgba(46,204,113,.18)",  color:"#2ecc71" },
  "like new": { bg:"rgba(62,224,255,.15)",  color:"var(--cyan)" },
  "used":     { bg:"rgba(255,255,255,.10)", color:"var(--muted)" },
  "fair":     { bg:"rgba(243,156,18,.15)",  color:"#f39c12" },
};

function SkeletonRow(){
  return (
    <div className="panel" style={{ display:"flex", gap:12, padding:12, alignItems:"center", borderRadius:14, marginBottom:8 }}>
      <div className="skeleton" style={{ width:64, height:64, borderRadius:12, flexShrink:0 }} />
      <div style={{ flex:1 }}>
        <div className="skeleton" style={{ width:"60%", height:12, marginBottom:8 }} />
        <div className="skeleton" style={{ width:"35%", height:10 }} />
      </div>
    </div>
  );
}

function SkeletonGrid(){
  return (
    <div className="grid">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="panel" style={{ borderRadius:14, overflow:"hidden" }}>
          <div className="skeleton" style={{ width:"100%", paddingTop:"100%", borderRadius:0 }} />
          <div style={{ padding:"8px 10px" }}>
            <div className="skeleton" style={{ width:"70%", height:11, marginBottom:6 }} />
            <div className="skeleton" style={{ width:"40%", height:10 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const VALID_TABS = ["items","searches","recent"];

export default function Saved({ notify }){
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = (() => {
    const fromUrl = searchParams.get("tab");
    if (VALID_TABS.includes(fromUrl)) return fromUrl;
    const fromStorage = localStorage.getItem("pm_saved_tab");
    if (VALID_TABS.includes(fromStorage)) return fromStorage;
    return "items";
  })();

  const [tab, setTabState] = useState(initialTab);
  const setTab = (t) => {
    setTabState(t);
    setSearchParams({ tab:t }, { replace:true });
    localStorage.setItem("pm_saved_tab", t);
  };

  const [items, setItems] = useState([]);
  const [itemsBusy, setItemsBusy] = useState(true);
  const [searches, setSearches] = useState([]);
  const [searchesBusy, setSearchesBusy] = useState(true);
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pm_recent") || "[]"); } catch { return []; }
  });

  const [gridView, setGridView] = useState(false);
  const [itemSort, setItemSort] = useState("saved");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.myObserving();
        const ids = (res.observing || []).map(x => x.listing_id);
        const details = await Promise.all(ids.map(id => api.listing(id).catch(() => null)));
        setItems(details.filter(Boolean).map(d => d.listing));
      } catch(err) { notify(err.message); }
      finally { setItemsBusy(false); }
    })();
    (async () => {
      try {
        const res = await api.savedSearches();
        setSearches(res.saved_searches || []);
      } catch(err) { notify(err.message); }
      finally { setSearchesBusy(false); }
    })();
    // Validate recent listings — remove any that no longer exist
    (async () => {
      try {
        const raw = JSON.parse(localStorage.getItem("pm_recent") || "[]");
        if (raw.length === 0) return;
        const results = await Promise.all(raw.map(r => api.listing(r.id).catch(() => null)));
        const valid = raw.filter((_, i) => results[i] !== null);
        if (valid.length !== raw.length) {
          localStorage.setItem("pm_recent", JSON.stringify(valid));
          setRecent(valid);
        }
      } catch {}
    })();
  }, []);

  const removeItem = async (e, listingId) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.toggleObserving(listingId);
      setItems(prev => prev.filter(l => l.id !== listingId));
      notify("Removed from Saved.");
    } catch(err) { notify(err.message); }
  };

  const removeSearch = async (id) => {
    try {
      await api.deleteSavedSearch(id);
      setSearches(r => r.filter(s => s.id !== id));
      notify("Saved search removed.");
    } catch(err) { notify(err.message); }
  };

  const TABS = [
    { key:"items",    label:"Items",    count: itemsBusy ? null : items.length },
    { key:"searches", label:"Searches", count: searchesBusy ? null : searches.length },
    { key:"recent",   label:"Recent",   count: recent.length },
  ];

  return (
    <>
      <TopBar title="Saved" onBack={() => nav(-1)} centerTitle />
      <div style={{ height:8 }} />

      {/* Personalization header */}
      {!itemsBusy && items.length > 0 && (
        <div style={{ textAlign:"center", marginBottom:6 }}>
          <span className="muted" style={{ fontSize:12 }}>
            You have <span style={{ color:"var(--cyan)", fontWeight:700 }}>{items.length} saved item{items.length !== 1 ? "s" : ""}</span>
          </span>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{
        display:"flex", gap:6, marginBottom:16,
        background:"var(--panel)", borderRadius:14,
        padding:4, border:"1px solid var(--border)",
      }}>
        {TABS.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex:1, padding:"9px 4px", fontSize:12, fontWeight:700,
              cursor:"pointer", fontFamily:"inherit", border:"none",
              borderRadius:11,
              background: tab === key ? "var(--cyan)" : "transparent",
              color: tab === key ? "#000" : "var(--muted)",
              transition:"all 150ms ease",
              display:"flex", alignItems:"center", justifyContent:"center", gap:5,
            }}
          >
            {label}
            {count != null && count > 0 && (
              <span style={{
                background: tab === key ? "rgba(0,0,0,.18)" : "var(--panel2)",
                color: tab === key ? "#000" : "var(--muted)",
                borderRadius:8, fontSize:9, fontWeight:800,
                padding:"1px 5px", minWidth:16, textAlign:"center",
              }}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Items tab ── */}
      {tab === "items" && (
        itemsBusy ? (
          gridView ? <SkeletonGrid /> : <>{[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}</>
        ) : items.length === 0 ? (
          <Card>
            <div style={{ textAlign:"center", padding:"8px 0" }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🔖</div>
              <div className="muted" style={{ fontSize:14, marginBottom:12 }}>No saved items yet</div>
              <div className="muted" style={{ fontSize:12, marginBottom:14 }}>
                Tap the eye icon on any listing to watch it
              </div>
              <Link to="/" style={{
                display:"inline-block", padding:"9px 20px", borderRadius:12,
                background:"var(--cyan)", color:"#000", fontSize:13, fontWeight:700,
              }}>Browse Listings</Link>
            </div>
          </Card>
        ) : (
          <>
            {/* Sort + Grid toggle row */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <select value={itemSort} onChange={e => setItemSort(e.target.value)} style={{
                background:"var(--input-bg)", border:"1px solid var(--border)", borderRadius:8,
                color:"var(--muted)", fontSize:11, fontWeight:700, padding:"5px 8px",
                fontFamily:"inherit", cursor:"pointer", outline:"none",
              }}>
                <option value="saved">Order Saved</option>
                <option value="price_low">Price: Low → High</option>
                <option value="price_high">Price: High → Low</option>
              </select>
            {/* List / Grid toggle */}
            <div style={{ display:"flex", gap:6 }}>
              {[{v:false,icon:"☰"},{v:true,icon:"⊞"}].map(({v,icon}) => (
                <button key={icon} onClick={() => setGridView(v)} style={{
                  padding:"5px 10px", borderRadius:8, fontSize:13, cursor:"pointer",
                  border:"1px solid", fontFamily:"inherit",
                  borderColor: gridView === v ? "var(--cyan)" : "var(--border)",
                  background: gridView === v ? "rgba(62,224,255,.12)" : "var(--panel)",
                  color: gridView === v ? "var(--cyan)" : "var(--muted)",
                }}>{icon}</button>
              ))}
            </div>
            </div>

            {(() => {
              const sorted = [...items].sort((a,b) => {
                if (itemSort === "price_low") return a.price_cents - b.price_cents;
                if (itemSort === "price_high") return b.price_cents - a.price_cents;
                return 0;
              });
              return gridView ? (
              <div className="grid">
                {sorted.map(l => (
                  <Link key={l.id} to={`/listing/${l.id}`}>
                    <Card noPadding>
                      <div style={{ position:"relative" }}>
                        {l.images?.length > 0 ? (
                          <img src={`${api.base}${l.images[0]}`} alt={l.title} className="card-image" />
                        ) : (
                          <div className="card-image-placeholder"><IconCamera size={24} /></div>
                        )}
                        <div style={{
                          position:"absolute", bottom:0, left:0, right:0, height:"35%",
                          background:"linear-gradient(to top,rgba(0,0,0,.5),transparent)",
                          pointerEvents:"none",
                        }}/>
                        {l.is_sold && (
                          <div style={{
                            position:"absolute", top:5, left:5,
                            background:"var(--red,#e74c3c)", color:"#fff",
                            fontSize:8, fontWeight:800, padding:"2px 5px", borderRadius:4,
                          }}>SOLD</div>
                        )}
                        {l.safe_meet && (
                          <div style={{
                            position:"absolute", top:5, left: l.is_sold ? "auto" : 5, right: l.is_sold ? 5 : "auto",
                            background:"rgba(0,0,0,.6)", color:"var(--cyan)",
                            fontSize:8, padding:"2px 5px", borderRadius:4, fontWeight:800,
                          }}>🛡</div>
                        )}
                        <button
                          onClick={(e) => removeItem(e, l.id)}
                          style={{
                            position:"absolute", bottom:5, right:5,
                            background:"rgba(0,0,0,.6)", border:"none",
                            borderRadius:6, padding:"3px 6px", cursor:"pointer",
                            color:"var(--red,#e74c3c)", fontSize:10, fontWeight:800,
                            fontFamily:"inherit",
                          }}
                        >✕</button>
                      </div>
                      <div style={{ padding:"7px 9px" }}>
                        <div style={{ fontWeight:700, fontSize:11, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{l.title}</div>
                        <div style={{ marginTop:3, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <span style={{ fontWeight:800, fontSize:12, color:"var(--cyan)" }}>{money(l.price_cents)}</span>
                          {l.condition && (() => {
                            const s = CONDITION_COLORS[l.condition.toLowerCase()] || CONDITION_COLORS["used"];
                            return <span style={{ fontSize:8, fontWeight:700, padding:"2px 5px", borderRadius:5, background:s.bg, color:s.color }}>{l.condition}</span>;
                          })()}
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {sorted.map(l => (
                  <Link key={l.id} to={`/listing/${l.id}`} style={{ display:"block" }}>
                    <div className="panel" style={{
                      display:"flex", gap:12, padding:12, alignItems:"center", borderRadius:14,
                    }}>
                      <div style={{
                        width:64, height:64, borderRadius:12, overflow:"hidden",
                        flexShrink:0, background:"var(--panel2)", position:"relative",
                        display:"flex", alignItems:"center", justifyContent:"center",
                      }}>
                        {l.images?.length > 0 ? (
                          <img src={`${api.base}${l.images[0]}`} alt={l.title} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                        ) : (
                          <IconCamera size={22} color="var(--muted)" />
                        )}
                        {l.is_sold && (
                          <div style={{
                            position:"absolute", inset:0, background:"rgba(0,0,0,.55)",
                            display:"flex", alignItems:"center", justifyContent:"center",
                            fontSize:8, fontWeight:800, color:"var(--red,#e74c3c)", letterSpacing:0.5,
                          }}>SOLD</div>
                        )}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{l.title}</div>
                        <div style={{ marginTop:4, display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontWeight:800, fontSize:13, color:"var(--cyan)" }}>{money(l.price_cents)}</span>
                          {l.condition && (() => {
                            const s = CONDITION_COLORS[l.condition.toLowerCase()] || CONDITION_COLORS["used"];
                            return <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:6, background:s.bg, color:s.color }}>{l.condition.charAt(0).toUpperCase() + l.condition.slice(1)}</span>;
                          })()}
                          {l.safe_meet && <span style={{ fontSize:10 }}>🛡</span>}
                        </div>
                        {l.observing_count > 0 && !l.is_sold && (
                          <div className="muted" style={{ fontSize:10, marginTop:2 }}>{l.observing_count} people saving this</div>
                        )}
                      </div>
                      <button
                        onClick={(e) => removeItem(e, l.id)}
                        style={{
                          background:"none", border:"1px solid var(--border)",
                          borderRadius:8, width:32, height:32, cursor:"pointer",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          color:"var(--muted)", flexShrink:0,
                        }}
                      >
                        <IconX size={14} />
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
            );
            })()}
          </>
        )
      )}

      {/* ── Searches tab ── */}
      {tab === "searches" && (
        searchesBusy ? (
          <>{[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}</>
        ) : searches.length === 0 ? (
          <Card>
            <div style={{ textAlign:"center", padding:"8px 0" }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🔍</div>
              <div className="muted" style={{ fontSize:14, marginBottom:12 }}>No saved searches yet</div>
              <div className="muted" style={{ fontSize:12, marginBottom:14 }}>
                Search for something and tap "Save Search" to see it here
              </div>
              <Link to="/search" style={{
                display:"inline-block", padding:"9px 20px", borderRadius:12,
                background:"var(--cyan)", color:"#000", fontSize:13, fontWeight:700,
              }}>Go to Search</Link>
            </div>
          </Card>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {searches.map(s => (
              <div key={s.id} className="panel" style={{
                display:"flex", alignItems:"center",
                padding:"12px 14px", borderRadius:14,
              }}>
                <div
                  onClick={() => nav(`/search?q=${encodeURIComponent(s.query)}`)}
                  style={{ display:"flex", alignItems:"center", gap:12, cursor:"pointer", flex:1, minWidth:0 }}
                >
                  <div style={{
                    width:36, height:36, borderRadius:10, flexShrink:0,
                    background:"rgba(62,224,255,.12)", border:"1px solid rgba(62,224,255,.2)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    <IconSearch size={16} color="var(--cyan)" />
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {s.query}
                    </div>
                    <div className="muted" style={{ fontSize:10, marginTop:2 }}>
                      {s.category && <span style={{ marginRight:8, textTransform:"capitalize" }}>{s.category}</span>}
                      {s.created_at && timeAgo(s.created_at)}
                    </div>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0, marginLeft:8 }}>
                  <div onClick={() => nav(`/search?q=${encodeURIComponent(s.query)}`)} style={{ cursor:"pointer", color:"var(--muted)", display:"flex" }}>
                    <IconChevronRight size={18} />
                  </div>
                  <button onClick={() => removeSearch(s.id)} style={{
                    background:"none", border:"none", cursor:"pointer",
                    color:"var(--muted)", display:"flex", padding:4,
                  }}>
                    <IconX size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Recent tab ── */}
      {tab === "recent" && (
        recent.length === 0 ? (
          <Card>
            <div style={{ textAlign:"center", padding:"8px 0" }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🕐</div>
              <div className="muted" style={{ fontSize:14, marginBottom:12 }}>No recently viewed items</div>
              <div className="muted" style={{ fontSize:12, marginBottom:14 }}>
                Items you view will appear here
              </div>
              <Link to="/" style={{
                display:"inline-block", padding:"9px 20px", borderRadius:12,
                background:"var(--cyan)", color:"#000", fontSize:13, fontWeight:700,
              }}>Browse Listings</Link>
            </div>
          </Card>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {recent.map(l => (
              <Link key={l.id} to={`/listing/${l.id}`} style={{ display:"block" }}>
                <div className="panel" style={{
                  display:"flex", gap:12, padding:12, alignItems:"center", borderRadius:14,
                }}>
                  <div style={{
                    width:64, height:64, borderRadius:12, overflow:"hidden",
                    flexShrink:0, background:"var(--panel2)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    {(l.image || l.images?.[0]) ? (
                      <img src={`${api.base}${l.image || l.images[0]}`} alt={l.title} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    ) : (
                      <IconCamera size={22} color="var(--muted)" />
                    )}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{l.title}</div>
                    <div style={{ marginTop:4 }}>
                      <span style={{ fontWeight:800, fontSize:13, color:"var(--cyan)" }}>{money(l.price_cents)}</span>
                    </div>
                  </div>
                  <IconChevronRight size={16} color="var(--muted)" />
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      <div style={{ height:20 }} />
    </>
  );
}
