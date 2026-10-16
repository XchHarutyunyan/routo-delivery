import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import { HUBS, addressById, getRoute, hubById, type LatLng } from "../lib/city";
import { remainingPath } from "../lib/geo";
import { useNow } from "../hooks/useNow";
import { courierPosition, useSim, type Courier } from "../store/sim";

// Icons are cached: recreating them on every animation frame makes Leaflet re-render markers
const icons = new Map<string, L.DivIcon>();
const cached = (key: string, make: () => L.DivIcon) => {
  if (!icons.has(key)) icons.set(key, make());
  return icons.get(key)!;
};
const hubIcon = (emoji: string) =>
  cached(`hub-${emoji}`, () => L.divIcon({ className: "", html: `<div class="pin-hub">${emoji}</div>`, iconSize: [34, 34], iconAnchor: [17, 17] }));
const homeIcon = (mine: boolean) =>
  cached(`home-${mine}`, () => L.divIcon({ className: "", html: `<div class="pin-home${mine ? " mine" : ""}">🏠</div>`, iconSize: [26, 26], iconAnchor: [13, 13] }));
const courierIcon = (c: Courier, highlight: boolean) =>
  cached(`c-${c.id}-${highlight}`, () =>
    L.divIcon({
      className: "",
      html: `<div class="pin-courier${highlight ? " hl" : ""}" style="--c:${c.color}">${c.vehicle}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    })
  );

const CENTER: LatLng = [40.1835, 44.5125];

function FitTo({ points }: { points: LatLng[] | null }) {
  const map = useMap();
  const key = points ? `${points[0]}-${points[points.length - 1]}` : "city";
  useEffect(() => {
    if (points && points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
    else map.setView(CENTER, 14);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

type Props = {
  /** Show only what matters for one order (customer view) */
  orderId?: string | null;
  /** Show only one courier (courier view) */
  courierId?: string;
  dark?: boolean;
};

/** Live map of Yerevan: restaurants, customers and couriers moving along real streets */
export function CityMap({ orderId, courierId, dark }: Props) {
  const now = useNow(200);
  const couriers = useSim((s) => s.couriers);
  const orders = useSim((s) => s.orders);

  const focusOrder = orders.find((o) => o.id === (orderId ?? couriers.find((c) => c.id === courierId)?.orderId));
  const visibleCouriers = couriers.filter((c) =>
    courierId ? c.id === courierId : orderId ? c.id === focusOrder?.courierId : true
  );
  const activeOrders = orders.filter((o) => o.status !== "delivered" && (!focusOrder || o.id === focusOrder.id));

  const fitPoints = useMemo(() => {
    if (!focusOrder) return null;
    const route = getRoute(focusOrder.hubId, focusOrder.addressId);
    return route?.path ?? null;
  }, [focusOrder]);


  return (
    <MapContainer center={CENTER} zoom={14} className={`map${dark ? " dark-tiles" : ""}`} zoomControl={!courierId && !orderId} attributionControl>
      {/* Standard OpenStreetMap tiles; the dark look is a CSS filter on the tile layer only */}
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
      <FitTo points={fitPoints} />

      {/* Planned delivery routes */}
      {activeOrders.map((o) => {
        const route = getRoute(o.hubId, o.addressId);
        const c = couriers.find((x) => x.id === o.courierId);
        if (!route) return null;
        const delivering = c?.phase === "delivering" && c.orderId === o.id;
        const path = delivering ? remainingPath(route.path, courierPosition(c!, now).progress) : route.path;
        return <Polyline key={o.id} positions={path} pathOptions={{ color: c?.color ?? "#94a3b8", weight: delivering ? 5 : 3, opacity: delivering ? 0.9 : 0.35, dashArray: delivering ? undefined : "6 8" }} />;
      })}

      {/* Couriers heading to the restaurant */}
      {visibleCouriers
        .filter((c) => c.phase === "toPickup" && c.path)
        .map((c) => (
          <Polyline key={`p-${c.id}`} positions={remainingPath(c.path!, courierPosition(c, now).progress)} pathOptions={{ color: c.color, weight: 3, opacity: 0.6, dashArray: "2 6" }} />
        ))}

      {(focusOrder ? [hubById(focusOrder.hubId)] : HUBS).map((h) => (
        <Marker key={h.id} position={[h.lat, h.lng]} icon={hubIcon(h.emoji)}>
          <Tooltip direction="top" offset={[0, -14]}>{h.name}</Tooltip>
        </Marker>
      ))}

      {activeOrders.map((o) => {
        const a = addressById(o.addressId);
        return (
          <Marker key={`a-${o.id}`} position={[a.lat, a.lng]} icon={homeIcon(o.mine)}>
            <Tooltip direction="top" offset={[0, -10]}>
              #{o.number} · {o.customer}
            </Tooltip>
          </Marker>
        );
      })}

      {visibleCouriers.map((c) => (
        <Marker key={c.id} position={courierPosition(c, now).pos} icon={courierIcon(c, Boolean(courierId || orderId))} zIndexOffset={1000}>
          <Tooltip direction="top" offset={[0, -14]}>
            {c.name} · {c.phase}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
