import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";
import Input from "../components/Input.jsx";
import Button from "../components/Button.jsx";
import { IconCamera, IconX } from "../components/Icons.jsx";
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

  // existing images from server: [{id, url}]
  const [existingImages, setExistingImages] = useState([]);
  // new files to upload
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
      // parse image id from url: /api/listings/image/<uuid>
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

  const totalImages = existingImages.length + newFiles.length;

  if (loading) return <div style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>Loading...</div>;

  return (
    <>
      <TopBar title="Edit listing" />
      <div style={{ height: 12 }} />

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
              {/* Existing images */}
              {existingImages.map(img => (
                <div key={img.id} style={{ position: "relative", flexShrink: 0 }}>
                  <img src={`${api.base}${img.url}`} alt="" style={{
                    width: 72, height: 72, objectFit: "cover", borderRadius: 10,
                    border: "1px solid var(--border)",
                  }} />
                  <button type="button" onClick={() => deleteExistingImage(img.id)} style={{
                    position: "absolute", top: -6, right: -6,
                    width: 20, height: 20, borderRadius: "50%",
                    background: "var(--red, #e74c3c)", border: "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", padding: 0,
                  }}>
                    <IconX size={12} color="#fff" />
                  </button>
                </div>
              ))}

              {/* New files preview */}
              {newPreviews.map((src, i) => (
                <div key={`new-${i}`} style={{ position: "relative", flexShrink: 0 }}>
                  <img src={src} alt="" style={{
                    width: 72, height: 72, objectFit: "cover", borderRadius: 10,
                    border: "2px solid var(--cyan)",
                  }} />
                  <button type="button" onClick={() => removeNewFile(i)} style={{
                    position: "absolute", top: -6, right: -6,
                    width: 20, height: 20, borderRadius: "50%",
                    background: "var(--red, #e74c3c)", border: "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", padding: 0,
                  }}>
                    <IconX size={12} color="#fff" />
                  </button>
                </div>
              ))}

              {/* Add button */}
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
                width: "100%",
                padding: "12px 12px",
                borderRadius: 14,
                border: "1px solid var(--border)",
                background: "var(--input-bg)",
                color: "var(--text)",
                outline: "none",
                resize: "vertical",
              }}
            />
          </div>

          <Button disabled={busy}>{busy ? "Saving..." : "Save changes"}</Button>
        </form>
      </Card>
    </>
  );
}
