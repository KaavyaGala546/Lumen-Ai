export function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function formatClock(d: Date) {
  const h = d.getHours();
  const m = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  const am = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${m}:${s} ${am}`;
}

export function formatMmSs(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${pad(s % 60)}`;
}

export function money(n: number, digits = 0) {
  return n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function stateLabel(state: string) {
  switch (state) {
    case "ready":
      return "Ready";
    case "seated":
      return "Just seated";
    case "awaiting":
      return "Needs waiter";
    case "dining":
      return "In service";
    case "check":
      return "Bill down";
    case "lingering":
      return "Lingering";
    case "dirty":
      return "Needs reset";
    case "bussing":
      return "Clearing";
    default:
      return state;
  }
}
