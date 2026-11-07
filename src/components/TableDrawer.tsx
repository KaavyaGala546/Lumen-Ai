import { useFloor } from "../state/FloorContext";
import { CAMERAS } from "../data/hearth";
import { formatMmSs, stateLabel } from "../lib/format";
import { stateColor } from "./StatusLegend";

export function TableDrawer() {
  const { tables, selectedId, now, act, greetSeconds } = useFloor();
  const table = tables.find((t) => t.id === selectedId);
  if (!table) {
    return (
      <div className="flex h-full items-center justify-center border border-line bg-ink-2 text-sm text-mist">
        Select a table
      </div>
    );
  }

  const color = stateColor(table.state);
  const wait =
    table.state === "dirty" && table.dirtySince
      ? (now - table.dirtySince) / 1000
      : table.seatedAt
        ? (now - table.seatedAt) / 1000
        : 0;
  const cam = CAMERAS.find((c) => c.id === table.camera);
  const visit = table.lastServerVisit ? (now - table.lastServerVisit) / 1000 : null;

  const intent =
    table.state === "lingering"
      ? "Linger. Check down. Do not page."
      : table.state === "awaiting"
        ? "Needs a waiter. No visit since they sat."
        : table.state === "dirty"
          ? "Party left. Table still dirty."
          : table.state === "dining"
            ? "In service."
            : table.state === "seated"
              ? `Clock running. Alert at ${formatMmSs(greetSeconds)}.`
              : "Open. Host can seat.";

  return (
    <aside className="flex h-full flex-col border border-line bg-ink-2 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[11px] text-mist">
            {table.zone} · {table.seats}-top
          </p>
          <h3 className="text-2xl font-semibold tracking-tight">Table {table.label}</h3>
        </div>
        <span className="px-2 py-1 font-mono text-[11px]" style={{ color: color.ring, background: color.fill, border: `1px solid ${color.ring}` }}>
          {stateLabel(table.state)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric k="Clock" v={table.seatedAt || table.dirtySince ? formatMmSs(wait) : "—"} />
        <Metric k="Party" v={table.partySize ? String(table.partySize) : "Empty"} />
        <Metric k="Conf." v={`${Math.round(table.confidence * 100)}%`} />
      </div>

      <p className="mt-4 text-[13px] text-mute">{intent}</p>

      <dl className="mt-4 space-y-2 border-t border-line pt-4 text-[12px]">
        <Row k="Waiter" v={table.server ?? "Unassigned"} />
        <Row k="Last visit" v={visit === null ? "None" : `${formatMmSs(visit)} ago`} />
        <Row k="Course" v={table.course} />
        <Row k="Plates / glass" v={`${table.plates ? "Yes" : "No"} / ${table.glasses ? "Yes" : "No"}`} />
        <Row k="Check" v={table.checkDown ? "Down" : "Not down"} />
        <Row k="Camera" v={cam ? cam.name : table.camera} />
      </dl>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {table.state === "dirty" || table.state === "bussing" ? (
          <>
            <button type="button" onClick={() => act(table.id, "bus")} className="bg-paper py-2.5 text-[13px] font-medium text-ink">
              Send busser
            </button>
            <button type="button" onClick={() => act(table.id, "ready")} className="border border-line py-2.5 text-[13px] text-paper">
              Mark ready
            </button>
          </>
        ) : table.state === "ready" ? (
          <button type="button" onClick={() => act(table.id, "seat")} className="col-span-2 bg-paper py-2.5 text-[13px] font-medium text-ink">
            Seat party
          </button>
        ) : (
          <>
            <button type="button" onClick={() => act(table.id, "on_my_way")} className="bg-paper py-2.5 text-[13px] font-medium text-ink">
              On my way
            </button>
            <button type="button" onClick={() => act(table.id, "greeted")} className="border border-line py-2.5 text-[13px] text-paper">
              Mark greeted
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

function Metric({ k, v }: { k: string; v: string }) {
  return (
    <div className="border border-line bg-ink-3 px-3 py-2">
      <p className="font-mono text-[10px] text-mist">{k}</p>
      <p className="mt-1 font-mono text-sm text-paper">{v}</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-mist">{k}</dt>
      <dd className="text-paper">{v}</dd>
    </div>
  );
}
