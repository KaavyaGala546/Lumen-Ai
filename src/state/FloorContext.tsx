import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { INITIAL_TABLES } from "../data/hearth";
import type { Alert, Table, TableState, Toast } from "../types";

export type OccupancyMap = Record<string, { people: number; score: number }>;

type FloorContextValue = {
  tables: Table[];
  alerts: Alert[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  now: number;
  recoveredTonight: number;
  extraCovers: number;
  greetsSaved: number;
  toasts: Toast[];
  dismissToast: (id: string) => void;
  act: (tableId: string, action: Action) => void;
  liveMode: boolean;
  greetSeconds: number;
  setGreetSeconds: (n: number) => void;
  startLive: (tableIds: string[]) => void;
  stopLive: () => void;
  applyOccupancy: (occupancy: OccupancyMap) => void;
};

export type Action = "on_my_way" | "greeted" | "bus" | "ready" | "hold" | "seat";

const FloorContext = createContext<FloorContextValue | null>(null);

function secondsSince(ts: number | null, now: number) {
  if (!ts) return 0;
  return (now - ts) / 1000;
}

function buildAlerts(tables: Table[], now: number): Alert[] {
  const out: Alert[] = [];
  for (const t of tables) {
    const wait = secondsSince(t.seatedAt, now);
    if (t.state === "awaiting") {
      const walk = wait >= 8 * 60;
      out.push({
        id: `unattended-${t.id}`,
        tableId: t.id,
        kind: walk ? "walk_risk" : "unattended",
        severity: walk ? "crit" : "crit",
        title: walk ? `Walk risk · Table ${t.label}` : `No waiter · Table ${t.label}`,
        body: walk
          ? `${t.partySize} guests, ${Math.floor(wait / 60)}m with no visit. Last course and the Zomato review are slipping.`
          : `${t.partySize}-top seated ${Math.floor(wait / 60)}:${String(Math.floor(wait % 60)).padStart(2, "0")} with no waiter at the table. Menus and plates are not down.`,
        at: t.seatedAt ?? now,
        assignedTo: null,
        held: false,
      });
    }
    if (t.state === "dirty") {
      const dirtyFor = secondsSince(t.dirtySince, now);
      out.push({
        id: `dirty-${t.id}`,
        tableId: t.id,
        kind: "dirty",
        severity: dirtyFor > 5 * 60 ? "crit" : "warn",
        title: `Needs reset · Table ${t.label}`,
        body: `Guests gone. Plates still on. ${Math.floor(dirtyFor / 60)}m ${Math.floor(dirtyFor % 60)}s idle while the waitlist is live.`,
        at: t.dirtySince ?? now,
        assignedTo: null,
        held: false,
      });
    }
    if (t.state === "lingering") {
      out.push({
        id: `held-${t.id}`,
        tableId: t.id,
        kind: "held",
        severity: "info",
        title: `Held · Table ${t.label}`,
        body: "Check is down, plates are gone, motion is low. Lumen is not paging the floor — this is dessert, not neglect.",
        at: t.seatedAt ?? now,
        assignedTo: null,
        held: true,
      });
    }
    if (t.state === "ready" && t.zone !== "bar") {
      // host-facing, not a staff panic
    }
  }
  const rank = { crit: 0, warn: 1, info: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity] || a.at - b.at);
}

function maybeAdvance(t: Table, now: number, greetSec: number): Table {
  const wait = secondsSince(t.seatedAt, now);
  const dirtyFor = secondsSince(t.dirtySince, now);

  if (t.state === "seated" && wait >= greetSec && !t.lastServerVisit) {
    return { ...t, state: "awaiting", course: "No greet" };
  }
  if (t.state === "seated" && t.lastServerVisit && wait >= Math.max(8, greetSec * 0.6) && t.plates) {
    return { ...t, state: "dining", course: "Apps" };
  }
  if (
    t.state === "awaiting" &&
    t.lastServerVisit &&
    t.seatedAt &&
    t.lastServerVisit > t.seatedAt
  ) {
    return { ...t, state: "dining", plates: true, glasses: true, course: "In service" };
  }
  if (t.state === "dirty" && dirtyFor > 16 * 60) {
    return { ...t, state: "ready", plates: false, glasses: false, dirtySince: null, course: "—" };
  }
  return t;
}

