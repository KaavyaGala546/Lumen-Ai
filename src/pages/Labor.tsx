import { HOURS, STAFF } from "../data/hearth";

export function LaborPage() {
  const maxCovers = Math.max(...HOURS.map((h) => h.covers));

  return (
    <div className="grid gap-6">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Labour</h1>
        <p className="mt-2 text-sm text-mist">Friday 7–10pm is short two waiters. Roster comes from occupancy, not last month’s guess.</p>
      </header>

      <section className="border border-line bg-ink-2 p-5">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-sm font-medium">Tonight · covers vs on-floor staff</h2>
          <p className="font-mono text-[11px] text-mist">Recommended in brass</p>
        </div>
        <div className="grid grid-cols-8 gap-3">
          {HOURS.map((h) => (
            <div key={h.hour} className="flex flex-col items-center">
              <div className="relative flex h-44 w-full items-end justify-center gap-1 rounded-lg bg-ink-3 px-2 pb-2">
                <div
                  className="bar-grow w-3 rounded-sm bg-cyan/80"
                  style={{ height: `${(h.covers / maxCovers) * 100}%` }}
                  title={`${h.covers} covers`}
                />
                <div
                  className="w-2 rounded-sm bg-paper/30"
                  style={{ height: `${(h.staff / 8) * 100}%` }}
                />
                <div
                  className="w-2 rounded-sm bg-brass"
                  style={{ height: `${(h.recommended / 8) * 100}%` }}
                />
              </div>
              <p className="mt-2 font-mono text-[11px] text-mist">{h.hour}</p>
              <p className="font-mono text-[10px] text-brass">{h.wait.toFixed(1)}m wait</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="border border-line bg-ink-2 p-5">
          <h2 className="text-sm font-medium">Roster move for Friday</h2>
          <ul className="mt-4 space-y-3">
            <Move
              time="2:00–4:30"
              action="Cut one closer"
              why="Occupancy never clears 22%. ₹375 labour back without touching greeting times."
            />
            <Move
              time="6:30–8:45"
              action="Add two waiters"
              why="Covers peak at 49. Current six on the floor puts greet clock at 5.6 minutes — over the line."
            />
            <Move
              time="9:45–close"
              action="Keep one steward, drop a waiter"
              why="Reset time, not taking orders, is the constraint after 10."
            />
          </ul>
        </div>
        <div className="border border-line bg-ink-2 p-5">
          <h2 className="text-sm font-medium">On the floor</h2>
          <ul className="mt-4 space-y-2">
            {STAFF.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-lg bg-ink-3 px-3 py-2">
                <div>
                  <p className="text-sm text-paper">{s.name}</p>
                  <p className="text-[12px] text-mist">{s.section}</p>
                </div>
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-cyan">
                  {s.role === "server" ? "waiter" : s.role === "busser" ? "steward" : s.role}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Move({ time, action, why }: { time: string; action: string; why: string }) {
  return (
    <li className="rounded-xl border border-line bg-ink-3 p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-brass">{time}</p>
      <p className="mt-1 text-sm font-medium text-paper">{action}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-mist">{why}</p>
    </li>
  );
}
