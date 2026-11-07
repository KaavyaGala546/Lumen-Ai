import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout, Field, inputClass } from "../components/AuthLayout";
import { useAuth } from "../state/AuthContext";
import { ApiError } from "../lib/api";

export function Signup() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState(params.get("email") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <AuthLayout kicker="Create account" title="Create an account, then pick a plan by table count.">
      <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
      <p className="mt-2 text-sm text-mist">Plans are sized to tables. GST extra. Pay in INR.</p>
      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          void (async () => {
            try {
              const account = await register(name, email, password);
              const qs = new URLSearchParams();
              if (params.get("plan")) qs.set("plan", params.get("plan")!);
              if (params.get("restaurant")) qs.set("restaurant", params.get("restaurant")!);
              if (params.get("city")) qs.set("city", params.get("city")!);
              if (params.get("tables")) qs.set("tables", params.get("tables")!);
              if (account.restaurant) nav(`/checkout${params.get("plan") ? `?plan=${params.get("plan")}` : ""}`);
              else nav(`/onboarding${qs.toString() ? `?${qs}` : ""}`);
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Could not create the house.");
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        <Field label="Your name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Work email">
          <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password">
          <input
            className={inputClass}
            type="password"
            minLength={8}
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
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-[13px] text-mist">
        Already have an account?{" "}
        <Link to="/login" className="text-paper">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
