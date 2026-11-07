import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthLayout, Field, inputClass } from "../components/AuthLayout";
import { api, ApiError } from "../lib/api";

export function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <AuthLayout kicker="Reset" title="Reset your password.">
      <h1 className="text-2xl font-semibold tracking-tight">Forgot password</h1>
      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          void (async () => {
            try {
              const res = await api<{ ok: boolean; resetUrl?: string }>("/auth/forgot", {
                method: "POST",
                body: JSON.stringify({ email }),
              });
              setSent(res.resetUrl || "If that email is on file, the reset is in.");
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Could not send reset.");
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        <Field label="Email">
          <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        {error && <p className="text-sm text-rose">{error}</p>}
        {sent && (
          <p className="text-sm text-sage">
            Reset link (dev mailer):{" "}
            {sent.startsWith("http") ? (
              <Link className="underline" to={sent.replace(/^https?:\/\/[^/]+/, "")}>
                Set a new password
              </Link>
            ) : (
              sent
            )}
          </p>
        )}
        <button type="submit" disabled={busy} className="w-full bg-paper py-2.5 text-sm font-medium text-ink">
          Send reset
        </button>
      </form>
      <Link to="/login" className="mt-6 block text-[13px] text-mist hover:text-paper">
        Back to sign in
      </Link>
    </AuthLayout>
  );
}
