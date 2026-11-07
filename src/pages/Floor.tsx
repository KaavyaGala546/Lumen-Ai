import { useSearchParams } from "react-router-dom";
import { AlertList } from "../components/AlertList";
import { FloorMap } from "../components/FloorMap";
import { StatusLegend } from "../components/StatusLegend";
import { TableDrawer } from "../components/TableDrawer";
import { useFloor } from "../state/FloorContext";
import { useAuth } from "../state/AuthContext";
import { formatMmSs, money } from "../lib/format";

export function FloorPage() {
  const { tables, alerts, now, recoveredTonight, extraCovers, greetsSaved, liveMode } = useFloor();
  const { account } = useAuth();
  const [params] = useSearchParams();
  const justPaid = params.get("paid") === "1";
  const occupied = tables.filter((t) => t.partySize > 0).length;
  const ready = tables.filter((t) => t.state === "ready").length;
  const dirty = tables.filter((t) => t.state === "dirty" || t.state === "bussing").length;
  const waits = tables.filter((t) => t.state === "awaiting" || t.state === "seated");
  const avgWait =
    waits.length === 0
      ? 0
      : waits.reduce((s, t) => s + (t.seatedAt ? (now - t.seatedAt) / 1000 : 0), 0) / waits.length;
  const crit = alerts.filter((a) => a.kind !== "held").length;

  return (
    <div className="grid gap-4">
      {(justPaid || liveMode) && (
        <p className="border border-line bg-ink-2 px-3 py-2 text-[13px] text-mist">
          {liveMode
            ? "House camera is driving tables 1–6. Other tables stay on the sim."
            : `${account?.restaurant?.name} is on ${account?.subscription?.plan}.`}
        </p>
      )}
      <section className="grid grid-cols-5 gap-px overflow-hidden border border-line bg-line">
        <Kpi label="Occupied" value={`${occupied}/${tables.length}`} />
        <Kpi label="Open" value={String(ready)} />
        <Kpi label="Queue" value={String(crit)} accent={crit > 0} />
        <Kpi label="Avg wait" value={formatMmSs(avgWait)} />
        <Kpi label="Tonight" value={money(recoveredTonight)} gold hint={`+${extraCovers} covers · ${greetsSaved} greets`} />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusLegend />
        <p className="text-[12px] text-mist">{dirty} dirty</p>
      </div>

      <section className="grid h-[calc(100vh-13.5rem)] min-h-[480px] grid-cols-[minmax(0,1fr)_280px] gap-3">
        <div className="min-h-0 border border-line">
          <FloorMap />
        </div>
        <div className="flex min-h-0 flex-col gap-3">
          <div className="min-h-0 flex-1 overflow-hidden border border-line bg-ink-2 p-3">
            <AlertList />
          </div>
          <div className="h-[280px] shrink-0">
            <TableDrawer />
          </div>
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  accent,
  gold,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  gold?: boolean;
}) {
  return (
    <div className="bg-ink-2 px-4 py-3">
      <p className="text-[11px] text-mist">{label}</p>
      <p className={`mt-0.5 text-2xl font-semibold ${accent ? "text-rose" : gold ? "text-cyan" : ""}`}>{value}</p>
      {hint ? <p className="text-[11px] text-mist">{hint}</p> : null}
    </div>
  );
}
