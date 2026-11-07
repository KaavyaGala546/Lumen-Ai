import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "../components/Logo";
import { Field, inputClass } from "../components/AuthLayout";
import { getPlan, PLANS, recommendPlan, type PlanId } from "../lib/plans";
import { api, ApiError, type Account } from "../lib/api";
import { useAuth } from "../state/AuthContext";
import { money } from "../lib/format";

export function Onboarding() {
  const { account, setAccount } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [name, setName] = useState(params.get("restaurant") || account?.restaurant?.name || "");
  const [city, setCity] = useState(params.get("city") || account?.restaurant?.city || "");
  const [kind, setKind] = useState<"restaurant" | "hotel">("restaurant");
  const [tables, setTables] = useState(String(params.get("tables") || account?.restaurant?.tables || 16));
  const [cameras, setCameras] = useState(String(account?.restaurant?.cameras || 4));
  const [avgCheck, setAvgCheck] = useState("950");
  const [plan, setPlan] = useState<PlanId | "">((params.get("plan") as PlanId) || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const suggested = useMemo(
    () => recommendPlan(Number(tables) || 16, kind),
    [tables, kind],
  );
  const chosen = (plan || suggested) as PlanId;
  const rec = getPlan(suggested);

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-6">
        <Logo />
        <p className="font-mono text-[11px] text-mist">Step 1 · Room</p>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-16">
        <h1 className="text-3xl font-semibold tracking-tight">Your room</h1>
        <p className="mt-2 text-sm text-mist">Plans follow table count. 16 tables is Dining. Hotel F&B is Property.</p>
        <form
          className="mt-8 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            void (async () => {
              try {
                const next = await api<Account>("/restaurant", {
                  method: "PUT",
                  body: JSON.stringify({
                    name,
                    city,
                    tables: Number(tables),
                    cameras: Number(cameras),
                    avgCheck: Number(avgCheck),
                  }),
                });
                setAccount(next);
                nav(`/checkout?plan=${chosen}`);
              } catch (err) {
                setError(err instanceof ApiError ? err.message : "Could not save the room.");
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Restaurant or hotel">
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="City">
              <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} required />
            </Field>
            <Field label="Tables on the floor">
              <input
                className={inputClass}
                type="number"
                min={4}
                max={200}
                value={tables}
                onChange={(e) => {
                  setTables(e.target.value);
                  setPlan("");
                }}
              />
            </Field>
            <Field label="Existing cameras">
              <input className={inputClass} type="number" min={1} max={24} value={cameras} onChange={(e) => setCameras(e.target.value)} />
            </Field>
            <Field label="Average check (₹)">
              <input className={inputClass} type="number" min={80} max={8000} value={avgCheck} onChange={(e) => setAvgCheck(e.target.value)} />
            </Field>
            <div>
              <p className="mb-2 text-[12px] text-mist">What are we watching</p>
              <div className="grid grid-cols-2 gap-2">
                {(["restaurant", "hotel"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setKind(k);
                      setPlan("");
                    }}
                    className={`border px-3 py-2 text-sm capitalize ${
                      kind === k ? "border-cyan bg-ink-2" : "border-line"
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="font-mono text-[11px] text-cyan">
            Recommended {rec.name} for {tables || "—"} tables
          </p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {PLANS.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => setPlan(p.id)}
                className={`border p-4 text-left ${chosen === p.id ? "border-cyan bg-ink-2" : "border-line"}`}
              >
                <p className="font-mono text-[10px] text-brass">
                  {p.id === suggested ? "Recommended" : p.badge || p.audience}
                </p>
                <p className="mt-1 text-xl font-semibold">{p.name}</p>
                <p className="mt-1 font-mono text-sm text-brass">
                  {money(p.price)}
                  <span className="text-mist"> {p.suffix}</span>
                </p>
                <p className="mt-2 text-[12px] text-mist">Up to {p.tablesMax} tables · {p.cameras} cams</p>
              </button>
            ))}
          </div>
          {error && <p className="text-sm text-rose">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="bg-cyan px-6 py-2.5 text-sm font-medium text-ink disabled:opacity-60"
          >
            {busy ? "Saving…" : "Continue to payment"}
          </button>
        </form>
      </main>
    </div>
  );
}
