import type { LatLng } from "./city";

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

export const haversine = (a: LatLng, b: LatLng) => {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** Cumulative distances so a point at any progress can be found quickly */
const cache = new WeakMap<LatLng[], number[]>();
const cumulative = (path: LatLng[]) => {
  let c = cache.get(path);
  if (!c) {
    c = [0];
    for (let i = 1; i < path.length; i++) c.push(c[i - 1] + haversine(path[i - 1], path[i]));
    cache.set(path, c);
  }
  return c;
};

/** Position and heading at progress t ∈ [0, 1] along a path */
export function pointAt(path: LatLng[], t: number): { pos: LatLng; heading: number } {
  if (path.length === 1) return { pos: path[0], heading: 0 };
  const c = cumulative(path);
  const target = Math.min(Math.max(t, 0), 1) * c[c.length - 1];
  let i = 1;
  while (i < c.length - 1 && c[i] < target) i++;
  const seg = c[i] - c[i - 1] || 1;
  const k = (target - c[i - 1]) / seg;
  const [a, b] = [path[i - 1], path[i]];
  const heading = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  return { pos: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], heading };
}

/** The not-yet-travelled part of a path, for drawing what's left of a route */
export function remainingPath(path: LatLng[], t: number): LatLng[] {
  if (t <= 0) return path;
  const c = cumulative(path);
  const target = Math.min(t, 1) * c[c.length - 1];
  const i = c.findIndex((d) => d >= target);
  return [pointAt(path, t).pos, ...path.slice(Math.max(i, 1))];
}
