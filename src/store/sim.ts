import { create } from "zustand";
import { ADDRESSES, HUBS, addressById, addressLabel, addressesForHub, getRoute, hubById, type LatLng } from "../lib/city";
import { pointAt } from "../lib/geo";
import { DELIVERY_FEE, MENUS } from "../lib/menus";

/** The demo runs this many times faster than real life */
export const SPEED = 15;
const PREP_SEC = 300; // 5 min kitchen time
const ACCEPT_SEC = 120; // restaurant confirms within 2 min
/** A human courier who doesn't tap within this time is moved on automatically */
const AUTOPILOT_MS = 7000;

const toMs = (realSeconds: number) => (realSeconds * 1000) / SPEED;

export type CourierPhase = "idle" | "offered" | "toPickup" | "waiting" | "delivering" | "atCustomer" | "returning";
export type OrderStatus = "placed" | "preparing" | "ready" | "pickedUp" | "delivered";

export type Courier = {
  id: string;
  name: string;
  vehicle: "🛵" | "🚲" | "🚗";
  color: string;
  human: boolean;
  hubId: string;
  phase: CourierPhase;
  path: LatLng[] | null;
  startedAt: number;
  durationMs: number;
  phaseAt: number;
  orderId: string | null;
  delivered: number;
};

export type Order = {
  id: string;
  number: number;
  hubId: string;
  addressId: string;
  customer: string;
  items: { id: string; name: string; price: number; qty: number }[];
  total: number;
  mine: boolean;
  status: OrderStatus;
  createdAt: number;
  readyAt: number;
  courierId: string | null;
  pickedUpAt: number | null;
  deliveredAt: number | null;
  etaAt: number;
};

export type SimEvent = { id: string; at: number; text: string; kind: "order" | "courier" | "done" };

type State = {
  couriers: Courier[];
  orders: Order[];
  events: SimEvent[];
  nextNumber: number;
  placeOrder: (hubId: string, items: Order["items"], addressId: string, customer: string, mine: boolean) => Order;
  tick: (now: number) => void;
  courierAction: (courierId: string, action: "accept" | "pickup" | "deliver") => void;
  reset: () => void;
};

const COURIERS: Omit<Courier, "phase" | "path" | "startedAt" | "durationMs" | "phaseAt" | "orderId" | "delivered">[] = [
  { id: "c1", name: "Arman", vehicle: "🛵", color: "#f97316", human: true, hubId: "lavash" },
  { id: "c2", name: "Mane", vehicle: "🚲", color: "#22c55e", human: false, hubId: "dolma" },
  { id: "c3", name: "Gor", vehicle: "🛵", color: "#3b82f6", human: false, hubId: "pizza" },
  { id: "c4", name: "Lusine", vehicle: "🚗", color: "#a855f7", human: false, hubId: "bowl" },
  { id: "c5", name: "Tigran", vehicle: "🛵", color: "#ef4444", human: false, hubId: "sushi" },
  { id: "c6", name: "Ani", vehicle: "🚲", color: "#14b8a6", human: false, hubId: "burger" },
  { id: "c7", name: "Davit", vehicle: "🛵", color: "#eab308", human: false, hubId: "lavash" },
  { id: "c8", name: "Nare", vehicle: "🚗", color: "#ec4899", human: false, hubId: "pizza" },
];

const CUSTOMERS = ["Lilit", "Aram", "Narek", "Sona", "Hayk", "Elen", "Karen", "Mariam", "Vahe", "Anahit", "Levon", "Diana"];

const freshCouriers = (): Courier[] =>
  COURIERS.map((c) => ({ ...c, phase: "idle", path: null, startedAt: 0, durationMs: 0, phaseAt: 0, orderId: null, delivered: 0 }));

let eventId = 0;
const ev = (text: string, kind: SimEvent["kind"], at = Date.now()): SimEvent => ({ id: `e${++eventId}`, at, text, kind });

/** Where a courier is right now (moving along a street route or parked) */
export function courierPosition(c: Courier, now: number): { pos: LatLng; heading: number; progress: number } {
  if (c.path && c.durationMs > 0) {
    const progress = Math.min(1, (now - c.startedAt) / c.durationMs);
    return { ...pointAt(c.path, progress), progress };
  }
  const hub = hubById(c.hubId);
  return { pos: [hub.lat, hub.lng], heading: 0, progress: 0 };
}

const move = (c: Courier, path: LatLng[], durationSec: number, now: number): Courier => ({
  ...c,
  path,
  startedAt: now,
  durationMs: toMs(durationSec),
});

