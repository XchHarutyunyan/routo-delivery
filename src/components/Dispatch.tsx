import { addressById, addressLabel, hubById } from "../lib/city";
import { fmtAmd } from "../lib/menus";
import { etaLabel, realMinutes } from "../lib/format";
import { useNow } from "../hooks/useNow";
import { SPEED, useSim, type Order } from "../store/sim";
import { CityMap } from "./CityMap";

const STATUS: Record<Order["status"], { label: string; cls: string }> = {
  placed: { label: "New", cls: "s-new" },
  preparing: { label: "Cooking", cls: "s-cook" },
  ready: { label: "Ready", cls: "s-ready" },
  pickedUp: { label: "On the way", cls: "s-way" },
  delivered: { label: "Delivered", cls: "s-done" },
};

const PHASE: Record<string, string> = {
  idle: "Idle",
  offered: "Offer sent",
  toPickup: "To restaurant",
  waiting: "At restaurant",
  delivering: "Delivering",
  atCustomer: "At customer",
  returning: "Returning",
};

/** Dispatcher control room: live map, KPIs, orders and couriers */
export function Dispatch({ compact }: { compact?: boolean }) {
  const now = useNow(500);
  const orders = useSim((s) => s.orders);
  const couriers = useSim((s) => s.couriers);
  const events = useSim((s) => s.events);
  const reset = useSim((s) => s.reset);

  const active = orders.filter((o) => o.status !== "delivered");
  const done = orders.filter((o) => o.status === "delivered" && o.deliveredAt);
  const avg = done.length ? Math.round(done.reduce((s, o) => s + realMinutes(o.deliveredAt! - o.createdAt), 0) / done.length) : null;
  const busy = couriers.filter((c) => c.phase !== "idle" && c.phase !== "returning").length;
  const revenue = done.reduce((s, o) => s + o.total, 0);

  return (
    <div className={`dispatch${compact ? " compact" : ""}`}>
      <div className="kpis">
        <Kpi label="Active orders" value={String(active.length)} />
        <Kpi label="Couriers busy" value={`${busy}/${couriers.length}`} />
        <Kpi label="Avg delivery" value={avg !== null ? `${avg} min` : "—"} />
        <Kpi label="Delivered" value={`${done.length} · ${fmtAmd(revenue)}`} />
      </div>

      <div className="dispatch-grid">
        <div className="map-box big">
          <CityMap dark />
          <span className="speed">Live · {SPEED}× speed</span>
        </div>

        <div className="side">
          <section className="panel">
            <h3>Orders</h3>
            <ul className="orders">
              {active.length === 0 && <li className="muted small">No active orders</li>}
              {active.map((o) => {
                const c = couriers.find((x) => x.id === o.courierId);
                return (
                  <li key={o.id} className={o.mine ? "mine" : ""}>
                    <span className={`status ${STATUS[o.status].cls}`}>{STATUS[o.status].label}</span>
                    <span className="o-main">
                      <b>#{o.number} {hubById(o.hubId).emoji} {hubById(o.hubId).name}</b>
                      <small>→ {addressLabel(addressById(o.addressId))}{o.mine ? " · your order" : ""}</small>
                    </span>
                    <span className="o-side">
                      {c ? <span className="dot" style={{ background: c.color }} title={c.name} /> : <small className="muted">waiting</small>}
                      <small>{etaLabel(o.etaAt, now)}</small>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {!compact && (
            <section className="panel">
              <h3>Couriers</h3>
              <ul className="couriers">
                {couriers.map((c) => (
                  <li key={c.id}>
                    <span className="dot" style={{ background: c.color }} />
                    <b>{c.vehicle} {c.name}{c.human ? " (you)" : ""}</b>
                    <small>{PHASE[c.phase]}</small>
                    <small className="muted">{c.delivered} done</small>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="panel feed">
            <h3>Live feed</h3>
            <ul>
              {events.slice(0, compact ? 5 : 8).map((e) => (
                <li key={e.id} className={`ev-${e.kind}`}>{e.text}</li>
              ))}
            </ul>
          </section>
          {!compact && (
            <button className="reset" onClick={reset}>Reset simulation</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="kpi">
      <small>{label}</small>
      <b>{value}</b>
    </div>
  );
}
