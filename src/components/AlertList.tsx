import { useFloor } from "../state/FloorContext";
import { formatMmSs } from "../lib/format";

export function AlertList({ dense = false }: { dense?: boolean }) {
  const { alerts, now, selectedId, setSelectedId, act } = useFloor();
  const actionable = alerts.filter((a) => a.kind !== "held");
  const held = alerts.filter((a) => a.kind === "held");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between px-1 pb-3">
        <h2 className="text-sm font-medium text-paper">Queue</h2>
        <p className="font-mono text-[11px] text-mist">{actionable.length}</p>
      </div>
      <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto pr-1">
        {actionable.length === 0 && (
          <div className="border border-line bg-ink-3 px-3 py-6 text-center text-sm text-mist">No live alerts</div>
        )}
        {actionable.map((a) => {
          const age = (now - a.at) / 1000;
          const selected = selectedId === a.tableId;
          return (
            <button
              type="button"
              key={a.id}
              onClick={() => setSelectedId(a.tableId)}
              className={`w-full border px-3 py-2.5 text-left ${
                a.severity === "crit" ? "alert-flash border-rose/40 bg-rose/10" : "border-brass/30 bg-brass/10"
              } ${selected ? "border-paper" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-medium text-paper">{a.title}</p>
                <span className="font-mono text-[11px] text-mist">{formatMmSs(age)}</span>
              </div>
              {!dense && <p className="mt-1 text-[12px] leading-snug text-mute">{a.body}</p>}
              <div className="mt-2.5 flex gap-2">
                {a.kind === "dirty" ? (
                  <>
                    <span
                      role="link"
                      onClick={(e) => {
                        e.stopPropagation();
                        act(a.tableId, "bus");
                      }}
                      className="bg-paper px-2.5 py-1 text-[11px] font-medium text-ink"
                    >
                      Send busser
                    </span>
                    <span
                      role="link"
                      onClick={(e) => {
                        e.stopPropagation();
                        act(a.tableId, "ready");
                      }}
                      className="border border-line px-2.5 py-1 text-[11px] text-paper"
                    >
                      Mark ready
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      role="link"
                      onClick={(e) => {
                        e.stopPropagation();
                        act(a.tableId, "on_my_way");
                      }}
                      className="bg-paper px-2.5 py-1 text-[11px] font-medium text-ink"
                    >
                      {a.assignedTo ? a.assignedTo : "On my way"}
                    </span>
                    <span
                      role="link"
                      onClick={(e) => {
                        e.stopPropagation();
                        act(a.tableId, "greeted");
                      }}
                      className="border border-line px-2.5 py-1 text-[11px] text-paper"
                    >
                      Greeted
                    </span>
                  </>
                )}
              </div>
            </button>
          );
        })}

        {held.length > 0 && (
          <div className="pt-3">
            <p className="mb-2 font-mono text-[10px] text-mist">Held · do not page</p>
            {held.map((a) => (
              <button
                type="button"
                key={a.id}
                onClick={() => setSelectedId(a.tableId)}
                className="mb-2 w-full border border-line bg-ink-3 px-3 py-2.5 text-left"
              >
                <p className="text-[13px] text-paper">{a.title}</p>
                {!dense && <p className="mt-1 text-[12px] leading-snug text-mist">{a.body}</p>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
