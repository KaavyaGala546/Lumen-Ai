import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "./Logo";

export function AuthLayout({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ink text-paper">
      <div className="mx-auto grid min-h-screen max-w-5xl lg:grid-cols-2">
        <aside className="hidden border-r border-line p-10 lg:flex lg:flex-col lg:justify-between">
          <Link to="/">
            <Logo />
          </Link>
          <div>
            <p className="text-[12px] text-mist">{kicker}</p>
            <p className="mt-3 max-w-sm text-3xl font-semibold tracking-tight">{title}</p>
          </div>
          <p className="text-[12px] text-mist">Demo · gm@aangan.in · AanganFriday1</p>
        </aside>
        <main className="flex flex-col justify-center px-6 py-12 sm:px-12">
          <div className="mb-10 lg:hidden">
            <Link to="/">
              <Logo />
            </Link>
          </div>
          <div className="mx-auto w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-[12px] text-mist">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export const inputClass =
  "w-full border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-cyan";