export const useSim = create<State>((set, get) => ({
  couriers: freshCouriers(),
  orders: [],
  events: [],
  nextNumber: 1042,

  placeOrder(hubId, items, addressId, customer, mine) {
    const now = Date.now();
    const total = items.reduce((s, i) => s + i.price * i.qty, 0) + DELIVERY_FEE;
    const route = getRoute(hubId, addressId);
    const order: Order = {
      id: `o${now.toString(36)}${Math.random().toString(36).slice(2, 5)}`,
      number: get().nextNumber,
      hubId,
      addressId,
      customer,
      items,
      total,
      mine,
      status: "placed",
      createdAt: now,
      readyAt: now + toMs(ACCEPT_SEC + PREP_SEC),
      courierId: null,
      pickedUpAt: null,
      deliveredAt: null,
      etaAt: now + toMs(ACCEPT_SEC + PREP_SEC + (route?.duration ?? 600)),
    };
    set((s) => ({
      orders: [order, ...s.orders].slice(0, 60),
      nextNumber: s.nextNumber + 1,
      events: [ev(`#${order.number} ${customer} ordered from ${hubById(hubId).name}`, "order", now), ...s.events].slice(0, 40),
    }));
    return order;
  },

  courierAction(courierId, action) {
    const now = Date.now();
    set((s) => {
      const c = s.couriers.find((x) => x.id === courierId);
      if (!c || !c.orderId) return s;
      const order = s.orders.find((o) => o.id === c.orderId)!;
      return applyAction(s, c, order, action, now);
    });
  },

  tick(now) {
    set((s) => {
      let { couriers, orders, events } = s;
      const newEvents: SimEvent[] = [];
      const updOrder = (id: string, patch: Partial<Order>) => (orders = orders.map((o) => (o.id === id ? { ...o, ...patch } : o)));
      const updCourier = (id: string, patch: Partial<Courier>) => (couriers = couriers.map((c) => (c.id === id ? { ...c, ...patch } : c)));

      // 1. Kitchen: placed → preparing → ready
      for (const o of orders) {
        if (o.status === "placed" && now >= o.createdAt + toMs(ACCEPT_SEC)) {
          updOrder(o.id, { status: "preparing" });
          newEvents.push(ev(`${hubById(o.hubId).name} is preparing #${o.number}`, "order", now));
        } else if (o.status === "preparing" && now >= o.readyAt) {
          updOrder(o.id, { status: "ready" });
        }
      }

      // 2. Couriers arriving at the end of their route
      for (const c of couriers) {
        if (!c.path || now < c.startedAt + c.durationMs || c.phase === "atCustomer") continue;
        const order = orders.find((o) => o.id === c.orderId);
        if (c.phase === "toPickup" && order) {
          updCourier(c.id, { phase: "waiting", path: null, hubId: order.hubId, phaseAt: now });
        } else if (c.phase === "delivering" && order) {
          if (c.human) {
            // keep the finished path: its last point is the customer's door
            updCourier(c.id, { phase: "atCustomer", phaseAt: now });
          } else {
            const next = finishDelivery({ couriers, orders }, c, order, now);
            couriers = next.couriers;
            orders = next.orders;
            newEvents.push(...next.events);
          }
        } else if (c.phase === "returning") {
          updCourier(c.id, { phase: "idle", path: null, orderId: null, phaseAt: now });
        }
      }

      // 3. Pick-ups when the food is ready (and autopilot for the human courier)
      for (const c of couriers) {
        const order = orders.find((o) => o.id === c.orderId);
        if (!order) continue;
        // While waiting at the restaurant the countdown starts when the food is ready
        const since = c.phase === "waiting" ? Math.max(c.phaseAt, order.readyAt) : c.phaseAt;
        const late = now - since > AUTOPILOT_MS;
        if (c.phase === "waiting" && order.status === "ready" && (!c.human || late)) {
          const next = applyAction({ couriers, orders, events: [] }, c, order, "pickup", now);
          couriers = next.couriers;
          orders = next.orders;
          newEvents.push(...next.events);
        } else if (c.human && late && (c.phase === "offered" || c.phase === "atCustomer")) {
          const next = applyAction({ couriers, orders, events: [] }, c, order, c.phase === "offered" ? "accept" : "deliver", now);
          couriers = next.couriers;
          orders = next.orders;
          newEvents.push(...next.events);
        }
      }

      // 4. Dispatch: give unassigned orders to the best idle courier
      for (const o of [...orders].reverse()) {
        if (o.courierId || o.status === "delivered") continue;
        const idle = couriers.filter((c) => c.phase === "idle");
        if (!idle.length) break;
        const human = idle.find((c) => c.human);
        const pick =
          (o.mine && human) ||
          idle.find((c) => c.hubId === o.hubId && !c.human) ||
          idle.find((c) => c.hubId === o.hubId) ||
          idle.filter((c) => getRoute(c.hubId, o.hubId)).sort((a, b) => getRoute(a.hubId, o.hubId)!.duration - getRoute(b.hubId, o.hubId)!.duration)[0];
        if (!pick) continue;
        updOrder(o.id, { courierId: pick.id });
        if (pick.human) {
          updCourier(pick.id, { phase: "offered", orderId: o.id, phaseAt: now });
          newEvents.push(ev(`#${o.number} offered to ${pick.name}`, "courier", now));
        } else {
          const next = startPickup({ couriers, orders }, pick, o, now);
          couriers = next.couriers;
          orders = next.orders;
          newEvents.push(ev(`${pick.name} ${pick.vehicle} assigned to #${o.number}`, "courier", now));
        }
      }

      if (couriers === s.couriers && orders === s.orders && !newEvents.length) return s;
      events = [...newEvents.reverse(), ...events].slice(0, 40);
      return { couriers, orders, events };
    });
  },

  reset() {
    set({ couriers: freshCouriers(), orders: [], events: [] });
  },
}));

