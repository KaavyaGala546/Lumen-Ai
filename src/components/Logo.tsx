export function Logo({ size = 22, light = false }: { size?: number; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="2" y="2" width="20" height="20" stroke={light ? "#161513" : "#f3efe6"} strokeWidth="1.6" />
        <path d="M8 2v20M16 2v20M2 8h20M2 16h20" stroke={light ? "#161513" : "#d97706"} strokeWidth="1.2" />
      </svg>
      <span className={`text-[15px] font-semibold tracking-[0.14em] ${light ? "text-ink" : "text-paper"}`}>LUMEN</span>
    </span>
  );
}
