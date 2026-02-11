import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import TopBar from "../components/TopBar.jsx";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import { IconPin } from "../components/Icons.jsx";
import { api } from "../api.js";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const selectedIcon = new L.Icon({
  iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow,
  iconSize: [30, 45], iconAnchor: [15, 45], popupAnchor: [0, -40], shadowSize: [41, 41],
  className: "selected-marker",
});

function generateSafeLocations(lat, lng){
  return [
    { name: "Police Station", address: "Nearest police station", type: "police", lat: lat + 0.005, lng: lng - 0.004 },
    { name: "Public Library", address: "Local public library", type: "library", lat: lat - 0.003, lng: lng + 0.005 },
    { name: "Coffee Shop", address: "Busy coffee shop nearby", type: "cafe", lat: lat + 0.002, lng: lng + 0.006 },
    { name: "Shopping Mall", address: "Mall main entrance", type: "mall", lat: lat - 0.004, lng: lng - 0.003 },
    { name: "Fire Station", address: "Nearest fire station", type: "fire_station", lat: lat + 0.006, lng: lng + 0.002 },
  ];
}

export default function SafeMeetup({ notify }){
  const nav = useNavigate();
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.listing(id);
        const l = res.listing;
        setListing(l);
        if (l.lat && l.lng) {
          setLocations(generateSafeLocations(l.lat, l.lng));
        }
      } catch(err) { notify(err.message); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const onSelect = async () => {
    if (selected === null) { notify("Pick a location first."); return; }
    setBusy(true);
    try{
      const loc = locations[selected];
      await api.setSafeMeet(id, {
        place_name: loc.name,
        address: loc.address,
        lat: loc.lat,
        lng: loc.lng,
        place_type: loc.type,
      });
      notify("Safe meetup location set!");
      nav(-1);
    }catch(err){ notify(err.message); }
    finally{ setBusy(false); }
  };

  if (loading) return <Card style={{ marginTop:20 }}><div className="muted">Loading...</div></Card>;

  const center = listing?.lat && listing?.lng
    ? [listing.lat, listing.lng]
    : [40.7128, -74.006]; // default NYC

  return (
    <>
      <TopBar title="Safe Meetup" onBack={() => nav(-1)} centerTitle />
      <div style={{ height:12 }} />

      <div className="muted" style={{ fontSize:13, marginBottom:10, textAlign:"center" }}>
        Choose a safe, public location to meet the buyer/seller
      </div>

      {/* Map */}
      <div style={{ height:260, width:"100%", borderRadius:14, overflow:"hidden" }}>
        <MapContainer center={center} zoom={14} scrollWheelZoom={false} style={{ height:"100%", width:"100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {locations.map((loc, i) => (
            <Marker
              key={i}
              position={[loc.lat, loc.lng]}
              icon={selected === i ? selectedIcon : L.icon({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] })}
              eventHandlers={{ click: () => setSelected(i) }}
            >
              <Popup>{loc.name}<br /><span style={{ fontSize:12 }}>{loc.address}</span></Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Location cards */}
      <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:8 }}>
        {locations.map((loc, i) => (
          <div
            key={i}
            onClick={() => setSelected(i)}
            className="panel"
            style={{
              padding:"12px 14px", borderRadius:12, cursor:"pointer",
              display:"flex", alignItems:"center", gap:10,
              border: selected === i ? "2px solid var(--cyan)" : "1px solid var(--border)",
            }}
          >
            <IconPin size={20} color={selected === i ? "var(--cyan)" : "var(--muted)"} />
            <div>
              <div style={{ fontWeight:700, fontSize:14 }}>{loc.name}</div>
              <div className="muted" style={{ fontSize:12 }}>{loc.address}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:10 }}>
        <Button disabled={busy || selected === null} onClick={onSelect}>
          {busy ? "Setting..." : "Confirm Location"}
        </Button>
        <Button variant="ghost" onClick={() => nav(-1)}>Cancel</Button>
      </div>
    </>
  );
}
