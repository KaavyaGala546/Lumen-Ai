export type Zone = "main" | "bar" | "booth" | "patio";

export type TableState =
  | "ready"
  | "seated"
  | "awaiting"
  | "dining"
  | "check"
  | "lingering"
  | "dirty"
  | "bussing";

export type AlertKind =
  | "unattended"
  | "dirty"
  | "ready_to_seat"
  | "walk_risk"
  | "held";

export type Severity = "crit" | "warn" | "info";

export type TableShape = "round" | "rect" | "booth" | "bar";

export type Table = {
  id: string;
  label: string;
  zone: Zone;
  seats: 2 | 4 | 6;
  x: number;
  y: number;
  w: number;
  h: number;
  shape: TableShape;
  state: TableState;
  partySize: number;
  seatedAt: number | null;
  lastServerVisit: number | null;
  dirtySince: number | null;
  plates: boolean;
  glasses: boolean;
  checkDown: boolean;
  confidence: number;
  server: string | null;
  camera: string;
  course: string;
};

export type Alert = {
  id: string;
  tableId: string;
  kind: AlertKind;
  severity: Severity;
  title: string;
  body: string;
  at: number;
  assignedTo: string | null;
  held: boolean;
};

export type Camera = {
  id: string;
  name: string;
  model: string;
  covering: string;
  status: "live" | "degraded";
  fps: number;
  tables: string[];
};

export type StaffMember = {
  id: string;
  name: string;
  role: "server" | "busser" | "host" | "gm";
  section: string;
  onFloor: boolean;
};

export type Toast = {
  id: string;
  title: string;
  body: string;
};

export type HourPoint = {
  hour: string;
  covers: number;
  wait: number;
  staff: number;
  recommended: number;
};
