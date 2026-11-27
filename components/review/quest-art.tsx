"use client";

import type { ThemeId } from "@/lib/review/types";

/** 3D Glossy bevelled star (earned = bright gold with specular facet; empty = carved bronze/stone socket). */
export function Star3D({
  filled,
  size = 22,
  delayMs = 0,
  pop = false,
}: {
  filled: boolean;
  size?: number;
  delayMs?: number;
  pop?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      aria-hidden="true"
      className={pop && filled ? "quest-star-pop" : undefined}
      style={pop && filled ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {/* 3D Extruded Bottom Rim */}
      <path
        d="M18 4.5l4.2 8.5 9.4 1.4-6.8 6.6 1.6 9.3L18 25.9l-8.4 4.4 1.6-9.3-6.8-6.6 9.4-1.4z"
        transform="translate(0, 2.4)"
        fill={filled ? "#b45309" : "#78695e"}
      />
      {/* Main Star Body */}
      <path
        d="M18 3.2l4.3 8.7 9.6 1.4-6.9 6.7 1.6 9.5L18 25l-8.6 4.5 1.6-9.5-6.9-6.7 9.6-1.4z"
        fill={filled ? "#fbbf24" : "#cfc2b4"}
        stroke={filled ? "#92400e" : "#857568"}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Specular Top Highlight */}
      {filled && (
        <path
          d="M18 5.8l3.1 6.4 6.8 1-5 4.8-4.9-2.5-5 2.5-5-4.8 6.9-1z"
          fill="#fef08a"
          opacity="0.72"
        />
      )}
    </svg>
  );
}

export function StarTrio3D({
  stars,
  size = 20,
  pop = false,
}: {
  stars: 0 | 1 | 2 | 3;
  size?: number;
  pop?: boolean;
}) {
  return (
    <span
      className="inline-flex items-end gap-0.5"
      aria-label={`${stars} out of 3 stars`}
    >
      <span className="translate-y-0.5">
        <Star3D filled={stars >= 1} size={size} delayMs={40} pop={pop} />
      </span>
      <span className="-translate-y-0.5">
        <Star3D filled={stars >= 2} size={Math.round(size * 1.16)} delayMs={140} pop={pop} />
      </span>
      <span className="translate-y-0.5">
        <Star3D filled={stars >= 3} size={size} delayMs={240} pop={pop} />
      </span>
    </span>
  );
}

/** Faceted 3D Turquoise Diamond Gem for XP / Mastery HUD (matches top-right of image.png). */
export function Gem3D({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
      <polygon
        points="10,5 26,5 33,14 18,33 3,14"
        fill="#06b6d4"
        stroke="#0e4f63"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <polygon points="10,5 26,5 22,14 14,14" fill="#a5f3fc" />
      <polygon points="3,14 14,14 18,33" fill="#0891b2" />
      <polygon points="22,14 33,14 18,33" fill="#155e75" opacity="0.65" />
      <polygon points="14,14 22,14 18,33" fill="#22d3ee" />
    </svg>
  );
}