export function FloorProvider({ children }: { children: ReactNode }) {
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);
  const [now, setNow] = useState(Date.now());
  const [selectedId, setSelectedId] = useState<string | null>("4");
  const [recoveredTonight, setRecoveredTonight] = useState(14800);
  const [extraCovers, setExtraCovers] = useState(3);
  const [greetsSaved, setGreetsSaved] = useState(4);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [liveMode, setLiveMode] = useState(false);
  const [greetSeconds, setGreetSeconds] = useState(5 * 60);
  const tick = useRef(0);
  const liveIds = useRef(new Set<string>());
  const liveModeRef = useRef(false);
  const greetRef = useRef(5 * 60);

  const pushToast = useCallback((title: string, body: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-3), { id, title, body }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
      tick.current += 1;
      const greet = greetRef.current;
      const live = liveIds.current;
      setTables((prev) => {
        let next = prev.map((t) => maybeAdvance(t, Date.now(), live.has(t.id) ? greet : 5 * 60));
        if (liveModeRef.current) return next;
        if (tick.current % 28 === 0) {
          const ready = next.filter((t) => t.state === "ready" && t.zone === "main" && !live.has(t.id));
          if (ready.length > 0) {
            const pick = ready[tick.current % ready.length];
            next = next.map((t) =>
              t.id === pick.id
                ? {
                    ...t,
                    state: "seated" as TableState,
                    partySize: t.seats === 2 ? 2 : 4,
                    seatedAt: Date.now(),
                    lastServerVisit: null,
                    plates: false,
                    glasses: true,
                    course: "Just sat",
                    server: t.zone === "booth" ? "Fatima Khan" : "Meera Iyer",
                  }
                : t,
            );
          }
        }
        if (tick.current % 41 === 0) {
          const dining = next.filter((t) => t.state === "dining" && t.seats <= 4 && !live.has(t.id));
          if (dining.length > 1) {
            const pick = dining[0];
            next = next.map((t) =>
              t.id === pick.id
                ? {
                    ...t,
                    state: "dirty" as TableState,
                    partySize: 0,
                    seatedAt: null,
                    dirtySince: Date.now(),
                    plates: true,
                    glasses: true,
                    course: "Vacated",
                  }
                : t,
            );
          }
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const startLive = useCallback((tableIds: string[]) => {
    liveIds.current = new Set(tableIds);
    liveModeRef.current = true;
    greetRef.current = 20;
    setGreetSeconds(20);
    setLiveMode(true);
    setTables((prev) =>
      prev.map((t) =>
        tableIds.includes(t.id)
          ? {
              ...t,
              state: "ready" as TableState,
              partySize: 0,
              seatedAt: null,
              lastServerVisit: null,
              dirtySince: null,
              plates: false,
              glasses: false,
              checkDown: false,
              course: "Watching",
              confidence: 0.4,
            }
          : t,
      ),
    );
  }, []);

  const stopLive = useCallback(() => {
    liveIds.current = new Set();
    liveModeRef.current = false;
    greetRef.current = 5 * 60;
    setGreetSeconds(5 * 60);
    setLiveMode(false);
  }, []);

  const applyOccupancy = useCallback((occupancy: OccupancyMap) => {
    const ids = liveIds.current;
    if (!ids.size) return;
    const ts = Date.now();
    setTables((prev) =>
      prev.map((t) => {
        if (!ids.has(t.id)) return t;
        const hit = occupancy[t.id] ?? { people: 0, score: 0 };
        const occupied = hit.people > 0;
        if (occupied) {
          if (t.state === "ready" || t.state === "dirty" || t.state === "bussing") {
            return {
              ...t,
              state: "seated",
              partySize: hit.people,
              seatedAt: ts,
              lastServerVisit: null,
              dirtySince: null,
              plates: false,
              glasses: true,
              course: "Just sat",
              confidence: hit.score || 0.7,
            };
          }
          return {
            ...t,
            partySize: Math.max(1, hit.people),
            confidence: hit.score || t.confidence,
          };
        }
        if (["seated", "awaiting", "dining", "check", "lingering"].includes(t.state)) {
          return {
            ...t,
            state: "dirty",
            partySize: 0,
            seatedAt: null,
            dirtySince: ts,
            plates: true,
            glasses: true,
            course: "Vacated",
            confidence: 0.72,
          };
        }
        return t;
      }),
    );
  }, []);

  const act = useCallback(
    (tableId: string, action: Action) => {
      setTables((prev) =>
        prev.map((t) => {
          if (t.id !== tableId) return t;
          if (action === "on_my_way") {
            return { ...t };
          }
          if (action === "greeted") {
            return {
              ...t,
              state: "dining",
              lastServerVisit: Date.now(),
              plates: false,
              glasses: true,
              course: "Greeted",
            };
          }
          if (action === "bus") {
            return { ...t, state: "bussing", course: "Bussing", dirtySince: t.dirtySince };
          }
          if (action === "ready") {
            return {
              ...t,
              state: "ready",
              partySize: 0,
              seatedAt: null,
              lastServerVisit: null,
              dirtySince: null,
              plates: false,
              glasses: false,
              checkDown: false,
              course: "—",
            };
          }
          if (action === "seat") {
            return {
              ...t,
              state: "seated",
              partySize: t.seats === 2 ? 2 : 4,
              seatedAt: Date.now(),
              lastServerVisit: null,
              plates: false,
              glasses: true,
              course: "Just sat",
            };
          }
          return t;
        }),
      );

      const table = tables.find((t) => t.id === tableId);
      if (action === "on_my_way") {
        setAssignments((a) => ({ ...a, [tableId]: "You" }));
        pushToast("On the way", `Table ${table?.label ?? tableId} is yours. Clock is still running.`);
      }
      if (action === "greeted") {
        setGreetsSaved((n) => n + 1);
        setRecoveredTonight((n) => n + 350);
        pushToast("Guest saved", `Table ${table?.label} greeted. Last course and the review stay in play.`);
      }
      if (action === "bus") {
        pushToast("Steward pinged", `Imran is on Table ${table?.label}.`);
      }
      if (action === "ready") {
        setExtraCovers((n) => n + 1);
        setRecoveredTonight((n) => n + 950);
        pushToast("Turn captured", `Table ${table?.label} is clean. Host can seat the waitlist.`);
      }
      if (action === "seat") {
        pushToast("Seated", `Party down at Table ${table?.label}. Five-minute clock started.`);
      }
    },
    [pushToast, tables],
  );

  const rawAlerts = useMemo(() => buildAlerts(tables, now), [tables, now]);
  const alerts = useMemo(
    () =>
      rawAlerts.map((a) => ({
        ...a,
        assignedTo: assignments[a.tableId] ?? a.assignedTo,
      })),
    [rawAlerts, assignments],
  );

  const setGreet = useCallback((n: number) => {
    greetRef.current = n;
    setGreetSeconds(n);
  }, []);

  const value = useMemo(
    () => ({
      tables,
      alerts,
      selectedId,
      setSelectedId,
      now,
      recoveredTonight,
      extraCovers,
      greetsSaved,
      toasts,
      dismissToast: (id: string) => setToasts((t) => t.filter((x) => x.id !== id)),
      act,
      liveMode,
      greetSeconds,
      setGreetSeconds: setGreet,
      startLive,
      stopLive,
      applyOccupancy,
    }),
    [
      tables,
      alerts,
      selectedId,
      now,
      recoveredTonight,
      extraCovers,
      greetsSaved,
      toasts,
      act,
      liveMode,
      greetSeconds,
      setGreet,
      startLive,
      stopLive,
      applyOccupancy,
    ],
  );

  return <FloorContext.Provider value={value}>{children}</FloorContext.Provider>;
}

export function useFloor() {
  const ctx = useContext(FloorContext);
  if (!ctx) throw new Error("useFloor must be used inside FloorProvider");
  return ctx;
}
