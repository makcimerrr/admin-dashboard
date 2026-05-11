// Zone01 cross-app icons, inspired from @01normandie/launcher v2.0.0
// Reworked to use our theme's CSS variables (var(--primary)) instead of
// the hardcoded blue from the original.

interface IconProps {
  size?: number;
  className?: string;
}

export function Icon01Deck({ size = 22, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size * (18 / 24)}
      viewBox="0 0 26 20"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect x="0" y="3" width="16" height="11" rx="2" fill="currentColor" fillOpacity="0.25" />
      <rect x="2" y="1.5" width="16" height="11" rx="2" fill="currentColor" fillOpacity="0.45" />
      <rect x="4" y="0" width="16" height="12" rx="2" fill="currentColor" />
      <text
        x="12"
        y="9.5"
        textAnchor="middle"
        fontSize="7"
        fontWeight="900"
        fill="white"
        fontFamily="monospace"
      >
        01
      </text>
    </svg>
  );
}

export function IconEmargement({ size = 22, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect
        x="3"
        y="2"
        width="16"
        height="18"
        rx="2.5"
        fill="currentColor"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="1"
      />
      <line x1="7" y1="8" x2="15" y2="8" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="7" y1="11" x2="13" y2="11" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="15.5" cy="15.5" r="3.5" fill="#10b981" />
      <path d="M13.8 15.5l1.1 1.1 1.9-2" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconIntra({ size = 22, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="4" cy="17" r="2.5" fill="currentColor" opacity="0.4" />
      <circle cx="11" cy="11" r="2.5" fill="currentColor" opacity="0.7" />
      <circle cx="18" cy="5" r="2.5" fill="currentColor" />
      <path d="M6 16L9.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.5" />
      <path d="M13 9.5L16.5 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="18" cy="5" r="1.2" fill="white" />
    </svg>
  );
}

// ─── Admin section icons (same visual language as the Zone01 cross-apps) ────

export function IconDashboard({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true" className={className}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" fill="currentColor" fillOpacity="0.55" />
      <rect x="12" y="3" width="7" height="6" rx="1.5" fill="currentColor" />
      <rect x="3" y="14" width="7" height="5" rx="1.5" fill="currentColor" fillOpacity="0.3" />
      <rect x="12" y="11" width="7" height="8" rx="1.5" fill="currentColor" fillOpacity="0.7" />
      <circle cx="15.5" cy="6" r="0.9" fill="white" />
    </svg>
  );
}

export function IconPedagogie({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true" className={className}>
      {/* Book / base */}
      <path d="M4 12 L11 9 L18 12 L11 15 Z" fill="currentColor" fillOpacity="0.45" />
      {/* Mortarboard top */}
      <path d="M3 9 L11 5.5 L19 9 L11 12.5 Z" fill="currentColor" />
      {/* Tassel */}
      <path d="M17 9 L17 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="17" cy="14.5" r="1.3" fill="#10b981" />
      <circle cx="17" cy="14.5" r="0.5" fill="white" />
    </svg>
  );
}

export function IconPlanning({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true" className={className}>
      <rect x="3" y="4" width="16" height="15" rx="2" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1" />
      <path d="M3 6 Q3 4 5 4 L17 4 Q19 4 19 6 L19 8 L3 8 Z" fill="currentColor" />
      <line x1="7" y1="2.5" x2="7" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15" y1="2.5" x2="15" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="6" y="11" width="3" height="3" rx="0.5" fill="currentColor" fillOpacity="0.45" />
      <rect x="11" y="11" width="5" height="3" rx="0.5" fill="#10b981" />
      <rect x="6" y="15.5" width="6" height="2.2" rx="0.5" fill="currentColor" fillOpacity="0.4" />
    </svg>
  );
}

export function IconOutils({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true" className={className}>
      {/* Cog */}
      <path
        d="M11 3.5 L12.4 4.2 L13.9 3.7 L14.6 5.2 L16.2 5.5 L16.2 7.1 L17.3 8.3 L16.5 9.6 L17 11.1 L15.6 11.9 L15.3 13.4 L13.8 13.6 L12.9 14.9 L11.4 14.4 L10 15 L8.9 13.8 L7.3 13.7 L7 12.1 L5.7 11.3 L6.3 9.8 L5.6 8.4 L6.9 7.5 L7.2 5.9 L8.7 5.7 L9.6 4.4 L11 4.7 Z"
        fill="currentColor"
        fillOpacity="0.55"
      />
      <circle cx="11" cy="9.5" r="2.4" fill="currentColor" />
      <circle cx="11" cy="9.5" r="1" fill="white" />
      {/* Sparkle */}
      <path d="M17 16 L18 18 L17 20 L16 18 Z" fill="currentColor" fillOpacity="0.7" />
      <path d="M14 18 L15 18.5 L14 19 L13.5 18.5 Z" fill="currentColor" fillOpacity="0.5" />
    </svg>
  );
}

export function IconConfig({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true" className={className}>
      {/* Folder back tab */}
      <path d="M3 6.5 Q3 5 4.5 5 L9 5 L11 7 L17.5 7 Q19 7 19 8.5 L19 9 L3 9 Z" fill="currentColor" fillOpacity="0.45" />
      {/* Folder body */}
      <path d="M3 9 L19 9 L19 17 Q19 18.5 17.5 18.5 L4.5 18.5 Q3 18.5 3 17 Z" fill="currentColor" />
      {/* Lines */}
      <rect x="6" y="12" width="10" height="1.2" rx="0.6" fill="white" fillOpacity="0.5" />
      <rect x="6" y="15" width="6" height="1.2" rx="0.6" fill="white" fillOpacity="0.5" />
    </svg>
  );
}

export function IconParametres({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true" className={className}>
      <line x1="4" y1="6" x2="18" y2="6" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="4" y1="11" x2="18" y2="11" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="4" y1="16" x2="18" y2="16" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="14" cy="6" r="2.2" fill="currentColor" />
      <circle cx="8" cy="11" r="2.2" fill="currentColor" />
      <circle cx="15" cy="16" r="2.2" fill="currentColor" />
      <circle cx="14" cy="6" r="0.7" fill="white" />
      <circle cx="8" cy="11" r="0.7" fill="white" />
      <circle cx="15" cy="16" r="0.7" fill="white" />
    </svg>
  );
}

// ─── Utility icons (theme + user menu) — same visual language ───────────────

export function IconSun({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true" className={className}>
      <circle cx="11" cy="11" r="4.2" fill="currentColor" />
      <circle cx="11" cy="11" r="1.6" fill="white" fillOpacity="0.7" />
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <line x1="11" y1="2.5" x2="11" y2="4.5" />
        <line x1="11" y1="17.5" x2="11" y2="19.5" />
        <line x1="2.5" y1="11" x2="4.5" y2="11" />
        <line x1="17.5" y1="11" x2="19.5" y2="11" />
        <line x1="5" y1="5" x2="6.4" y2="6.4" />
        <line x1="15.6" y1="15.6" x2="17" y2="17" />
        <line x1="5" y1="17" x2="6.4" y2="15.6" />
        <line x1="15.6" y1="6.4" x2="17" y2="5" />
      </g>
    </svg>
  );
}

export function IconMoon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true" className={className}>
      <path
        d="M17.5 13.5 A 8 8 0 1 1 8.5 4.5 A 6 6 0 0 0 17.5 13.5 Z"
        fill="currentColor"
        fillOpacity="0.85"
      />
      <circle cx="15" cy="6" r="0.9" fill="currentColor" fillOpacity="0.6" />
      <circle cx="18" cy="9" r="0.6" fill="currentColor" fillOpacity="0.4" />
    </svg>
  );
}

