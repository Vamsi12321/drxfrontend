import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (q) {
    try {
      const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`);
      if (!r.ok) return NextResponse.json({ error: "Photon error" }, { status: r.status });
      const data = await r.json();
      
      const mapped = (data.features || []).map(f => {
        const p = f.properties || {};
        const coords = f.geometry?.coordinates || [0, 0];
        const parts = [p.name, p.street, p.city, p.state, p.country].filter(Boolean);
        return {
          lat: coords[1].toString(),
          lon: coords[0].toString(),
          display_name: parts.join(", "),
          name: p.name || parts[0] || "Unknown",
          structured: {
            name: p.name || "",
            street: p.street || "",
            area: p.district || p.locality || "",
            city: p.city || p.town || p.village || "",
            district: p.county || p.city || "",
            state: p.state || "",
            country: p.country || "",
            postcode: p.postcode || "",
          }
        };
      });
      return NextResponse.json(mapped);
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  } 
  
  if (lat && lng) {
    try {
      const r = await fetch(`https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}`);
      if (!r.ok) return NextResponse.json({ error: "Photon error" }, { status: r.status });
      const data = await r.json();
      
      if (data.features && data.features.length > 0) {
        const p = data.features[0].properties || {};
        const parts = [p.name, p.street, p.city, p.state, p.country].filter(Boolean);
        return NextResponse.json({
          display_name: parts.join(", "),
          structured: {
            name: p.name || "",
            street: p.street || "",
            area: p.district || p.locality || "",
            city: p.city || p.town || p.village || "",
            district: p.county || p.city || "",
            state: p.state || "",
            country: p.country || "",
            postcode: p.postcode || "",
          }
        });
      }
      return NextResponse.json({ display_name: `${lat}, ${lng}`, structured: {} });
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
}
