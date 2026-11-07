import { useFloor } from "../state/FloorContext";
import type { Table } from "../types";
import { formatMmSs, stateLabel } from "../lib/format";
import { stateColor } from "./StatusLegend";

function TableNode({
  table,
  now,
  selected,
  onSelect,
}: {
  table: Table;
  now: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const color = stateColor(table.state);
  const elapsed =
    table.state === "dirty" && table.dirtySince
      ? (now - table.dirtySince) / 1000
      : table.seatedAt
        ? (now - table.seatedAt) / 1000
        : 0;
  const hot = table.state === "awaiting" || (table.state === "dirty" && elapsed > 3 * 60);
  const radius = table.shape === "round" ? "rounded-full" : table.shape === "bar" ? "rounded-sm" : "rounded-md";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`absolute flex flex-col items-center justify-center ${radius} ${selected ? "z-20" : "z-10"}`}
      style={{
        left: `${table.x}%`,
        top: `${table.y}%`,
        width: `${table.w}%`,
        height: `${table.h}%`,
        background: color.fill,
        border: `${selected || hot ? 2 : 1}px solid ${color.ring}`,
      }}
    >
      <span className="font-mono text-[11px] leading-none text-paper">{table.label}</span>
      <span className={`mt-1 text-[9px] leading-none ${color.text}`}>
        {table.state === "awaiting" || table.state === "seated" || table.state === "dirty"
          ? formatMmSs(elapsed)
          : stateLabel(table.state)}
      </span>
    </button>
  );
}

export function FloorMap({ compact = false }: { compact?: boolean }) {
  const { tables, selectedId, setSelectedId, now } = useFloor();

  return (
    <div className="relative h-full overflow-hidden bg-[#1a1814]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent, transparent 28px, #000 29px), repeating-linear-gradient(0deg, transparent, transparent 28px, #000 29px)",
        }}
      />
      <p className="absolute left-3 top-2 z-20 font-mono text-[10px] text-mist">CAM A</p>
      <p className="absolute right-3 top-2 z-20 text-[12px] font-medium text-paper/80">Aangan</p>

      <div className="absolute inset-x-3 bottom-3 top-8">
        {!compact && (
          <>
            <div className="absolute left-[2%] right-[22%] top-[3%] h-[11%] border border-line bg-ink-3/50">
              <p className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-mist">HOST · waitlist 11</p>
            </div>
            <div className="absolute bottom-[2%] left-[2%] right-[22%] h-[8%] border border-line bg-ink-3/80">
              <p className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-mist">PASS</p>
            </div>
            <div className="absolute left-[2%] top-[18%] h-[60%] w-[12%] border border-line/80">
              <p className="absolute inset-x-0 bottom-2 text-center font-mono text-[10px] text-mist">BAR</p>
            </div>
            <div className="absolute bottom-[12%] right-[1%] top-[16%] w-[18%] border border-dashed border-line/70">
              <p className="absolute right-2 top-2 font-mono text-[10px] text-mist">BOOTHS</p>
            </div>
          </>
        )}

        {tables.map((t) => (
          <TableNode
            key={t.id}
            table={t}
            now={now}
            selected={selectedId === t.id}
            onSelect={() => setSelectedId(t.id)}
          />
        ))}
      </div>
    </div>
  );
}
