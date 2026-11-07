export type CamZone = {
  tableId: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export const LIVE_TABLE_IDS = ["1", "2", "3", "4", "5", "6"] as const;

export const DEFAULT_ZONES: CamZone[] = [
  { tableId: "1", x: 5, y: 10, w: 28, h: 38 },
  { tableId: "2", x: 36, y: 8, w: 28, h: 38 },
  { tableId: "3", x: 67, y: 10, w: 28, h: 38 },
  { tableId: "4", x: 5, y: 54, w: 28, h: 40 },
  { tableId: "5", x: 36, y: 54, w: 28, h: 40 },
  { tableId: "6", x: 67, y: 54, w: 28, h: 40 },
];

const STORAGE_KEY = "lumen-live-zones";

export function loadZones(): CamZone[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ZONES.map((z) => ({ ...z }));
    const parsed = JSON.parse(raw) as CamZone[];
    if (!Array.isArray(parsed) || parsed.length < 4) return DEFAULT_ZONES.map((z) => ({ ...z }));
    return parsed;
  } catch {
    return DEFAULT_ZONES.map((z) => ({ ...z }));
  }
}

export function saveZones(zones: CamZone[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(zones));
}

export function zonePx(zone: CamZone, width: number, height: number) {
  return {
    x: (zone.x / 100) * width,
    y: (zone.y / 100) * height,
    w: (zone.w / 100) * width,
    h: (zone.h / 100) * height,
  };
}

export function iou(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
) {
  const x2 = Math.max(ax, bx);
  const y2 = Math.max(ay, by);
  const x3 = Math.min(ax + aw, bx + bw);
  const y3 = Math.min(ay + ah, by + bh);
  const inter = Math.max(0, x3 - x2) * Math.max(0, y3 - y2);
  const union = aw * ah + bw * bh - inter;
  return union <= 0 ? 0 : inter / union;
}

export function pointInZone(px: number, py: number, z: { x: number; y: number; w: number; h: number }) {
  return px >= z.x && py >= z.y && px <= z.x + z.w && py <= z.y + z.h;
}
