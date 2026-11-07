import { useFloor } from "../state/FloorContext";
import { formatMmSs, stateLabel } from "../lib/format";
import { stateColor } from "../components/StatusLegend";

export function StaffPage() {
  const { alerts, tables, now, act, setSelectedId } = useFloor();
  const mine = alerts.filter((a) => a.kind !== "held");
  const next = mine[0];
  const nextTable = tables.find((t) => t.id === next?.tableId);

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[380px_1fr]">
      <div className="mx-auto w-full max-w-[380px]">
        <div className="rounded-[36px] border border-line bg-ink-3 p-3 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <div className="rounded-[28px] bg-ink px-4 pb-6 pt-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-mist">Meera · Main 1–6</p>
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-sage" />
            </div>
            {next && nextTable ? (
              <div className="border border-rose/40 bg-rose/10 p-4">
                <p className="font-mono text-[10px] text-rose">Next table</p>
                <h2 className="mt-1 text-3xl font-semibold tracking-tight text-paper">Table {nextTable.label}</h2>
                <p className="mt-2 text-sm text-mute">{next.body}</p>
                <p className="mt-3 font-mono text-2xl text-brass">
                  {formatMmSs((now - next.at) / 1000)}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => act(next.tableId, next.kind === "dirty" ? "bus" : "on_my_way")}
                    className="rounded-xl bg-paper py-3 text-sm font-medium text-ink"
                  >
                    {next.kind === "dirty" ? "I’ll bus" : "On my way"}
                  </button>
                  <button
                    type="button"
                    onClick={() => act(next.tableId, next.kind === "dirty" ? "ready" : "greeted")}
                    className="rounded-xl border border-line py-3 text-sm text-paper"
                  >
                    {next.kind === "dirty" ? "Ready" : "Greeted"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-line px-4 py-12 text-center text-sm text-mist">Queue is clear</div>
            )}

            <ul className="mt-4 space-y-2">
              {mine.slice(1).map((a) => {
                const t = tables.find((x) => x.id === a.tableId);
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(a.tableId)}
                      className="flex w-full items-center justify-between rounded-xl border border-line bg-ink-2 px-3 py-3"
                    >
                      <span className="text-sm text-paper">Table {t?.label}</span>
                      <span className="font-mono text-[12px] text-mist">{formatMmSs((now - a.at) / 1000)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <p className="mt-3 text-center text-[12px] text-mist">Waiter handheld. Next table only.</p>
      </div>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Section board</h1>
        <p className="mt-1 max-w-xl text-sm text-mist">Waiting guests first, then dirty tables. Linger is held so the pager stays trusted.</p>
        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
          {tables
            .filter((t) => t.zone === "main" || t.zone === "booth")
            .map((t) => {
              const c = stateColor(t.state);
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-line bg-ink-2 px-3 py-3"
                >
                  <div>
                    <p className="text-sm text-paper">Table {t.label}</p>
                    <p className="text-[12px] text-mist">{t.server ?? "Unassigned"}</p>
                  </div>
                  <span className={`font-mono text-[12px] ${c.text}`}>{stateLabel(t.state)}</span>
                </li>
              );
            })}
        </ul>
      </div>
    </div>
  );
}
