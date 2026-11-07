import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout, Field, inputClass } from "../components/AuthLayout";
import { api, ApiError } from "../lib/api";

export function Reset() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const token = params.get("token") || "";

  return (
    <AuthLayout kicker="New password" title="Choose a new password.">
      <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          void (async () => {
            try {
              await api("/auth/reset", { method: "POST", body: JSON.stringify({ token, password }) });
              nav("/login");
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Reset failed.");
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        <Field label="New password">
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
        <button type="submit" disabled={busy || !token} className="w-full bg-cyan py-2.5 text-sm font-medium text-ink">
          Save password
        </button>
      </form>
      <Link to="/login" className="mt-6 block text-[13px] text-mist">
        Sign in
      </Link>
    </AuthLayout>
  );
}
