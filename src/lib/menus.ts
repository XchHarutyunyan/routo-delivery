export type MenuItem = { id: string; name: string; price: number };

/** Prices in Armenian dram (AMD) */
export const MENUS: Record<string, MenuItem[]> = {
  lavash: [
    { id: "l1", name: "Pork khorovats wrap", price: 2400 },
    { id: "l2", name: "Chicken shawarma", price: 1900 },
    { id: "l3", name: "Lahmajo (3 pcs)", price: 1500 },
    { id: "l4", name: "Tan, 0.5 l", price: 600 },
  ],
  dolma: [
    { id: "d1", name: "Grape-leaf dolma", price: 2800 },
    { id: "d2", name: "Khashlama", price: 3600 },
    { id: "d3", name: "Spas soup", price: 1400 },
    { id: "d4", name: "Gata", price: 900 },
  ],
  pizza: [
    { id: "p1", name: "Margherita 30 cm", price: 3200 },
    { id: "p2", name: "Pepperoni 30 cm", price: 3900 },
    { id: "p3", name: "Four cheese 30 cm", price: 4200 },
    { id: "p4", name: "Lemonade", price: 800 },
  ],
  bowl: [
    { id: "b1", name: "Salmon poke bowl", price: 4300 },
    { id: "b2", name: "Falafel bowl", price: 3100 },
    { id: "b3", name: "Greek salad", price: 2500 },
    { id: "b4", name: "Fresh juice", price: 1200 },
  ],
  sushi: [
    { id: "s1", name: "Philadelphia roll", price: 4500 },
    { id: "s2", name: "California roll", price: 3800 },
    { id: "s3", name: "Miso soup", price: 1300 },
    { id: "s4", name: "Edamame", price: 1400 },
  ],
  burger: [
    { id: "g1", name: "Classic cheeseburger", price: 2900 },
    { id: "g2", name: "Double smash burger", price: 3800 },
    { id: "g3", name: "Fries", price: 1100 },
    { id: "g4", name: "Milkshake", price: 1500 },
  ],
};

export const DELIVERY_FEE = 500;
export const fmtAmd = (n: number) => `${n.toLocaleString("en-US")} AMD`;
