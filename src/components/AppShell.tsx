import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Logo } from "./Logo";
import { useFloor } from "../state/FloorContext";
import { useAuth } from "../state/AuthContext";
import { formatClock, money } from "../lib/format";
import { RESTAURANT } from "../data/hearth";

const NAV = [
  { to: "/app/live", label: "Live" },
  { to: "/app", label: "Floor", end: true },
  { to: "/app/staff", label: "Handheld" },
  { to: "/app/labor", label: "Labour" },
  { to: "/app/revenue", label: "Revenue" },
  { to: "/app/cameras", label: "Cameras" },
];

export function AppShell() {
  const { now, recoveredTonight, toasts, dismissToast, alerts, liveMode } = useFloor();
  const { account } = useAuth();
  const loc = useLocation();
  const crit = alerts.filter((a) => a.severity === "crit" && a.kind !== "held").length;
  const house = account?.restaurant?.name || RESTAURANT.name;
  const city = account?.restaurant?.city || RESTAURANT.room;

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="sticky top-0 z-40 border-b border-line bg-ink">
        <div className="mx-auto flex max-w-[1440px] items-center gap-5 px-4 py-2.5">
          <a href="/" className="shrink-0">
            <Logo size={18} />
          </a>
          <p className="hidden text-[12px] text-mist sm:block">
            {house}, {city}
            {liveMode ? " · live cam" : ""}
          </p>
          <nav className="ml-auto flex items-center gap-0 overflow-x-auto text-[13px]">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `border-b-2 px-3 py-2 ${
                    isActive ? "border-cyan text-paper" : "border-transparent text-mist hover:text-paper"
                  }`
                }
              >
                {n.label}
                {(n.to === "/app" || n.to === "/app/live") && crit > 0 && loc.pathname !== n.to ? (
                  <span className="ml-1.5 bg-rose px-1 font-mono text-[10px] text-paper">{crit}</span>
                ) : null}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-4 border-l border-line pl-4 md:flex">
            <p className="font-mono text-[12px] text-mist">{formatClock(new Date(now))}</p>
            <p className="font-mono text-[12px]">{money(recoveredTonight)}</p>
            <NavLink to="/app/settings" className="text-[12px] text-mist hover:text-paper">
              Account
            </NavLink>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-5">
        <Outlet />
      </main>

      <div className="fixed bottom-4 right-4 z-50 flex w-72 flex-col gap-2">
        {toasts.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => dismissToast(t.id)}
            className="border border-line bg-ink-3 px-3 py-2 text-left"
          >
            <p className="text-[13px] font-medium">{t.title}</p>
            <p className="mt-0.5 text-[12px] text-mist">{t.body}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