export function IconPalette({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true" className={className}>
      <path
        d="M11 3 C 6 3 2.5 6.5 2.5 11 C 2.5 14.5 5 17.5 8.5 18 C 9.8 18.2 10.5 17 10 16 C 9.5 15 10.5 14 11.5 14 L 14 14 C 17 14 19.5 11.5 19.5 8.5 C 19.5 5.5 16 3 11 3 Z"
        fill="currentColor"
        fillOpacity="0.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.7"
      />
      <circle cx="6.5" cy="9" r="1.4" fill="#3b82f6" />
      <circle cx="10" cy="6.5" r="1.4" fill="#10b981" />
      <circle cx="13.5" cy="7" r="1.4" fill="#f59e0b" />
      <circle cx="15.5" cy="10.5" r="1.4" fill="#ef4444" />
    </svg>
  );
}

export function IconUser({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true" className={className}>
      <circle cx="11" cy="8" r="3.6" fill="currentColor" />
      <path
        d="M3.5 19 C 4 14.5 7.5 12.5 11 12.5 C 14.5 12.5 18 14.5 18.5 19 Z"
        fill="currentColor"
        fillOpacity="0.55"
      />
      <circle cx="11" cy="8" r="1.3" fill="white" fillOpacity="0.4" />
    </svg>
  );
}

export function IconBell({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true" className={className}>
      <path
        d="M5 16 L 5 11 C 5 7.5 7.5 5 11 5 C 14.5 5 17 7.5 17 11 L 17 16 L 18.5 17 L 3.5 17 Z"
        fill="currentColor"
        fillOpacity="0.55"
      />
      <path
        d="M5 11 C 5 7.5 7.5 5 11 5 C 14.5 5 17 7.5 17 11"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M9 18.5 C 9.4 19.6 10.1 20 11 20 C 11.9 20 12.6 19.6 13 18.5 Z"
        fill="currentColor"
      />
      <circle cx="15.5" cy="6.5" r="2" fill="#ef4444" />
      <circle cx="15.5" cy="6.5" r="0.7" fill="white" />
    </svg>
  );
}

export function IconLogout({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true" className={className}>
      <path
        d="M4 4 Q 3 4 3 5 L 3 17 Q 3 18 4 18 L 11 18 L 11 15 L 5 15 L 5 7 L 11 7 L 11 4 Z"
        fill="currentColor"
        fillOpacity="0.55"
      />
      <path
        d="M14 7 L 18 11 L 14 15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line x1="9" y1="11" x2="18" y2="11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconZone01Logo({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect width="18" height="18" rx="3" fill="white" fillOpacity="0.15" />
      <text x="2" y="13" fontFamily="monospace" fontWeight="800" fontSize="10" fill="white">
        01
      </text>
    </svg>
  );
}