/** 3D Treasure Chest for Section Boss Checkpoints (matches bottom chest in image_2.png). */
export function TreasureChest3D({
  state,
  size = 56,
}: {
  state: "locked" | "ready" | "opened";
  size?: number;
}) {
  const muted = state === "locked";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={state === "ready" ? "quest-float-gentle" : undefined}
    >
      {/* Drop Shadow */}
      <ellipse cx="32" cy="57" rx="22" ry="4.5" fill="rgba(0,0,0,0.22)" />

      {/* Base Wooden Box */}
      <rect
        x="10"
        y="30"
        width="44"
        height="24"
        rx="4"
        fill={muted ? "#78716c" : "#9a3412"}
        stroke={muted ? "#44403c" : "#5c1d0c"}
        strokeWidth="2.4"
      />
      {/* Gold Vertical Straps */}
      <rect x="16" y="30" width="6" height="24" fill={muted ? "#a8a29e" : "#fbbf24"} />
      <rect x="42" y="30" width="6" height="24" fill={muted ? "#a8a29e" : "#fbbf24"} />

      {state === "opened" ? (
        <>
          {/* Tilted Open Lid + Overflowing Gold & Cyan Gems! */}
          <path
            d="M10 26 C10 14, 54 14, 54 26 Z"
            transform="translate(0, -6)"
            fill="#7c2d12"
            stroke="#451a03"
            strokeWidth="2.2"
          />
          <circle cx="23" cy="29" r="5" fill="#fde047" stroke="#ca8a04" strokeWidth="1.4" />
          <circle cx="31" cy="27" r="5.5" fill="#facc15" stroke="#ca8a04" strokeWidth="1.4" />
          <circle cx="40" cy="29" r="4.8" fill="#fde047" stroke="#ca8a04" strokeWidth="1.4" />
          <polygon points="28,22 35,22 37,27 31.5,33 26,27" fill="#22d3ee" stroke="#0e7490" strokeWidth="1.2" />
          {/* Sparkles */}
          <circle cx="16" cy="14" r="2.2" fill="#fef08a" />
          <circle cx="49" cy="15" r="2" fill="#fef08a" />
        </>
      ) : (
        <>
          {/* Curved Closed Lid */}
          <path
            d="M9 31 C9 16, 55 16, 55 31 Z"
            fill={muted ? "#8c857f" : "#c2410c"}
            stroke={muted ? "#44403c" : "#5c1d0c"}
            strokeWidth="2.4"
          />
          <path
            d="M16 31 L16 20 L22 19 L22 31 Z M42 31 L42 19 L48 20 L48 31 Z"
            fill={muted ? "#b5afa9" : "#fbbf24"}
          />
          {/* Gold Rim Band */}
          <rect
            x="9"
            y="29"
            width="46"
            height="4.5"
            rx="1.5"
            fill={muted ? "#a8a29e" : "#f59e0b"}
            stroke={muted ? "#44403c" : "#78350f"}
            strokeWidth="1.5"
          />
          {/* Front Keyhole Clasp */}
          <rect
            x="27"
            y="27"
            width="10"
            height="11"
            rx="2.5"
            fill={muted ? "#d6d3d1" : "#fde047"}
            stroke={muted ? "#57534e" : "#92400e"}
            strokeWidth="1.8"
          />
          <circle cx="32" cy="32" r="1.8" fill="#451a03" />
        </>
      )}
    </svg>
  );
}

/**
 * Multi-layered 3D Isometric Floating Island Illustration (inspired directly by image.png).
 * Each chapter theme renders its own distinctive miniature 3D world!
 */