type Slice = { couriers: Courier[]; orders: Order[] };

function startPickup(s: Slice, c: Courier, o: Order, now: number): Slice {
  const route = getRoute(c.hubId, o.hubId);
  const arriveAt = now + (route ? toMs(route.duration) : 0);
  const delivery = getRoute(o.hubId, o.addressId);
  const etaAt = Math.max(arriveAt, o.readyAt) + toMs(delivery?.duration ?? 600);
  const courier: Courier = route
    ? { ...move(c, route.path, route.duration, now), phase: "toPickup", orderId: o.id, phaseAt: now }
    : { ...c, phase: "waiting", path: null, orderId: o.id, phaseAt: now };
  return {
    couriers: s.couriers.map((x) => (x.id === c.id ? courier : x)),
    orders: s.orders.map((x) => (x.id === o.id ? { ...x, courierId: c.id, etaAt } : x)),
  };
}

function finishDelivery(s: Slice, c: Courier, o: Order, now: number): Slice & { events: SimEvent[] } {
  const back = getRoute(o.addressId, o.hubId);
  const mins = Math.round(((now - o.createdAt) * SPEED) / 60000);
  return {
    couriers: s.couriers.map((x) =>
      x.id === c.id
        ? back
          ? { ...move(x, back.path, back.duration, now), phase: "returning", hubId: o.hubId, delivered: x.delivered + 1, phaseAt: now }
          : { ...x, phase: "idle", path: null, orderId: null, delivered: x.delivered + 1, phaseAt: now }
        : x
    ),
    orders: s.orders.map((x) => (x.id === o.id ? { ...x, status: "delivered", deliveredAt: now } : x)),
    events: [ev(`#${o.number} delivered to ${addressLabel(addressById(o.addressId))} in ${mins} min`, "done", now)],
  };
}

function applyAction(s: Pick<State, "couriers" | "orders" | "events">, c: Courier, o: Order, action: "accept" | "pickup" | "deliver", now: number) {
  if (action === "accept" && c.phase === "offered") {
    const next = startPickup(s, c, o, now);
    return { ...next, events: [ev(`${c.name} ${c.vehicle} accepted #${o.number}`, "courier", now), ...s.events] };
  }
  if (action === "pickup" && c.phase === "waiting" && o.status === "ready") {
    const route = getRoute(o.hubId, o.addressId);
    if (!route) return s;
    return {
      couriers: s.couriers.map((x) => (x.id === c.id ? { ...move(x, route.path, route.duration, now), phase: "delivering" as const, phaseAt: now } : x)),
      orders: s.orders.map((x) => (x.id === o.id ? { ...x, status: "pickedUp" as const, pickedUpAt: now, etaAt: now + toMs(route.duration) } : x)),
      events: [ev(`${c.name} picked up #${o.number}`, "courier", now), ...s.events],
    };
  }
  if (action === "deliver" && c.phase === "atCustomer") {
    const next = finishDelivery(s, c, o, now);
    return { couriers: next.couriers, orders: next.orders, events: [...next.events, ...s.events] };
  }
  return s;
}

/** Background demand so the map is alive even before the visitor orders */
export function randomOrder() {
  const hub = HUBS[Math.floor(Math.random() * HUBS.length)];
  const addresses = addressesForHub(hub.id);
  const address = addresses[Math.floor(Math.random() * addresses.length)] ?? ADDRESSES[0];
  const menu = MENUS[hub.id];
  const items = [...menu]
    .sort(() => Math.random() - 0.5)
    .slice(0, 1 + Math.floor(Math.random() * 3))
    .map((m) => ({ ...m, qty: 1 + Math.floor(Math.random() * 2) }));
  useSim.getState().placeOrder(hub.id, items, address.id, CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)], false);
}
