import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { api, ApiError, type Account } from "../lib/api";
import { Field, inputClass } from "../components/AuthLayout";
import { PLANS } from "../lib/plans";
import { money } from "../lib/format";

export function SettingsPage() {
  const { account, logout } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<"profile" | "house" | "billing" | "team">("profile");
  if (!account) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
      <aside className="space-y-1">
        {(["profile", "house", "billing", "team"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`block w-full rounded-lg px-3 py-2 text-left text-sm capitalize ${
              tab === t ? "bg-ink-4 text-paper" : "text-mist hover:text-paper"
            }`}
          >
            {t}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            logout();
            nav("/");
          }}
          className="mt-4 block w-full rounded-lg px-3 py-2 text-left text-sm text-rose"
        >
          Sign out
        </button>
      </aside>
      <section>
        {tab === "profile" && <Profile />}
        {tab === "house" && <House />}
        {tab === "billing" && <Billing />}
        {tab === "team" && <Team />}
      </section>
    </div>
  );
}

function Profile() {
  const { account, setAccount } = useAuth();
  const [name, setName] = useState(account?.user.name || "");
  const [currentPassword, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  return (
    <form
      className="max-w-lg space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        setMsg("");
        void (async () => {
          try {
            const next = await api<Account>("/account", {
              method: "PATCH",
              body: JSON.stringify({
                name,
                ...(password ? { password, currentPassword } : {}),
              }),
            });
            setAccount(next);
            setPassword("");
            setCurrent("");
            setMsg("Saved.");
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Could not save.");
          }
        })();
      }}
    >
      <h1 className="text-xl font-semibold tracking-tight">Profile</h1>
      <Field label="Name">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Email">
        <input className={inputClass} value={account?.user.email || ""} disabled />
      </Field>
      <Field label="Current password">
        <input className={inputClass} type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
      </Field>
      <Field label="New password">
        <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      {msg && <p className="text-sm text-sage">{msg}</p>}
      {error && <p className="text-sm text-rose">{error}</p>}
      <button type="submit" className="bg-paper px-5 py-2 text-sm font-medium text-ink">
        Save
      </button>
    </form>
  );
}

function House() {
  const { account, setAccount } = useAuth();
  const r = account?.restaurant;
  const [name, setName] = useState(r?.name || "");
  const [city, setCity] = useState(r?.city || "");
  const [tables, setTables] = useState(String(r?.tables || 16));
  const [cameras, setCameras] = useState(String(r?.cameras || 4));
  const [avgCheck, setAvg] = useState(String(r?.avgCheck || 950));
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  return (
    <form
      className="max-w-lg space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        setMsg("");
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
            setMsg("Saved.");
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Could not save.");
          }
        })();
      }}
    >
      <h1 className="text-xl font-semibold tracking-tight">House</h1>
      <Field label="Restaurant">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label="City">
        <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} required />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Tables">
          <input className={inputClass} type="number" value={tables} onChange={(e) => setTables(e.target.value)} />
        </Field>
        <Field label="Cameras">
          <input className={inputClass} type="number" value={cameras} onChange={(e) => setCameras(e.target.value)} />
        </Field>
        <Field label="Avg check">
          <input className={inputClass} type="number" value={avgCheck} onChange={(e) => setAvg(e.target.value)} />
        </Field>
      </div>
      {msg && <p className="text-sm text-sage">{msg}</p>}
      {error && <p className="text-sm text-rose">{error}</p>}
      <button type="submit" className="bg-paper px-5 py-2 text-sm font-medium text-ink">
        Save
      </button>
    </form>
  );
}

function Billing() {
  const { account, setAccount } = useAuth();
  const sub = account?.subscription;
  const [error, setError] = useState("");

  async function run(path: string, body?: object) {
    setError("");
    try {
      const next = await api<Account>(path, { method: "POST", body: body ? JSON.stringify(body) : "{}" });
      setAccount(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Billing request failed.");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Billing</h1>
      <div className="border border-line bg-ink-2 p-5">
        <p className="font-mono text-[11px] text-cyan">{sub?.plan || "none"}</p>
        <p className="mt-1 text-2xl font-semibold">{sub ? money(sub.amount / 100) : "No plan"} / month + GST</p>
        <p className="mt-2 text-sm text-mist">
          {sub?.active ? "Active" : sub?.status || "Unpaid"}
          {sub?.cancelAtPeriodEnd ? " · cancels at period end" : ""}
          {sub?.last4 ? ` · ${sub.brand} •••• ${sub.last4}` : ""}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {sub?.active && !sub.cancelAtPeriodEnd && (
            <button type="button" onClick={() => void run("/billing/cancel")} className="border border-line px-4 py-2 text-sm">
              Cancel at period end
            </button>
          )}
          {sub?.cancelAtPeriodEnd && (
            <button type="button" onClick={() => void run("/billing/resume")} className="bg-paper px-4 py-2 text-sm text-ink">
              Keep subscription
            </button>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-rose">{error}</p>}
      </div>
      <div>
        <p className="text-sm font-medium">Change plan</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => void run("/billing/change", { plan: p.id })}
              className={`border p-4 text-left ${sub?.plan === p.id ? "border-cyan" : "border-line"}`}
            >
              <p className="text-lg font-semibold">{p.name}</p>
              <p className="font-mono text-sm text-brass">{money(p.price)} + GST</p>
              <p className="mt-1 text-[11px] text-mist">Up to {p.tablesMax} tables</p>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium">Invoices</p>
        <ul className="mt-3 divide-y divide-line border border-line">
          {account?.invoices.map((inv) => (
            <li key={inv.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-mono text-mist">{inv.number}</span>
              <span className="capitalize">{inv.plan}</span>
              <span>{money(inv.amount / 100)}</span>
              <span className="text-sage">{inv.status}</span>
            </li>
          ))}
          {account?.invoices.length === 0 && <li className="px-4 py-6 text-sm text-mist">No invoices yet.</li>}
        </ul>
      </div>
    </div>
  );
}

function Team() {
  const { account, setAccount } = useAuth();
  const [name, setName] = useState("");
  const [role, setRole] = useState("server");
  const [section, setSection] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Team</h1>
      <form
        className="grid gap-3 sm:grid-cols-[1fr_140px_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          void (async () => {
            try {
              const next = await api<Account>("/team", {
                method: "POST",
                body: JSON.stringify({ name, role, section }),
              });
              setAccount(next);
              setName("");
              setSection("");
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Could not add.");
            }
          })();
        }}
      >
        <input className={inputClass} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="server">Waiter</option>
          <option value="busser">Steward</option>
          <option value="host">Host</option>
          <option value="gm">GM / F&B</option>
        </select>
        <input className={inputClass} placeholder="Section" value={section} onChange={(e) => setSection(e.target.value)} />
        <button type="submit" className="rounded-lg bg-paper px-4 py-2 text-sm font-medium text-ink">
          Add
        </button>
      </form>
      {error && <p className="text-sm text-rose">{error}</p>}
      <ul className="divide-y divide-line border border-line">
        {account?.team.map((m) => (
          <li key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>{m.name}</span>
            <span className="text-mist">{m.role}</span>
            <span className="text-mist">{m.section}</span>
            <button
              type="button"
              className="text-rose"
              onClick={() => {
                void (async () => {
                  const next = await api<Account>(`/team/${m.id}`, { method: "DELETE" });
                  setAccount(next);
                })();
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
