import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import Input from "../components/Input.jsx";
import Button from "../components/Button.jsx";
import { IconCamera, IconPlus, IconX } from "../components/Icons.jsx";
import { api } from "../api.js";

const CATEGORIES = [
  { value:"electronics", emoji:"💻", label:"Electronics" },
  { value:"clothing", emoji:"👕", label:"Clothing" },
  { value:"furniture", emoji:"🪑", label:"Furniture" },
  { value:"art", emoji:"🎨", label:"Art" },
  { value:"books", emoji:"📚", label:"Books" },
  { value:"sports", emoji:"⚽", label:"Sports" },
  { value:"toys", emoji:"🧸", label:"Toys" },
  { value:"home", emoji:"🏠", label:"Home" },
  { value:"auto", emoji:"🚗", label:"Auto" },
  { value:"other", emoji:"📦", label:"Other" },
];

const CONDITIONS = ["new", "like new", "used", "fair"];

export default function Post({ notify }){
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("electronics");
  const [condition, setCondition] = useState("used");
  const [zip, setZip] = useState("");
  const [desc, setDesc] = useState("");
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const addFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setFiles(prev => [...prev, ...picked]);
    setPreviews(prev => [...prev, ...picked.map(f => URL.createObjectURL(f))]);
    e.target.value = "";
  };

  const removeFile = (idx) => {
    URL.revokeObjectURL(previews[idx]);
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const onSubmit = async (e, isDraft = false) => {
    e.preventDefault();
    if (!title.trim()) { notify("Title is required"); return; }
    if (!isDraft && !zip.trim()) { notify("ZIP code is required"); return; }
    const price_cents = Math.round(parseFloat((price || "0").replace(/[^0-9.]/g, "")) * 100);
    if (!isDraft && (!price_cents || price_cents <= 0)) { notify("Enter a valid price"); return; }
    setBusy(true);
    try{
      const res = await api.createListing({
        title,
        description: desc,
        price_cents: price_cents || 0,
        category,
        condition,
        zip,
        pickup_or_shipping: "pickup",
        is_draft: isDraft,
      });

      const id = res.listing.id;

      if (files.length){
        await api.uploadListingImages(id, files);
      }

      if (isDraft) {
        notify("Saved as draft.");
        nav("/profile");
      } else {
        notify("Posted.");
        nav(`/listing/${id}`);
      }
    }catch(err){
      notify(err.message);
    }finally{
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar title="Post item" />
      <div style={{height:12}}/>

      <Card>
        <form onSubmit={onSubmit} className="col">
          <Input label="Title" placeholder="What are you selling?" value={title} onChange={e=>setTitle(e.target.value)} />
          <Input label="Price (USD)" placeholder="$0.00" value={price} onChange={e=>setPrice(e.target.value)} />

          {/* Category pills */}
          <div className="col" style={{gap:6}}>
            <div className="muted" style={{fontSize:13}}>Category</div>
            <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:2 }}>
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  style={{
                    flexShrink:0, padding:"8px 14px", borderRadius:20, fontSize:13, fontWeight:600,
                    cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap",
                    border: category === c.value ? "1.5px solid var(--cyan)" : "1px solid var(--border)",
                    background: category === c.value ? "rgba(62,224,255,.12)" : "var(--panel2)",
                    color: category === c.value ? "var(--cyan)" : "var(--text)",
                  }}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Condition pills */}
          <div className="col" style={{gap:6}}>
            <div className="muted" style={{fontSize:13}}>Condition</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {CONDITIONS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCondition(c)}
                  style={{
                    padding:"8px 16px", borderRadius:20, fontSize:13, fontWeight:600,
                    cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap",
                    border: condition === c ? "1.5px solid var(--cyan)" : "1px solid var(--border)",
                    background: condition === c ? "rgba(62,224,255,.12)" : "var(--panel2)",
                    color: condition === c ? "var(--cyan)" : "var(--text)",
                    textTransform:"capitalize",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <Input label="ZIP Code" placeholder="e.g. 01826" value={zip} onChange={e=>setZip(e.target.value.replace(/[^0-9]/g, "").slice(0, 5))} />

          {/* ── Photos ── */}
          <div className="col" style={{gap:8}}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div className="muted" style={{fontSize:13}}>Photos</div>
              <div className="muted" style={{fontSize:11}}>{files.length}/8</div>
            </div>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={addFiles}
              style={{ display:"none" }}
            />

            {/* Empty photo state — large drop zone */}
            {previews.length === 0 ? (
              <button type="button" onClick={() => fileRef.current?.click()} style={{
                width:"100%", height:140, borderRadius:14,
                border:"2px dashed var(--border)", background:"var(--panel2)",
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                gap:8, cursor:"pointer", color:"var(--muted)",
              }}>
                <IconCamera size={32} />
                <div style={{ fontWeight:600, fontSize:13 }}>Add up to 8 photos</div>
                <div style={{ fontSize:11 }}>First photo will be the cover</div>
              </button>
            ) : (
              <div style={{ display:"flex", gap:8, overflowX:"auto", paddingTop:4 }}>
                {previews.map((src, i) => (
                  <div key={i} style={{ position:"relative", flexShrink:0 }}>
                    <img src={src} alt="" style={{
                      width:80, height:80, objectFit:"cover", borderRadius:10,
                      border: i === 0 ? "2px solid var(--cyan)" : "1px solid var(--border)",
                    }} />
                    {i === 0 && (
                      <div style={{
                        position:"absolute", bottom:4, left:4, right:4, textAlign:"center",
                        fontSize:9, fontWeight:800, color:"#000",
                        background:"var(--cyan)", borderRadius:4, padding:"1px 0",
                      }}>COVER</div>
                    )}
                    <button type="button" onClick={() => removeFile(i)} style={{
                      position:"absolute", top:-6, right:-6,
                      width:20, height:20, borderRadius:"50%",
                      background:"var(--red, #e74c3c)", border:"none",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      cursor:"pointer", padding:0,
                    }}>
                      <IconX size={12} color="#fff" />
                    </button>
                  </div>
                ))}
                {files.length < 8 && (
                  <button type="button" onClick={() => fileRef.current?.click()} style={{
                    width:80, height:80, borderRadius:10, flexShrink:0,
                    border:"2px dashed var(--border)", background:"none",
                    display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                    gap:4, cursor:"pointer", color:"var(--muted)",
                  }}>
                    <IconCamera size={20} />
                    <span style={{ fontSize:10 }}>Add</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="col" style={{gap:8}}>
            <div className="muted" style={{fontSize:13}}>Description (optional)</div>
            <textarea
              value={desc}
              onChange={(e)=>setDesc(e.target.value)}
              placeholder="Add details about your item..."
              rows={4}
              style={{
                width:"100%",
                padding:"12px 12px",
                borderRadius:14,
                border:"1px solid var(--border)",
                background:"var(--input-bg)",
                color:"var(--text)",
                outline:"none",
                resize:"vertical"
              }}
            />
          </div>

          <button type="button" disabled={busy} onClick={(e) => onSubmit(e, true)} style={{
            width:"100%", padding:"12px 16px", borderRadius:14, fontSize:14, fontWeight:700,
            cursor:"pointer", fontFamily:"inherit",
            background:"none", border:"1.5px solid var(--border)", color:"var(--muted)",
          }}>
            Save as Draft
          </button>
          {/* spacer for sticky bar */}
          <div style={{ height:24 }} />
        </form>
      </Card>

      {/* Sticky bottom CTA */}
      <div style={{
        position:"fixed", bottom:60, left:0, right:0, zIndex:100,
        background:"var(--panel)", borderTop:"1px solid var(--border)",
        padding:"10px 16px",
        backdropFilter:"blur(12px)",
      }}>
        <button
          disabled={busy}
          onClick={(e) => onSubmit(e, false)}
          style={{
            width:"100%", padding:"14px", borderRadius:14, fontSize:15, fontWeight:800,
            cursor: busy ? "not-allowed" : "pointer", fontFamily:"inherit", border:"none",
            background: busy ? "var(--panel2)" : "var(--cyan)",
            color: busy ? "var(--muted)" : "#000",
          }}
        >
          {busy ? "Posting..." : "Post Item"}
        </button>
      </div>
    </>
  );
}
