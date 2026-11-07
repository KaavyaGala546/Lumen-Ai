import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FloorMap } from "../components/FloorMap";
import { Logo } from "../components/Logo";
import { StatusLegend } from "../components/StatusLegend";
import { computeRoi, type RoiInputs } from "../lib/money";
import { money } from "../lib/format";
import { PLANS } from "../lib/plans";
import { api } from "../lib/api";
import { useAuth } from "../state/AuthContext";

export function Landing() {
  const { account } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState<RoiInputs>({
    tables: 20,
    avgCheck: 850,
    peakNights: 3,
    greetMissPct: 11,
    resetMin: 7.5,
  });
  const [lead, setLead] = useState({ restaurant: "", city: "", email: "", tables: "16" });
  const [sent, setSent] = useState(false);
  const [leadError, setLeadError] = useState("");
  const roi = useMemo(() => computeRoi(form), [form]);
  const appLink = account?.subscription?.active ? "/app" : account ? "/checkout" : "/login";
  const dining = PLANS.find((p) => p.id === "dining")!;

  return (
    <div className="bg-ink text-paper">
      <header className="sticky top-0 z-40 border-b border-line bg-ink">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Logo />
          <nav className="hidden items-center gap-6 text-[13px] text-mist md:flex">
            <a href="#how" className="hover:text-paper">
              How it works
            </a>
            <a href="#pricing" className="hover:text-paper">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <Link to={appLink} className="text-[13px] text-mist hover:text-paper">
              {account ? "Floor" : "Sign in"}
            </Link>
            <Link to="/signup" className="bg-paper px-3 py-1.5 text-[13px] font-medium text-ink">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 md:grid-cols-2">
        <div>
          <p className="text-[13px] text-mist">Indian restaurants · hotel F&B · existing CCTV</p>
          <h1 className="mt-3 text-[2.15rem] font-semibold leading-tight tracking-tight md:text-[2.6rem]">
            Know which table has been waiting — without walking the floor.
          </h1>
          <ul className="mt-5 space-y-2 text-[15px] text-mute">
            <li>— Guest waits 5 minutes, waiter gets a tap</li>
            <li>— Dirty table on the waitlist gets called out</li>
            <li>— Works with Hikvision, Uniview, Dahua, Axis</li>
          </ul>
          <div className="mt-7 flex flex-wrap gap-2">
            <Link to="/login" className="bg-cyan px-4 py-2 text-sm font-medium text-ink">
              Try Aangan demo
            </Link>
            <a href="#pricing" className="border border-line px-4 py-2 text-sm">
              From {money(dining.price)}/mo
            </a>
          </div>
        </div>
        <div>
          <div className="h-[400px] border border-line">
            <FloorMap />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <StatusLegend />
            <p className="text-[11px] text-mist">Aangan, Bandra · Friday dinner</p>
          </div>
        </div>
      </section>

      <section id="how" className="border-y border-line bg-ink-2">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-3">
          <Step n="1" t="Connect the DVR" d="IP, user, password. Same LAN as this computer. No new cameras." />
          <Step n="2" t="Map tables on the feed" d="Draw boxes on Cam A. Occupancy writes the floor." />
          <Step n="3" t="Run service" d="Handheld for waiters. Host sees dirty tables. Owner sees recovered covers." />
        </div>
      </section>

      <section id="economics" className="mx-auto max-w-6xl px-5 py-14">
        <h2 className="text-xl font-semibold">For a 20-table room at ₹850 average check</h2>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 border border-line bg-ink-2 p-5">
            <Slider label="Tables" value={form.tables} min={6} max={120} step={1} display={String(form.tables)} onChange={(v) => setForm((f) => ({ ...f, tables: v }))} />
            <Slider label="Average check" value={form.avgCheck} min={250} max={4000} step={50} display={money(form.avgCheck)} onChange={(v) => setForm((f) => ({ ...f, avgCheck: v }))} />
            <Slider label="Peak nights / week" value={form.peakNights} min={1} max={7} step={1} display={String(form.peakNights)} onChange={(v) => setForm((f) => ({ ...f, peakNights: v }))} />
          </div>
          <div className="border border-line bg-ink-2 p-5">
            <p className="text-[12px] text-mist">Monthly recovered, after {money(roi.software)} software</p>
            <p className="mt-1 text-4xl font-semibold">{money(roi.monthly)}</p>
            <p className="mt-1 text-sm text-mist">
              Net {money(roi.net)} · {roi.multiple.toFixed(1)}× · payback {roi.paybackDays} days · GST extra
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-mist">Extra covers</dt>
                <dd className="font-mono">{roi.recoveredCovers.toFixed(0)}</dd>
              </div>
              <div>
                <dt className="text-mist">Turn revenue</dt>
                <dd className="font-mono">{money(roi.recoveredRevenue)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section id="pricing" className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-xl font-semibold">Pricing, GST extra</h2>
          <div className="mt-6 overflow-x-auto border border-line">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-ink-2 text-[12px] text-mist">
                <tr>
                  <th className="px-3 py-2 font-medium">Plan</th>
                  <th className="px-3 py-2 font-medium">For</th>
                  <th className="px-3 py-2 font-medium">Tables</th>
                  <th className="px-3 py-2 font-medium">Cams</th>
                  <th className="px-3 py-2 font-medium">Price / month</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {PLANS.map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="px-3 py-3 font-medium">
                      {p.name}
                      {p.featured ? <span className="ml-2 text-[11px] text-cyan">{p.badge}</span> : null}
                    </td>
                    <td className="px-3 py-3 text-mist">{p.audience}</td>
                    <td className="px-3 py-3 font-mono">{p.tablesMax}</td>
                    <td className="px-3 py-3 font-mono">{p.cameras}</td>
                    <td className="px-3 py-3 font-mono">
                      {money(p.price)}
                      <span className="text-mist">
                        {p.id === "chain" ? "/outlet" : p.id === "property" ? "/property" : "/mo"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link to={`/signup?plan=${p.id}`} className={`inline-block px-3 py-1.5 text-[12px] font-medium ${p.featured ? "bg-cyan text-ink" : "border border-line"}`}>
                        Start
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-ink-2">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold">Start with your room</h2>
            <p className="mt-2 text-sm text-mist">We’ll size the plan from table count. Demo login is gm@aangan.in / AanganFriday1.</p>
          </div>
          <form
            className="border border-line bg-ink p-5"
            onSubmit={(e) => {
              e.preventDefault();
              setLeadError("");
              void (async () => {
                try {
                  await api("/leads", {
                    method: "POST",
                    body: JSON.stringify({
                      restaurant: lead.restaurant,
                      city: lead.city,
                      email: lead.email,
                      tables: Number(lead.tables || 16),
                    }),
                  });
                  setSent(true);
                  nav(
                    `/signup?email=${encodeURIComponent(lead.email)}&restaurant=${encodeURIComponent(lead.restaurant)}&city=${encodeURIComponent(lead.city)}&tables=${encodeURIComponent(lead.tables || "16")}`,
                  );
                } catch {
                  setLeadError("Could not save. Try again.");
                }
              })();
            }}
          >
            {sent ? (
              <p className="py-8 text-sm">Saved. Create a password next.</p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-[12px] text-mist">
                    Restaurant
                    <input required value={lead.restaurant} onChange={(e) => setLead((l) => ({ ...l, restaurant: e.target.value }))} className="mt-1 w-full border border-line bg-ink-2 px-3 py-2 text-sm" placeholder="Aangan" />
                  </label>
                  <label className="text-[12px] text-mist">
                    City
                    <input required value={lead.city} onChange={(e) => setLead((l) => ({ ...l, city: e.target.value }))} className="mt-1 w-full border border-line bg-ink-2 px-3 py-2 text-sm" placeholder="Mumbai" />
                  </label>
                  <label className="text-[12px] text-mist">
                    Email
                    <input required type="email" value={lead.email} onChange={(e) => setLead((l) => ({ ...l, email: e.target.value }))} className="mt-1 w-full border border-line bg-ink-2 px-3 py-2 text-sm" placeholder="gm@aangan.in" />
                  </label>
                  <label className="text-[12px] text-mist">
                    Tables
                    <input value={lead.tables} onChange={(e) => setLead((l) => ({ ...l, tables: e.target.value }))} className="mt-1 w-full border border-line bg-ink-2 px-3 py-2 text-sm" />
                  </label>
                </div>
                {leadError && <p className="mt-2 text-sm text-rose">{leadError}</p>}
                <button type="submit" className="mt-4 bg-paper px-4 py-2 text-sm font-medium text-ink">
                  Continue
                </button>
              </>
            )}
          </form>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl justify-between px-5 py-6 text-[12px] text-mist">
          <Logo />
          <p>INR · GST extra · occupancy only, no faces</p>
        </div>
      </footer>
    </div>
  );
}

function Step({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <div>
      <p className="font-mono text-[12px] text-cyan">{n}</p>
      <h3 className="mt-1 text-base font-semibold">{t}</h3>
      <p className="mt-1 text-sm text-mist">{d}</p>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex justify-between text-[12px] text-mist">
        {label}
        <span className="font-mono text-paper">{display}</span>
      </span>
      <input type="range" className="mt-2 w-full" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