export function IsometricIsland({
  theme,
  locked,
}: {
  theme: ThemeId;
  locked: boolean;
}) {
  return (
    <svg
      viewBox="0 0 180 135"
      className={`h-32 w-40 shrink-0 select-none sm:h-36 sm:w-44 ${
        locked ? "grayscale-[0.65] opacity-80" : "quest-island-bob"
      }`}
      aria-hidden="true"
    >
      {/* Floating Shadow on Parchment */}
      <ellipse
        cx="90"
        cy="124"
        rx="54"
        ry="9"
        fill="rgba(92, 45, 18, 0.2)"
      />

      {/* Common 3D Faceted Cliff Underside */}
      <polygon
        points="22,68 90,114 158,68 136,102 90,118 44,102"
        fill={theme === "frost" ? "#475569" : "#6b3f23"}
      />
      <polygon
        points="22,68 90,94 90,118 44,102"
        fill={theme === "frost" ? "#64748b" : "#854d2b"}
      />
      <polygon
        points="158,68 90,94 90,118 136,102"
        fill={theme === "frost" ? "#334155" : "#522f19"}
      />

      {theme === "meadow" && (
        <>
          {/* Lush Emerald Grass Top Plateau */}
          <polygon
            points="90,34 160,66 90,96 20,66"
            fill="#4ade80"
            stroke="#15803d"
            strokeWidth="2.2"
          />
          <polygon points="90,40 148,66 90,90 32,66" fill="#22c55e" />
          {/* Sparkling Waterfall Pond */}
          <ellipse cx="64" cy="70" rx="20" ry="9" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5" />
          <path d="M56 72 L52 98 L64 103 L66 74 Z" fill="#7dd3fc" opacity="0.88" />
          {/* Cozy Timber Study Cabin */}
          <polygon points="92,42 122,42 122,64 92,64" fill="#fed7aa" stroke="#7c2d12" strokeWidth="1.8" />
          <polygon points="87,44 107,26 127,44" fill="#ea580c" stroke="#7c2d12" strokeWidth="1.8" />
          <rect x="103" y="51" width="8" height="13" rx="1.5" fill="#7c2d12" />
          {/* Lush Round Trees */}
          <rect x="46" y="45" width="4" height="11" fill="#78350f" />
          <circle cx="48" cy="41" r="11" fill="#16a34a" />
          <circle cx="45" cy="38" r="7" fill="#4ade80" />
          <rect x="131" y="54" width="4" height="10" fill="#78350f" />
          <circle cx="133" cy="50" r="9" fill="#15803d" />
        </>
      )}

      {theme === "lagoon" && (
        <>
          {/* Sandy Coral & Turquoise Lagoon Plateau */}
          <polygon
            points="90,34 160,66 90,96 20,66"
            fill="#fde68a"
            stroke="#b45309"
            strokeWidth="2.2"
          />
          <polygon points="90,44 146,66 90,89 48,68" fill="#22d3ee" />
          {/* Stone Binary Archway */}
          <rect x="64" y="34" width="9" height="28" rx="2" fill="#e2e8f0" stroke="#475569" strokeWidth="1.6" />
          <rect x="94" y="34" width="9" height="28" rx="2" fill="#cbd5e1" stroke="#475569" strokeWidth="1.6" />
          <rect x="60" y="28" width="47" height="9" rx="2.5" fill="#f1f5f9" stroke="#475569" strokeWidth="1.6" />
          {/* Glowing Turquoise Crystal Spire */}
          <polygon points="124,26 134,54 114,54" fill="#06b6d4" stroke="#0e7490" strokeWidth="1.5" />
          <polygon points="124,26 129,54 119,54" fill="#a5f3fc" />
          {/* Palm Tree */}
          <path d="M44 64 Q40 46 47 34" stroke="#92400e" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          <path d="M47 34 Q32 32 29 41 M47 34 Q60 30 64 39 M47 34 Q46 21 56 23" stroke="#16a34a" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      )}

      {theme === "frost" && (
        <>
          {/* Snow-Capped Glacier Plateau */}
          <polygon
            points="90,34 160,66 90,96 20,66"
            fill="#e0f2fe"
            stroke="#0284c7"
            strokeWidth="2.2"
          />
          <polygon points="90,40 148,66 90,90 32,66" fill="#f8fafc" />
          {/* Twin Glacier Mountain Peaks */}
          <polygon points="62,58 88,18 114,58" fill="#93c5fd" stroke="#1d4ed8" strokeWidth="1.8" />
          <polygon points="79,32 88,18 97,32 92,36 84,34" fill="#ffffff" />
          <polygon points="96,64 118,30 140,64" fill="#60a5fa" stroke="#1d4ed8" strokeWidth="1.8" />
          <polygon points="111,41 118,30 125,41" fill="#ffffff" />
          {/* Snowy Pine Trees */}
          <polygon points="48,42 36,64 60,64" fill="#0f766e" />
          <polygon points="48,33 39,50 57,50" fill="#14b8a6" />
          <polygon points="48,33 43,42 53,42" fill="#ffffff" />
          {/* Glowing Amber Lantern */}
          <circle cx="88" cy="68" r="5" fill="#fbbf24" stroke="#b45309" strokeWidth="1.4" />
        </>
      )}

      {(theme === "candy" || theme === "desert" || theme === "volcano") && (
        <>
          {/* Warm Amber / Terracotta Workshop Island */}
          <polygon
            points="90,34 160,66 90,96 20,66"
            fill="#fed7aa"
            stroke="#c2410c"
            strokeWidth="2.2"
          />
          <polygon points="90,40 148,66 90,90 32,66" fill="#ffedd5" />
          {/* Workshop Bakery / Coding Studio (inspired by center island in image.png!) */}
          <rect x="66" y="36" width="46" height="28" rx="3" fill="#fde68a" stroke="#9a3412" strokeWidth="1.8" />
          <polygon points="61,38 89,18 117,38" fill="#d94625" stroke="#7c2d12" strokeWidth="1.8" />
          {/* Striped Awning */}
          <rect x="68" y="48" width="22" height="6" rx="1.5" fill="#ef4444" />
          <rect x="73" y="48" width="4" height="6" fill="#ffffff" />
          <rect x="81" y="48" width="4" height="6" fill="#ffffff" />
          {/* Chimney + Beacon */}
          <rect x="100" y="18" width="8" height="14" rx="1.5" fill="#78350f" />
          <circle cx="104" cy="13" r="4" fill="#fef08a" stroke="#f59e0b" strokeWidth="1.4" />
          {/* Warm Trees */}
          <circle cx="46" cy="54" r="10" fill="#f97316" />
          <circle cx="132" cy="58" r="9" fill="#22c55e" />
        </>
      )}

      {/* 3D Iron & Gold Padlock Shield when Locked */}
      {locked && (
        <g transform="translate(72, 38)">
          <rect
            x="4"
            y="16"
            width="28"
            height="22"
            rx="5"
            fill="#44403c"
            stroke="#fafaf9"
            strokeWidth="2"
          />
          <path
            d="M10 16 V10 A8 8 0 0 1 26 10 V16"
            fill="none"
            stroke="#fafaf9"
            strokeWidth="3.2"
          />
          <circle cx="18" cy="26" r="3" fill="#fbbf24" />
        </g>
      )}
    </svg>
  );
}

