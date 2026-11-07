export type PlanId = "cafe" | "dining" | "house" | "property" | "chain";

export type Plan = {
  id: PlanId;
  name: string;
  price: number;
  suffix: string;
  blurb: string;
  points: string[];
  tablesMax: number;
  cameras: number;
  audience: string;
  featured?: boolean;
  badge?: string;
};

export const GST_RATE = 0.18;

/**
 * Priced against Indian F&B P&L, not a USD conversion.
 * A waiter costs ₹18–28k/month. Software must sit below a headcount
 * for independents, and below one captain for a hotel property.
 * Value is extra covers + Zomato, not labour (labour is cheap here).
 *
 * Cafe   ≤12 tables  ·  ₹2,999  ·  2–3 extra cafe covers pays it
 * Dining ≤28 tables  ·  ₹6,999  ·  one Saturday 4-top at ₹3,400 covers a week
 * House  ≤60 tables  ·  ₹12,999 ·  brewpub / banquet+dining
 * Property hotel F&B ·  ₹24,999 ·  coffee shop + specialty + bar + banquet
 * Chain  3+ sites    ·  ₹9,999/outlet
 */
export const PLANS: Plan[] = [
  {
    id: "cafe",
    name: "Cafe",
    price: 2999,
    suffix: "/ month + GST",
    tablesMax: 12,
    cameras: 2,
    audience: "Cafes, bakeries, 20–40 covers",
    blurb: "Small rooms. Two cameras. The five-minute rule.",
    points: ["Up to 12 tables", "2 existing cameras", "Waiter + reset alerts", "Handheld for the floor"],
  },
  {
    id: "dining",
    name: "Dining",
    price: 6999,
    suffix: "/ month + GST",
    tablesMax: 28,
    cameras: 4,
    audience: "Independent restaurants, 50–100 covers",
    blurb: "The plan most Indian rooms should buy. Dinner rush, Zomato, linger vs neglect.",
    points: [
      "Up to 28 tables",
      "4 cameras",
      "Linger vs neglect",
      "Peak-hour waiter roster",
      "Friday–Sunday dinner coverage",
    ],
    featured: true,
    badge: "Independents",
  },
  {
    id: "house",
    name: "House",
    price: 12999,
    suffix: "/ month + GST",
    tablesMax: 60,
    cameras: 8,
    audience: "Brewpubs, large standalone, banquet + dining",
    blurb: "Big floors and mixed banquet. Owner Monday board in rupees.",
    points: ["Up to 60 tables", "8 cameras", "Banquet reset alerts", "Revenue board", "Owner Monday note"],
  },
  {
    id: "property",
    name: "Property",
    price: 24999,
    suffix: "/ property / month + GST",
    tablesMax: 120,
    cameras: 16,
    audience: "3–5 star hotels, palaces, resorts",
    blurb: "One hotel: coffee shop, specialty, bar, banquet. Sold to F&B, not IT.",
    points: [
      "Multi-outlet on one property",
      "16 cameras",
      "Steward + captain paging",
      "Night-audit friendly",
      "Breakfast / lunch / dinner dayparts",
    ],
    featured: true,
    badge: "Hotel F&B",
  },
  {
    id: "chain",
    name: "Chain",
    price: 9999,
    suffix: "/ outlet / month + GST",
    tablesMax: 60,
    cameras: 8,
    audience: "3+ restaurants or 3+ hotel properties",
    badge: "3+ sites",
    blurb: "Barbeque Nation–scale groups and hotel brands. One GST invoice.",
    points: ["Min 3 outlets", "Group GM rollup", "Shared playbooks", "GST e-invoice", "Volume on Property: ₹19,999 / hotel"],
  },
];

export function getPlan(id: string | null | undefined) {
  return PLANS.find((p) => p.id === id) ?? PLANS.find((p) => p.id === "dining")!;
}

export function recommendPlan(tables: number, kind: "restaurant" | "hotel" = "restaurant"): PlanId {
  if (kind === "hotel") return "property";
  if (tables <= 12) return "cafe";
  if (tables <= 28) return "dining";
  if (tables <= 60) return "house";
  return "property";
}

export function gstOf(price: number) {
  return Math.round(price * GST_RATE);
}

export function withGst(price: number) {
  return price + gstOf(price);
}

export const TEST_CARDS = [
  { number: "4242 4242 4242 4242", result: "Pay succeeds · Visa / Rupay test" },
  { number: "5555 5555 5555 4444", result: "Pay succeeds · Mastercard" },
  { number: "4000 0000 0000 0002", result: "Card declined" },
  { number: "4000 0000 0000 9995", result: "Insufficient funds" },
];
