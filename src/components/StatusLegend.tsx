const ITEMS = [
  { color: "bg-sage", label: "Ready" },
  { color: "bg-cyan", label: "In service" },
  { color: "bg-brass", label: "Needs waiter" },
  { color: "bg-rose", label: "Needs reset" },
  { color: "bg-mist", label: "Lingering · held" },
];

export function StatusLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-mist">
      {ITEMS.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${i.color}`} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export function stateColor(state: string) {
  switch (state) {
    case "ready":
      return { ring: "#65a30d", fill: "rgba(101,163,13,0.16)", text: "text-sage" };
    case "seated":
      return { ring: "#d97706", fill: "rgba(217,119,6,0.14)", text: "text-cyan" };
    case "awaiting":
      return { ring: "#ea580c", fill: "rgba(234,88,12,0.18)", text: "text-brass" };
    case "dining":
      return { ring: "#d97706", fill: "rgba(217,119,6,0.12)", text: "text-cyan" };
    case "check":
      return { ring: "#a8a29e", fill: "rgba(168,162,158,0.14)", text: "text-violet" };
    case "lingering":
      return { ring: "#9c9488", fill: "rgba(156,148,136,0.14)", text: "text-mist" };
    case "dirty":
      return { ring: "#dc2626", fill: "rgba(220,38,38,0.16)", text: "text-rose" };
    case "bussing":
      return { ring: "#dc2626", fill: "rgba(220,38,38,0.1)", text: "text-rose" };
    default:
      return { ring: "#d97706", fill: "rgba(217,119,6,0.1)", text: "text-cyan" };
  }
}
