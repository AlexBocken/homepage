/**
 * Project a lat/lng polyline into SVG pixel coordinates for a small inline
 * preview (cosine-corrected for aspect, fit-to-box). Mirrors the SessionCard
 * fallback polyline approach; shared by segment cards + the segment creator.
 */

type Pt = number[] | { lat: number; lng: number };

export interface XY {
  x: number;
  y: number;
}

function toLL(p: Pt): { lat: number; lng: number } {
  return Array.isArray(p) ? { lat: p[0], lng: p[1] } : p;
}

export function projectTrack(points: Pt[], w: number, h: number, pad = 4): XY[] {
  const pts = points.map(toLL);
  if (!pts.length) return [];
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of pts) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  const latMid = (minLat + maxLat) / 2;
  const cos = Math.cos((latMid * Math.PI) / 180) || 1;
  const spanLng = (maxLng - minLng) * cos || 1e-6;
  const spanLat = maxLat - minLat || 1e-6;
  const scale = Math.min((w - 2 * pad) / spanLng, (h - 2 * pad) / spanLat);
  const offX = (w - spanLng * scale) / 2;
  const offY = (h - spanLat * scale) / 2;
  return pts.map((p) => ({
    x: offX + (p.lng - minLng) * cos * scale,
    y: h - (offY + (p.lat - minLat) * scale) // flip Y: north is up
  }));
}

export function svgPath(xy: XY[]): string {
  return xy.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}
