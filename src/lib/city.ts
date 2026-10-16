import city from "../data/city.json";

export type LatLng = [number, number];
export type Hub = { id: string; name: string; cuisine: string; emoji: string; lat: number; lng: number };
export type Address = { id: string; street: string; house: number; lat: number; lng: number; hubs: string[] };
export type Route = { distance: number; duration: number; path: LatLng[] };

export const HUBS = city.hubs as Hub[];
export const ADDRESSES = city.addresses as Address[];
const ROUTES = city.routes as unknown as Record<string, Route>;

export const hubById = (id: string) => HUBS.find((h) => h.id === id)!;
export const addressById = (id: string) => ADDRESSES.find((a) => a.id === id)!;
const ARM: Record<string, string> = {
  ա: "a", բ: "b", գ: "g", դ: "d", ե: "e", զ: "z", է: "e", ը: "y", թ: "t", ժ: "zh", ի: "i", լ: "l", խ: "kh", ծ: "ts",
  կ: "k", հ: "h", ձ: "dz", ղ: "gh", ճ: "ch", մ: "m", յ: "y", ն: "n", շ: "sh", ո: "o", չ: "ch", պ: "p", ջ: "j", ռ: "r",
  ս: "s", վ: "v", տ: "t", ր: "r", ց: "ts", ւ: "v", փ: "p", ք: "k", և: "ev", օ: "o", ֆ: "f",
};
const SUFFIX: [RegExp, string][] = [
  [/\s*փողոց$/u, " St"],
  [/\s*պողոտա$/u, " Ave"],
  [/\s*հրապարակ$/u, " Sq"],
  [/\s*նրբանցք$/u, " Ln"],
  [/\s*խճուղի$/u, " Hwy"],
];

/** Armenian street names → readable Latin ("Մոսկովյան փողոց" → "Moskovyan St") */
export function latinStreet(name: string) {
  let suffix = "";
  for (const [re, s] of SUFFIX) {
    if (re.test(name)) {
      name = name.replace(re, "");
      suffix = s;
      break;
    }
  }
  const words = name.split(/\s+/).map((word) => {
    const lower = word.toLowerCase();
    let out = "";
    for (let i = 0; i < lower.length; i++) {
      const ch = lower[i];
      if (ch === "ո" && lower[i + 1] === "ւ") {
        out += "u";
        i++;
      } else if (i === 0 && ch === "ե") out += "ye";
      else if (i === 0 && ch === "ո") out += "vo";
      else out += ARM[ch] ?? ch;
    }
    return out.charAt(0).toUpperCase() + out.slice(1);
  });
  return words.join(" ") + suffix;
}

export const addressLabel = (a: Address) => (a.street === "Yerevan" ? `Kentron district, ${a.house}` : `${latinStreet(a.street)}, ${a.house}`);

/** Street route between two places (reversed automatically for the way back) */
export function getRoute(from: string, to: string): Route | null {
  if (from === to) return null;
  const direct = ROUTES[`${from}>${to}`];
  if (direct) return direct;
  const back = ROUTES[`${to}>${from}`];
  return back ? { ...back, path: [...back.path].reverse() } : null;
}

export const addressesForHub = (hubId: string) => ADDRESSES.filter((a) => a.hubs.includes(hubId));

/** A random demo address inside the restaurant's delivery zone */
export const randomAddressFor = (hubId: string) => {
  const list = addressesForHub(hubId);
  return list[Math.floor(Math.random() * list.length)];
};
