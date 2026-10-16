import { useState } from "react";
import { HUBS, addressById, addressLabel, hubById, randomAddressFor } from "../lib/city";
import { DELIVERY_FEE, MENUS, fmtAmd } from "../lib/menus";
import { etaLabel } from "../lib/format";
import { useNow } from "../hooks/useNow";
import { useSim, type Order } from "../store/sim";
import { CityMap } from "./CityMap";

type Cart = Record<string, number>;

const STEPS: { key: Order["status"] | "assigned"; label: string }[] = [
  { key: "placed", label: "Order placed" },
  { key: "preparing", label: "Restaurant is cooking" },
  { key: "assigned", label: "Courier assigned" },
  { key: "pickedUp", label: "On the way to you" },
  { key: "delivered", label: "Delivered" },
];

/** Customer app: pick a restaurant, build a cart, order and track the courier live */
export function CustomerApp() {
  const [hubId, setHubId] = useState<string | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const [orderId, setOrderId] = useState<string | null>(null);
  const placeOrder = useSim((s) => s.placeOrder);
  const order = useSim((s) => s.orders.find((o) => o.id === orderId));
  const courier = useSim((s) => s.couriers.find((c) => c.id === order?.courierId));
  const now = useNow(500);

  const [addressId, setAddressId] = useState<string | null>(null);
  const address = addressId ? addressById(addressId) : null;

  const openHub = (id: string) => {
    setAddressId(randomAddressFor(id).id);
    setHubId(id);
  };

  const menu = hubId ? MENUS[hubId] : [];
  const items = menu.filter((m) => cart[m.id]).map((m) => ({ ...m, qty: cart[m.id] }));
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const add = (id: string, d: number) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + d) }));

  // Tracking screen
  if (order) {
    const hub = hubById(order.hubId);
    const reached = (key: (typeof STEPS)[number]["key"]) => {
      const order_ = ["placed", "preparing", "ready", "pickedUp", "delivered"];
      if (key === "assigned") return Boolean(order.courierId) && courier?.phase !== "offered";
      if (key === "preparing") return order_.indexOf(order.status) >= 1;
      return order_.indexOf(order.status) >= order_.indexOf(key);
    };
    return (
      <div className="app customer">
        <div className="map-box tall">
          <CityMap orderId={order.id} />
        </div>
        <div className="sheet">
          {order.status === "delivered" ? (
            <>
              <p className="big">🎉 Enjoy your meal!</p>
              <p className="muted">Delivered by {courier?.name}. Rate the order to help us improve.</p>
              <button className="cta" onClick={() => { setOrderId(null); setHubId(null); setCart({}); }}>Order again</button>
            </>
          ) : (
            <>
              <p className="muted small">Order #{order.number} · {hub.name}</p>
              <p className="big">Arriving in {etaLabel(order.etaAt, now)}</p>
              {courier && courier.phase !== "offered" && (
                <div className="courier-card">
                  <span className="avatar" style={{ background: courier.color }}>{courier.vehicle}</span>
                  <span>
                    <b>{courier.name}</b> is your courier
                    <small>{courier.phase === "toPickup" ? "Heading to the restaurant" : courier.phase === "waiting" ? "Waiting for your food" : courier.phase === "delivering" ? "On the way to you" : "At your door"}</small>
                  </span>
                </div>
              )}
              <ol className="timeline">
                {STEPS.map((s) => (
                  <li key={s.key} className={reached(s.key) ? "done" : ""}>{s.label}</li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>
    );
  }

  // Restaurant list
  if (!hubId) {
    return (
      <div className="app customer scroll">
        <header className="app-head">
          <p className="muted small">Deliver to · Yerevan</p>
          <h2>What would you like?</h2>
        </header>
        <ul className="list">
          {HUBS.map((h) => (
            <li key={h.id}>
              <button className="row" onClick={() => openHub(h.id)}>
                <span className="emoji">{h.emoji}</span>
                <span>
                  <b>{h.name}</b>
                  <small>{h.cuisine} · 20–35 min</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Menu + checkout
  const hub = hubById(hubId);
  return (
    <div className="app customer scroll">
      <header className="app-head">
        <button className="back" onClick={() => { setHubId(null); setCart({}); }}>‹ Back</button>
        <h2>{hub.emoji} {hub.name}</h2>
        <p className="muted small">{hub.cuisine}</p>
      </header>
      <ul className="list">
        {menu.map((m) => (
          <li key={m.id} className="menu-row">
            <span>
              <b>{m.name}</b>
              <small>{fmtAmd(m.price)}</small>
            </span>
            <span className="qty">
              {cart[m.id] ? (
                <>
                  <button onClick={() => add(m.id, -1)} aria-label={`Remove ${m.name}`}>−</button>
                  <b>{cart[m.id]}</b>
                </>
              ) : null}
              <button onClick={() => add(m.id, 1)} aria-label={`Add ${m.name}`}>+</button>
            </span>
          </li>
        ))}
      </ul>
      {items.length > 0 && address && (
        <div className="checkout">
          <p className="small muted">Deliver to {addressLabel(address)} <span className="tag">demo address</span></p>
          <p className="small">Items {fmtAmd(subtotal)} · Delivery {fmtAmd(DELIVERY_FEE)}</p>
          <button
            className="cta"
            onClick={() => setOrderId(placeOrder(hubId, items, address.id, "You", true).id)}
          >
            Place order · {fmtAmd(subtotal + DELIVERY_FEE)}
          </button>
        </div>
      )}
    </div>
  );
}

