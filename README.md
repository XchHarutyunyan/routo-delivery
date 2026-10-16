# Routo — delivery platform demo

A customer app, a courier app and a dispatcher control room sharing one live simulation of Yerevan: 6 restaurants, 8 couriers and real street routes from OpenStreetMap.

Built with **React 19, TypeScript, Vite, Leaflet (react-leaflet) and Zustand**. No backend — everything runs in the browser.

## What you can do

- **Customer app** — pick a restaurant, build a cart, place an order and track the courier on the map with a live ETA and status timeline.
- **Courier app** — you are Arman: accept the offer, pick up when the kitchen is ready, hand over at the door. If you wait, autopilot moves on after 7 seconds so tracking never stalls.
- **Dispatcher** — live map of every courier and route, active orders with statuses, courier states, KPIs (active orders, busy couriers, average delivery time, revenue) and a live feed.

## How it works

- `scripts/build-routes.mjs` generated `src/data/city.json` once: fictional restaurants, delivery addresses snapped to real streets, and ~140 street routes from the public OSRM server (throttled).
- `src/store/sim.ts` is the simulation engine (Zustand): kitchen timers, dispatching (same-restaurant couriers first, then the nearest by route time), courier phases and ETAs. The demo runs 15× faster than real time.
- Couriers are animated along the route geometry by distance (`src/lib/geo.ts`); map icons are cached to avoid re-creating markers every frame.
- Armenian street names are transliterated to Latin for the English UI.

## Run locally

```sh
npm install
npm run dev
```

Map data © OpenStreetMap contributors. Routes: OSRM. Restaurants, couriers and orders are fictional.

---

Made by [Khachik Harutyunyan](https://khharutyunyan.dev) — Senior Full-Stack Web & Mobile Developer.
