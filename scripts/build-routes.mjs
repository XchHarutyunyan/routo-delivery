/**
 * One-off generator for src/data/city.json: fictional restaurants and
 * delivery addresses in central Yerevan, with real street routes from the
 * public OSRM demo server (requests are throttled to ~1 per second).
 *
 *   node scripts/build-routes.mjs
 */
import { writeFileSync } from "node:fs";

const OSRM = "https://router.project-osrm.org/route/v1/driving";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const HUBS = [
  { id: "lavash", name: "Lavash & Co", cuisine: "Armenian", emoji: "🥙", lat: 40.1792, lng: 44.5133 },
  { id: "dolma", name: "Dolma House", cuisine: "Home cooking", emoji: "🍲", lat: 40.1866, lng: 44.5146 },
  { id: "pizza", name: "Pizza Ararat", cuisine: "Pizza", emoji: "🍕", lat: 40.183, lng: 44.504 },
  { id: "bowl", name: "Green Bowl", cuisine: "Healthy", emoji: "🥗", lat: 40.1925, lng: 44.5045 },
  { id: "sushi", name: "Sushi Masis", cuisine: "Japanese", emoji: "🍣", lat: 40.1745, lng: 44.523 },
  { id: "burger", name: "Burger Lab", cuisine: "Burgers", emoji: "🍔", lat: 40.196, lng: 44.5205 },
];

// Deterministic pseudo-random points in central Yerevan
let seed = 11;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const POINTS = Array.from({ length: 36 }, () => ({ lat: 40.168 + rand() * 0.034, lng: 44.488 + rand() * 0.05 }));

const dist = (a, b) => Math.hypot(a.lat - b.lat, (a.lng - b.lng) * 0.77);
const round = (n) => Math.round(n * 1e5) / 1e5;

async function route(a, b) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${OSRM}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`);
    if (res.ok) {
      const data = await res.json();
      const r = data.routes[0];
      await sleep(1100);
      return {
        distance: Math.round(r.distance),
        duration: Math.round(r.duration),
        // [lat, lng] pairs for Leaflet
        path: r.geometry.coordinates.map(([lng, lat]) => [round(lat), round(lng)]),
        start: data.waypoints[0],
        end: data.waypoints[1],
      };
    }
    await sleep(3000);
  }
  throw new Error(`OSRM failed for ${JSON.stringify([a, b])}`);
}

const addresses = [];
const routes = {};

for (const [i, p] of POINTS.entries()) {
  const near = [...HUBS].sort((x, y) => dist(x, p) - dist(y, p)).slice(0, 3);
  const id = `a${i + 1}`;
  for (const hub of near) {
    const r = await route(hub, p);
    if (!addresses.find((a) => a.id === id)) {
      const [lng, lat] = r.end.location;
      addresses.push({ id, street: r.end.name || "Yerevan", house: 1 + Math.floor(rand() * 60), lat: round(lat), lng: round(lng), hubs: near.map((h) => h.id) });
    }
    routes[`${hub.id}>${id}`] = { distance: r.distance, duration: r.duration, path: r.path };
    process.stdout.write(".");
  }
}

for (const a of HUBS) {
  for (const b of HUBS) {
    if (a.id === b.id) continue;
    const r = await route(a, b);
    routes[`${a.id}>${b.id}`] = { distance: r.distance, duration: r.duration, path: r.path };
    process.stdout.write("+");
  }
}

writeFileSync(new URL("../src/data/city.json", import.meta.url), JSON.stringify({ hubs: HUBS, addresses, routes }));
console.log(`\n${addresses.length} addresses, ${Object.keys(routes).length} routes`);
