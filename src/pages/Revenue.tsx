import { WEEK } from "../data/hearth";
import { money } from "../lib/format";
import { useFloor } from "../state/FloorContext";

export function RevenuePage() {
  const { recoveredTonight, extraCovers, greetsSaved } = useFloor();
  const weekRecovered = WEEK.reduce((s, d) => s + d.extra * 950 + d.missed * 180, 0);

  return (
    <div className="grid gap-6">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Revenue</h1>
        <p className="mt-2 text-sm text-mist">Covers recovered this week. Send this to the owner on Monday.</p>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <Card k="Recovered tonight" v={money(recoveredTonight)} s="Live from the floor" />
        <Card k="Extra covers" v={`+${extraCovers}`} s="Faster resets at peak" />
        <Card k="Greets saved" v={String(greetsSaved)} s="Under the five-minute line" />
        <Card k="This week" v={money(weekRecovered)} s="Before software cost" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="border border-line bg-ink-2 p-5">
          <h2 className="text-sm font-medium">Where the money came from</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <Line name="Dessert / apps not skipped" value={recoveredTonight * 0.28} note="Ignored greets kill the last course" />
            <Line name="Turns recaptured" value={recoveredTonight * 0.47} note="Dirty tables during the waitlist" />
            <Line name="Walks prevented" value={recoveredTonight * 0.15} note="Parties past eight minutes" />
            <Line name="Labor right-sized" value={recoveredTonight * 0.1} note="Monday cut, Friday add" />
          </ul>
        </div>
        <div className="border border-line bg-ink-2 p-5">
          <h2 className="text-sm font-medium">Week at Aangan</h2>
          <div className="mt-4 space-y-2">
            {WEEK.map((d) => (
              <div key={d.day} className="grid grid-cols-[40px_1fr_80px] items-center gap-3 text-[13px]">
                <span className="font-mono text-mist">{d.day}</span>
                <div className="h-2 overflow-hidden bg-ink-3">
                  <div
                    className="h-full bg-cyan/80"
                    style={{ width: `${(d.covers / 198) * 100}%` }}
                  />
                </div>
                <span className="text-right font-mono text-paper">{d.covers} cv</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border border-line bg-ink-2 p-5">
        <p className="font-mono text-[11px] text-mist">Owner note</p>
        <p className="mt-2 text-lg leading-snug text-paper">
          Dining is {money(6999)}/mo + GST. Aangan is on pace for {money(weekRecovered * 4.3)} recovered this month.
        </p>
      </section>
    </div>
  );
}

function Card({ k, v, s }: { k: string; v: string; s: string }) {
  return (
    <div className="border border-line bg-ink-2 px-4 py-4">
      <p className="font-mono text-[10px] text-mist">{k}</p>
      <p className="mt-1 text-2xl font-semibold text-paper">{v}</p>
      <p className="mt-1 text-[12px] text-mist">{s}</p>
    </div>
  );
}

function Line({ name, value, note }: { name: string; value: number; note: string }) {
  return (
    <li className="flex items-start justify-between gap-4 border-b border-line pb-3">
      <div>
        <p className="text-paper">{name}</p>
        <p className="text-[12px] text-mist">{note}</p>
      </div>
      <p className="font-mono text-brass">{money(value)}</p>
    </li>
  );
}
