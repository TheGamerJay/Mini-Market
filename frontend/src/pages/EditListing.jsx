import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import Input from "../components/Input.jsx";
import Button from "../components/Button.jsx";
import { IconCamera, IconX, IconPin } from "../components/Icons.jsx";
import { api } from "../api.js";

function money(cents) {
  return (cents / 100).toFixed(2);
}

export default function EditListing({ notify }) {
  const { id } = useParams();
  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("electronics");
  const [condition, setCondition] = useState("used");
  const [zip, setZip] = useState("");
  const [desc, setDesc] = useState("");
  const [bundle, setBundle] = useState("");
  const [isSold, setIsSold] = useState(false);
  const [safeMeet, setSafeMeet] = useState(null);
  const [renewedAt, setRenewedAt] = useState(null);
  const [createdAt, setCreatedAt] = useState(null);

  const [existingImages, setExistingImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef(null);

  useEffect(() => {
    api.listing(id).then(data => {
      const l = data.listing;
      setTitle(l.title || "");
      setPrice(l.price_cents ? money(l.price_cents) : "");
      setCategory(l.category || "electronics");
      setCondition(l.condition || "used");
      setZip(l.zip || "");
      setDesc(l.description || "");
      setBundle(l.bundle_discount_pct ? String(l.bundle_discount_pct) : "");
      setIsSold(!!l.is_sold);
      setSafeMeet(l.safe_meet || null);
      setRenewedAt(l.renewed_at || null);
      setCreatedAt(l.created_at || null);
      setExistingImages(
        (l.images || []).map(url => ({ id: url.split("/").pop(), url }))
      );
    }).catch(err => {
      notify(err.message);
      nav("/profile");
    }).finally(() => setLoading(false));
  }, [id]);

  const addFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    setNewFiles(prev => [...prev, ...picked]);
    setNewPreviews(prev => [...prev, ...picked.map(f => URL.createObjectURL(f))]);
    e.target.value = "";
  };

  const removeNewFile = (idx) => {
    URL.revokeObjectURL(newPreviews[idx]);
    setNewFiles(prev => prev.filter((_, i) => i !== idx));
    setNewPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const deleteExistingImage = async (imageId) => {
    try {
      await api.deleteListingImage(id, imageId);
      setExistingImages(prev => prev.filter(img => img.id !== imageId));
    } catch (err) {
      notify(err.message);
    }
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) { notify("Title is required"); return; }
    const price_cents = Math.round(parseFloat((price || "0").replace(/[^0-9.]/g, "")) * 100);
    if (!price_cents || price_cents <= 0) { notify("Enter a valid price"); return; }
    setBusy(true);
    try {
      await api.updateListing(id, {
        title,
        description: desc,
        price_cents,
        category,
        condition,
        zip,
        bundle_discount_pct: bundle ? parseInt(bundle) || null : null,
      });

      if (newFiles.length) {
        await api.uploadListingImages(id, newFiles);
      }

      notify("Listing updated.");
      nav(`/listing/${id}`);
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleSold = async () => {
    try {
      await api.updateListing(id, { is_sold: !isSold });
      setIsSold(prev => !prev);
      notify(isSold ? "Marked as available." : "Marked as sold.");
    } catch (err) {
      notify(err.message);
    }
  };

  const renew = async () => {
    try {
      const res = await api.renewListing(id);
      setRenewedAt(res.renewed_at);
      notify("Listing renewed for 30 days!");
    } catch (err) {
      notify(err.message);
    }
  };

  const deleteListing = async () => {
    if (!window.confirm("Delete this listing? This can't be undone.")) return;
    try {
      await api.deleteListing(id);
      notify("Listing deleted.");
      nav("/profile");
    } catch (err) {
      notify(err.message);
    }
  };

  // Expiry calculation
  const base = renewedAt || createdAt;
  const daysOld = base ? Math.floor((Date.now() - new Date(base).getTime()) / 86400000) : 0;
  const daysLeft = 30 - daysOld;
  const showRenew = daysLeft <= 7;

  const totalImages = existingImages.length + newFiles.length;

  if (loading) return <div style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>Loading...</div>;

  return (
    <>
      <TopBar title="Edit listing" />
      <div style={{ height: 12 }} />

      {/* Expiry / renew banner */}
      {showRenew && (
        <div style={{
          marginBottom: 12, padding: "10px 14px", borderRadius: 12,
          background: daysLeft <= 0 ? "rgba(231,76,60,.15)" : "rgba(255,165,0,.12)",
          border: `1px solid ${daysLeft <= 0 ? "var(--red,#e74c3c)" : "orange"}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: daysLeft <= 0 ? "var(--red,#e74c3c)" : "orange" }}>
              {daysLeft <= 0 ? "Listing expired" : `Expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}
            </div>
            <div className="muted" style={{ fontSize: 11 }}>Renew to keep it visible</div>
          </div>
          <button onClick={renew} style={{
            padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700,
            background: "var(--cyan)", border: "none", color: "#000", cursor: "pointer",
          }}>Renew</button>
        </div>
      )}

      <Card>
        <form onSubmit={onSave} className="col">
          <Input label="Title" placeholder="What are you selling?" value={title} onChange={e => setTitle(e.target.value)} />
          <Input label="Price (USD)" placeholder="$0.00" value={price} onChange={e => setPrice(e.target.value)} />

          <div className="col" style={{ gap: 4 }}>
            <div className="muted" style={{ fontSize: 13 }}>Category</div>
            <select value={category} onChange={e => setCategory(e.target.value)} style={{
              width: "100%", padding: "12px 12px", borderRadius: 14,
              border: "1px solid var(--border)", background: "var(--input-bg)",
              color: "var(--text)", outline: "none", fontSize: 14,
            }}>
              <option value="electronics">Electronics</option>
              <option value="clothing">Clothing</option>
              <option value="furniture">Furniture</option>
              <option value="art">Art</option>
              <option value="books">Books</option>
              <option value="sports">Sports</option>
              <option value="toys">Toys</option>
              <option value="home">Home</option>
              <option value="auto">Auto</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="col" style={{ gap: 4 }}>
            <div className="muted" style={{ fontSize: 13 }}>Condition</div>
            <select value={condition} onChange={e => setCondition(e.target.value)} style={{
              width: "100%", padding: "12px 12px", borderRadius: 14,
              border: "1px solid var(--border)", background: "var(--input-bg)",
              color: "var(--text)", outline: "none", fontSize: 14,
            }}>
              <option value="new">New</option>
              <option value="like new">Like New</option>
              <option value="used">Used</option>
              <option value="fair">Fair</option>
            </select>
          </div>

          <Input label="ZIP Code" placeholder="e.g. 01826" value={zip} onChange={e => setZip(e.target.value.replace(/[^0-9]/g, "").slice(0, 5))} />

          <Input
            label="Bundle discount % (optional)"
            placeholder="e.g. 10 for 10% off"
            value={bundle}
            onChange={e => setBundle(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
          />

          {/* Photos */}
          <div className="col" style={{ gap: 8 }}>
            <div className="muted" style={{ fontSize: 13 }}>Photos ({totalImages})</div>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={addFiles}
              style={{ display: "none" }}
            />
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingTop: 4, flexWrap: "wrap" }}>
              {existingImages.map(img => (
                <div key={img.id} style={{ position: "relative", flexShrink: 0 }}>
                  <img src={`${api.base}${img.url}`} alt="" style={{
                    width: 72, height: 72, objectFit: "cover", borderRadius: 10,
                    border: "1px solid var(--border)",
                  }} />
                  <button type="button" onClick={() => deleteExistingImage(img.id)} style={{
                    position: "absolute", top: -6, right: -6,
                    width: 20, height: 20, borderRadius: "50%",
                    background: "var(--red,#e74c3c)", border: "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", padding: 0,
                  }}>
                    <IconX size={12} color="#fff" />
                  </button>
                </div>
              ))}
              {newPreviews.map((src, i) => (
                <div key={`new-${i}`} style={{ position: "relative", flexShrink: 0 }}>
                  <img src={src} alt="" style={{
                    width: 72, height: 72, objectFit: "cover", borderRadius: 10,
                    border: "2px solid var(--cyan)",
                  }} />
                  <button type="button" onClick={() => removeNewFile(i)} style={{
                    position: "absolute", top: -6, right: -6,
                    width: 20, height: 20, borderRadius: "50%",
                    background: "var(--red,#e74c3c)", border: "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", padding: 0,
                  }}>
                    <IconX size={12} color="#fff" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => fileRef.current?.click()} style={{
                width: 72, height: 72, borderRadius: 10, flexShrink: 0,
                border: "2px dashed var(--border)", background: "none",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 4, cursor: "pointer", color: "var(--muted)",
              }}>
                <IconCamera size={20} />
                <span style={{ fontSize: 10 }}>Add</span>
              </button>
            </div>
          </div>

          <div className="col" style={{ gap: 8 }}>
            <div className="muted" style={{ fontSize: 13 }}>Description (optional)</div>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Add details about your item..."
              rows={4}
              style={{
                width: "100%", padding: "12px 12px", borderRadius: 14,
                border: "1px solid var(--border)", background: "var(--input-bg)",
                color: "var(--text)", outline: "none", resize: "vertical",
              }}
            />
          </div>

          <Button disabled={busy}>{busy ? "Saving..." : "Save changes"}</Button>
        </form>
      </Card>

      {/* Safe meetup location */}
      <div style={{ height: 12 }} />
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: safeMeet ? 10 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <IconPin size={16} color="var(--cyan)" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Safe meetup location</span>
          </div>
          <Link to={`/listing/${id}/meetup`} style={{
            fontSize: 12, fontWeight: 700, color: "var(--cyan)", textDecoration: "none",
          }}>
            {safeMeet ? "Change" : "Set location"}
          </Link>
        </div>
        {safeMeet ? (
          <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--panel2)", border: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{safeMeet.place_name}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{safeMeet.address}</div>
          </div>
        ) : (
          <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            No meetup spot set. Buyers will see your ZIP area only.
          </div>
        )}
      </Card>

      {/* Sold toggle + Delete */}
      <div style={{ height: 12 }} />
      <Card>
        <div className="col" style={{ gap: 10 }}>
          <button onClick={toggleSold} style={{
            width: "100%", padding: "12px 16px", borderRadius: 14, fontSize: 14, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
            background: isSold ? "rgba(46,204,113,.12)" : "rgba(62,224,255,.08)",
            border: `1.5px solid ${isSold ? "var(--green,#2ecc71)" : "var(--cyan)"}`,
            color: isSold ? "var(--green,#2ecc71)" : "var(--cyan)",
          }}>
            {isSold ? "Mark as Available" : "Mark as Sold"}
          </button>

          <button onClick={deleteListing} style={{
            width: "100%", padding: "12px 16px", borderRadius: 14, fontSize: 14, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
            background: "rgba(231,76,60,.10)", border: "1.5px solid var(--red,#e74c3c)",
            color: "var(--red,#e74c3c)",
          }}>
            Delete listing
          </button>
        </div>
      </Card>

      <div style={{ height: 24 }} />
    </>
  );
}
