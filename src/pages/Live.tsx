import { AlertList } from "../components/AlertList";
import { FloorMap } from "../components/FloorMap";
import { LiveStage } from "../components/LiveStage";
import { TableDrawer } from "../components/TableDrawer";
import { useFloor } from "../state/FloorContext";
import { formatMmSs } from "../lib/format";

export function LivePage() {
  const { liveMode, greetSeconds, setGreetSeconds } = useFloor();

  return (
    <div className="grid gap-3">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Live camera</h1>
          <p className="text-[13px] text-mist">DVR first. Laptop only to test boxes. Tables 1–6 sit on this feed.</p>
        </div>
        <label className="flex items-center gap-3 text-[12px] text-mist">
          Alert after
          <input
            type="range"
            min={10}
            max={300}
            step={5}
            value={greetSeconds}
            onChange={(e) => setGreetSeconds(Number(e.target.value))}
            className="w-28"
          />
          <span className="font-mono text-paper">{formatMmSs(greetSeconds)}</span>
          {liveMode ? null : <span>(20s when live)</span>}
        </label>
      </header>

      <section className="grid grid-cols-[minmax(0,1.4fr)_280px] gap-3">
        <LiveStage />
        <div className="grid grid-cols-1 gap-3">
          <div className="min-h-[240px] border border-line bg-ink-2 p-3">
            <AlertList dense />
          </div>
          <div className="min-h-[240px]">
            <TableDrawer />
          </div>
        </div>
      </section>

      <section className="h-[240px] border border-line">
        <FloorMap compact />
      </section>
    </div>
  );
}
