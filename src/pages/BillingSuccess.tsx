import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Logo } from "../components/Logo";
import { api, ApiError, type Account } from "../lib/api";
import { useAuth } from "../state/AuthContext";

export function BillingSuccess() {
  const { setAccount } = useAuth();
  const [params] = useSearchParams();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const sessionId = params.get("session_id");
    if (!sessionId) {
      setDone(true);
      return;
    }
    void (async () => {
      try {
        const next = await api<Account>("/billing/confirm", {
          method: "POST",
          body: JSON.stringify({ sessionId }),
        });
        setAccount(next);
        setDone(true);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not confirm Stripe.");
      }
    })();
  }, [params, setAccount]);

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-5 text-paper">
      <div className="w-full max-w-md text-center">
        <Logo />
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">{error ? "Payment needs a look" : "Paid. Floor is ready."}</h1>
        <p className="mt-3 text-sm text-mist">
          {error || (done ? "Connect cameras next. Occupancy writes the floor." : "Confirming Stripe…")}
        </p>
        {done && (
          <Link to="/app" className="mt-8 inline-block bg-cyan px-6 py-2.5 text-sm font-medium text-ink">
            Open the floor
          </Link>
        )}
      </div>
    </div>
  );
}