/** Friendly Companion Mascot inside the Game Arena (reacts to streaks & answers!). */
export function QuestCompanion({
  mood,
}: {
  mood: "ready" | "happy" | "streak" | "coach";
}) {
  const ring =
    mood === "streak"
      ? "border-amber-400 bg-amber-50"
      : mood === "happy"
        ? "border-emerald-400 bg-emerald-50"
        : mood === "coach"
          ? "border-orange-300 bg-orange-50"
          : "border-[#c98a55] bg-[#fff8ea]";

  return (
    <div
      className={`inline-flex items-center gap-2.5 rounded-full border-2 px-3 py-1 shadow-2xs ${ring}`}
    >
      <svg width="28" height="28" viewBox="0 0 40 40" aria-hidden="true">
        {/* Cute Explorer Bot Helmet */}
        <circle cx="20" cy="21" r="15" fill="#ea580c" stroke="#7c2d12" strokeWidth="2" />
        <rect x="9" y="14" width="22" height="13" rx="6" fill="#fef3c7" stroke="#7c2d12" strokeWidth="1.6" />
        {/* Antenna */}
        <line x1="20" y1="6" x2="20" y2="2" stroke="#7c2d12" strokeWidth="2.2" />
        <circle cx="20" cy="2.5" r="2.5" fill={mood === "streak" ? "#fde047" : "#22d3ee"} />
        {/* Expressive Eyes */}
        {mood === "happy" || mood === "streak" ? (
          <>
            <path d="M13 20 Q15.5 17 18 20" stroke="#451a03" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <path d="M22 20 Q24.5 17 27 20" stroke="#451a03" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="15.5" cy="20" r="2.2" fill="#451a03" />
            <circle cx="24.5" cy="20" r="2.2" fill="#451a03" />
          </>
        )}
      </svg>
      <span className="text-xs font-bold text-stone-800">
        {mood === "streak"
          ? "Kombo menyala! Teruskan rentak cemerlang ini!"
          : mood === "happy"
            ? "Tepat sekali! Pemikiran yang mantap!"
            : mood === "coach"
              ? "Percubaan baik! Semak penerangan di bawah — anda pasti boleh."
              : "Baca dengan teliti dan fikir langkah demi langkah!"}
      </span>
    </div>
  );
}

/** Lightweight pure-CSS celebration confetti burst when a checkpoint is cleared! */
export function VictoryConfetti() {
  const pieces = [
    { left: "12%", bg: "#fbbf24", delay: "0ms" },
    { left: "22%", bg: "#22c55e", delay: "70ms" },
    { left: "33%", bg: "#06b6d4", delay: "130ms" },
    { left: "44%", bg: "#f97316", delay: "40ms" },
    { left: "55%", bg: "#eab308", delay: "110ms" },
    { left: "66%", bg: "#10b981", delay: "160ms" },
    { left: "77%", bg: "#ef4444", delay: "60ms" },
    { left: "88%", bg: "#0ea5e9", delay: "95ms" },
  ];
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-44 overflow-hidden"
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="quest-confetti-piece absolute top-0 size-2.5 rounded-xs"
          style={{
            left: p.left,
            backgroundColor: p.bg,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}
