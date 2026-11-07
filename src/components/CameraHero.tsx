import { useFloor } from "../state/FloorContext";
import { stateColor } from "./StatusLegend";

const RING = ["1", "2", "3", "4", "6", "8", "B1", "7"];

export function CameraHero() {
  const { tables, now } = useFloor();
  const shown = RING.map((id) => tables.find((t) => t.id === id));

  return (
    <div className="grain relative w-full overflow-hidden rounded-[28px] border border-line bg-[#06101c]">
      <svg viewBox="0 0 520 560" className="block h-auto w-full" role="img" aria-label="Ceiling camera watching a dining room">
        <defs>
          <radialGradient id="room" cx="50%" cy="18%" r="70%">
            <stop offset="0%" stopColor="rgba(140,220,255,0.22)" />
            <stop offset="42%" stopColor="rgba(10,22,36,0)" />
          </radialGradient>
          <linearGradient id="cone" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="rgba(200,240,255,0.32)" />
            <stop offset="55%" stopColor="rgba(106,230,238,0.06)" />
            <stop offset="100%" stopColor="rgba(106,230,238,0)" />
          </linearGradient>
          <linearGradient id="cam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eef4fa" />
            <stop offset="100%" stopColor="#8aa0b8" />
          </linearGradient>
        </defs>

        <rect width="520" height="560" fill="url(#room)" />
        <ellipse cx="260" cy="360" rx="210" ry="150" fill="none" stroke="rgba(106,230,238,0.12)" />
        <ellipse cx="260" cy="360" rx="150" ry="108" fill="none" stroke="rgba(106,230,238,0.12)" />
        <ellipse cx="260" cy="360" rx="90" ry="64" fill="none" stroke="rgba(106,230,238,0.18)" />
        <polygon points="230,118 290,118 470,520 50,520" fill="url(#cone)" />

        <text
          x="260"
          y="36"
          textAnchor="middle"
          fill="#9af3f8"
          fontFamily="Instrument Serif, serif"
          fontStyle="italic"
          fontSize="22"
        >
          The camera that’s already on the ceiling
        </text>

        <rect x="248" y="52" width="24" height="10" rx="5" fill="#c5d4e4" />
        <rect x="214" y="62" width="92" height="44" rx="16" fill="url(#cam)" />
        <ellipse cx="260" cy="84" rx="28" ry="14" fill="#0b1524" stroke="white" strokeOpacity="0.35" />
        <circle cx="260" cy="84" r="4" fill="#6AE6EE" />

        {shown.map((t, i) => {
          if (!t) return null;
          const angle = (i / RING.length) * Math.PI * 2 - Math.PI / 2;
          const cx = 260 + Math.cos(angle) * 150;
          const cy = 360 + Math.sin(angle) * 108;
          const color = stateColor(t.state);
          const elapsed = t.seatedAt ? Math.floor((now - t.seatedAt) / 1000) : 0;
          const tag =
            t.state === "ready"
              ? "Free"
              : t.state === "awaiting"
                ? `${Math.floor(elapsed / 60)}m wait`
                : t.state === "dirty"
                  ? "Reset"
                  : t.state === "lingering"
                    ? "Held"
                    : "Live";
          const heads = t.partySize;
          return (
            <g key={t.id}>
              <circle cx={cx} cy={cy} r="28" fill={color.fill} stroke={color.ring} strokeWidth="1.6" />
              {Array.from({ length: heads }).map((_, p) => {
                const a = (p / Math.max(heads, 1)) * Math.PI * 2 - Math.PI / 2;
                return (
                  <circle
                    key={p}
                    cx={cx + Math.cos(a) * 20}
                    cy={cy + Math.sin(a) * 20}
                    r="3.2"
                    fill="#f2e4c9"
                  />
                );
              })}
              <rect x={cx - 28} y={cy + 32} width="56" height="14" rx="7" fill="rgba(7,11,20,0.75)" />
              <text
                x={cx}
                y={cy + 42}
                textAnchor="middle"
                fill="#e7eef8"
                fontFamily="IBM Plex Mono, monospace"
                fontSize="8"
              >
                {t.label} {tag}
              </text>
            </g>
          );
        })}

        <rect x="218" y="336" width="84" height="48" rx="14" fill="rgba(7,11,20,0.72)" stroke="rgba(255,255,255,0.14)" />
        <text
          x="260"
          y="365"
          textAnchor="middle"
          fill="#e7eef8"
          fontFamily="Instrument Serif, serif"
          fontStyle="italic"
          fontSize="18"
        >
          Lumen
        </text>
      </svg>
    </div>
  );
}
