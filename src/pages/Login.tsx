import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout, Field, inputClass } from "../components/AuthLayout";
import { useAuth } from "../state/AuthContext";
import { ApiError } from "../lib/api";

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function go(nextEmail: string, nextPassword: string) {
    setBusy(true);
    setError("");
    try {
      const account = await login(nextEmail, nextPassword);
      const next = params.get("next");
      if (next) nav(next);
      else if (!account.restaurant) nav("/onboarding");
      else if (!account.subscription?.active) nav("/checkout");
      else nav("/app");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout kicker="Sign in" title="Sign in to the floor.">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-mist">GM, host, or owner.</p>
      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void go(email, password);
        }}
      >
        <Field label="Email">
          <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password">
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        {error && <p className="text-sm text-rose">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-cyan py-2.5 text-sm font-medium text-ink disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <button
        type="button"
        className="mt-3 w-full border border-line py-2.5 text-sm text-paper"
        onClick={() => void go("gm@aangan.in", "AanganFriday1")}
      >
        Walk Aangan as GM
      </button>
      <div className="mt-6 flex justify-between text-[13px] text-mist">
        <Link to="/forgot" className="hover:text-paper">
          Forgot password
        </Link>
        <Link to="/signup" className="hover:text-paper">
          Create account
        </Link>
      </div>
    </AuthLayout>
  );
}
