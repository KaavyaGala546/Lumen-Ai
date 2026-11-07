import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Logo } from "../components/Logo";
import { Field, inputClass } from "../components/AuthLayout";
import { getPlan, gstOf, TEST_CARDS, withGst } from "../lib/plans";
import { api, ApiError, type Account } from "../lib/api";
import { useAuth } from "../state/AuthContext";
import { money } from "../lib/format";

function formatCard(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 16);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function Checkout() {
  const { account, setAccount, refresh } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const plan = getPlan(params.get("plan") || account?.subscription?.plan || "dining");
  const [method, setMethod] = useState<"upi" | "card">("upi");
  const [vpa, setVpa] = useState("gm@okhdfcbank");
  const [number, setNumber] = useState("4242 4242 4242 4242");
  const [exp, setExp] = useState("12 / 28");
  const [cvc, setCvc] = useState("123");
  const [name, setName] = useState(account?.user.name || "");
  const [pin, setPin] = useState("400050");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const stripe = account?.gateway === "stripe";
  const gst = gstOf(plan.price);
  const total = withGst(plan.price);

  const expParts = useMemo(() => {
    const m = exp.match(/(\d{1,2})\s*\/\s*(\d{2,4})/);
    return m ? { month: Number(m[1]), year: Number(m[2]) } : { month: 0, year: 0 };
  }, [exp]);

  async function payLocal() {
    setBusy(true);
    setError("");
    try {
      const body =
        method === "upi"
          ? { plan: plan.id, method: "upi", vpa }
          : {
              plan: plan.id,
              method: "card",
              number,
              expMonth: expParts.month,
              expYear: expParts.year,
              cvc,
              name,
              pin,
            };
      const next = await api<Account>("/billing/pay", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setAccount(next);
      nav("/app?paid=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Payment failed.");
    } finally {
      setBusy(false);
    }
  }

  async function payStripe() {
    setBusy(true);
    setError("");
    try {
      const res = await api<{ mode: string; url: string }>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan: plan.id }),
      });
      if (res.mode === "stripe" && res.url.startsWith("http")) {
        window.location.href = res.url;
        return;
      }
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start Stripe.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6">
        <Link to="/">
          <Logo />
        </Link>
        <p className="font-mono text-[11px] text-mist">
          {stripe ? "Stripe Checkout · INR" : "UPI & cards"}
        </p>
      </header>
      <main className="mx-auto grid max-w-5xl gap-8 px-5 pb-16 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="border border-line bg-ink-2 p-6">
          <h1 className="text-2xl font-semibold tracking-tight">Pay</h1>
          <p className="mt-2 text-sm text-mist">
            {account?.restaurant?.name || "Your room"} · {account?.restaurant?.city || "—"} · {account?.restaurant?.tables || "—"} tables
          </p>

          {stripe ? (
            <div className="mt-8">
              <p className="text-sm text-mute">You’ll finish on Stripe in INR. Subscriptions renew monthly. GST is included in the charge.</p>
              {error && <p className="mt-3 text-sm text-rose">{error}</p>}
              <button
                type="button"
                disabled={busy}
                onClick={() => void payStripe()}
                className="mt-6 w-full bg-cyan py-3 text-sm font-medium text-ink"
              >
                {busy ? "Redirecting…" : `Pay ${money(total)} with Stripe`}
              </button>
            </div>
          ) : (
            <form
              className="mt-8 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void payLocal();
              }}
            >
              <div className="grid grid-cols-2 gap-2 border border-line p-1">
                {(["upi", "card"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`py-2 text-sm ${method === m ? "bg-cyan text-ink" : "text-mist"}`}
                  >
                    {m === "upi" ? "UPI" : "Card"}
                  </button>
                ))}
              </div>
              {method === "upi" ? (
                <Field label="UPI ID">
                  <input
                    className={`${inputClass} font-mono`}
                    value={vpa}
                    onChange={(e) => setVpa(e.target.value)}
                    placeholder="gm@okhdfcbank"
                    required
                  />
                </Field>
              ) : (
                <>
                  <Field label="Card number">
                    <input
                      className={`${inputClass} font-mono`}
                      inputMode="numeric"
                      autoComplete="cc-number"
                      value={number}
                      onChange={(e) => setNumber(formatCard(e.target.value))}
                      required
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Expiry">
                      <input
                        className={`${inputClass} font-mono`}
                        placeholder="MM / YY"
                        autoComplete="cc-exp"
                        value={exp}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^\d]/g, "").slice(0, 4);
                          setExp(raw.length > 2 ? `${raw.slice(0, 2)} / ${raw.slice(2)}` : raw);
                        }}
                        required
                      />
                    </Field>
                    <Field label="CVC">
                      <input
                        className={`${inputClass} font-mono`}
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        maxLength={4}
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        required
                      />
                    </Field>
                  </div>
                  <Field label="Name on card">
                    <input className={inputClass} autoComplete="cc-name" value={name} onChange={(e) => setName(e.target.value)} required />
                  </Field>
                  <Field label="Billing PIN">
                    <input
                      className={inputClass}
                      autoComplete="postal-code"
                      inputMode="numeric"
                      maxLength={6}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      required
                    />
                  </Field>
                </>
              )}
              {error && <p className="text-sm text-rose">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full bg-cyan py-3 text-sm font-medium text-ink disabled:opacity-60"
              >
                {busy ? "Charging…" : `Pay ${money(total)}`}
              </button>
              <p className="text-[11px] text-mist">
                GST 18% is added on the invoice. Card data is authorized and discarded. We store brand and last four only.
              </p>
            </form>
          )}
        </section>

        <aside className="space-y-4">
          <div className="border border-line bg-ink-2 p-5">
            <p className="font-mono text-[11px] text-mist">Order</p>
            <h2 className="mt-2 text-2xl font-semibold">{plan.name}</h2>
            <p className="mt-1 text-sm text-mist">{plan.blurb}</p>
            <p className="mt-1 text-[12px] text-mute">
              Up to {plan.tablesMax} tables · {plan.cameras} cameras
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-mist">List</dt>
                <dd>{money(plan.price)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-mist">GST 18%</dt>
                <dd>{money(gst)}</dd>
              </div>
              <div className="flex justify-between font-medium">
                <dt>Due now</dt>
                <dd className="text-2xl font-semibold">{money(total)}</dd>
              </div>
            </dl>
            <ul className="mt-4 space-y-1 text-sm text-mute">
              {plan.points.map((p) => (
                <li key={p}>— {p}</li>
              ))}
            </ul>
          </div>
          {!stripe && method === "card" && (
            <div className="border border-line bg-ink-2 p-5">
              <p className="text-sm font-medium">Test cards</p>
              <ul className="mt-3 space-y-2 font-mono text-[12px] text-mist">
                {TEST_CARDS.map((c) => (
                  <li key={c.number}>
                    <button type="button" className="text-left hover:text-paper" onClick={() => setNumber(c.number)}>
                      {c.number}
                      <span className="block text-[11px] text-mist">{c.result}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
