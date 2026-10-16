import { addressById, addressLabel, hubById } from "../lib/city";
import { fmtAmd } from "../lib/menus";
import { etaLabel } from "../lib/format";
import { useNow } from "../hooks/useNow";
import { useSim } from "../store/sim";
import { CityMap } from "./CityMap";

const COURIER_ID = "c1";
const PAY_PER_DELIVERY = 900;

/** Courier app for "Arman": accept offers, pick up and deliver (autopilot kicks in if you wait) */
export function CourierApp() {
  const courier = useSim((s) => s.couriers.find((c) => c.id === COURIER_ID)!);
  const order = useSim((s) => s.orders.find((o) => o.id === courier.orderId));
  const action = useSim((s) => s.courierAction);
  const now = useNow(500);
  const since = courier.phase === "waiting" && order ? Math.max(courier.phaseAt, order.readyAt) : courier.phaseAt;
  const autoIn = Math.max(0, 7 - Math.floor((now - since) / 1000));

  const hub = order ? hubById(order.hubId) : null;
  const address = order ? addressById(order.addressId) : null;

  return (
    <div className="app courier">
      <header className="courier-head">
        <span className="avatar" style={{ background: courier.color }}>{courier.vehicle}</span>
        <span>
          <b>{courier.name}</b>
          <small>{courier.phase === "idle" || courier.phase === "returning" ? "Online · waiting for orders" : "On a delivery"}</small>
        </span>
        <span className="earn">
          <b>{fmtAmd(courier.delivered * PAY_PER_DELIVERY)}</b>
          <small>{courier.delivered} today</small>
        </span>
      </header>

      <div className="map-box">
        <CityMap courierId={COURIER_ID} dark />
      </div>

      <div className="sheet">
        {courier.phase === "offered" && order && hub && address && (
          <div className="offer">
            <p className="tag hot">New order</p>
            <p className="big">{hub.emoji} {hub.name}</p>
            <p className="muted">→ {addressLabel(address)}</p>
            <p className="small">#{order.number} · {order.items.reduce((s, i) => s + i.qty, 0)} items · {fmtAmd(PAY_PER_DELIVERY)}</p>
            <button className="cta" onClick={() => action(COURIER_ID, "accept")}>Accept ({autoIn}s)</button>
          </div>
        )}
        {courier.phase === "toPickup" && hub && (
          <>
            <p className="muted small">Pick up at</p>
            <p className="big">{hub.emoji} {hub.name}</p>
            <p className="muted">Follow the route on the map</p>
          </>
        )}
        {courier.phase === "waiting" && order && hub && (
          <>
            <p className="muted small">At {hub.name}</p>
            <p className="big">{order.status === "ready" ? "Order is ready" : "Kitchen is still cooking…"}</p>
            <button className="cta" disabled={order.status !== "ready"} onClick={() => action(COURIER_ID, "pickup")}>
              {order.status === "ready" ? `Picked up (${autoIn}s)` : "Waiting for the kitchen"}
            </button>
          </>
        )}
        {courier.phase === "delivering" && order && address && (
          <>
            <p className="muted small">Deliver to {order.customer}</p>
            <p className="big">{addressLabel(address)}</p>
            <p className="muted">Arrive in {etaLabel(order.etaAt, now)}</p>
          </>
        )}
        {courier.phase === "atCustomer" && order && address && (
          <>
            <p className="muted small">At {addressLabel(address)}</p>
            <p className="big">Hand over to {order.customer}</p>
            <button className="cta" onClick={() => action(COURIER_ID, "deliver")}>Delivered ({autoIn}s)</button>
          </>
        )}
        {(courier.phase === "idle" || courier.phase === "returning") && (
          <>
            <p className="big">You&apos;re online</p>
            <p className="muted">New orders will appear here. Place an order in the customer app — it comes to you first.</p>
          </>
        )}
      </div>
    </div>
  );
}
