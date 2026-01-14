export function NovaLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 300"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#00d4ff', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#0066ff', stopOpacity: 1 }} />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.3" />
        </filter>
      </defs>
      <circle cx="150" cy="150" r="120" fill="url(#blueGradient)" filter="url(#shadow)" />
      <rect x="105" y="110" width="90" height="80" rx="15" fill="white" filter="url(#shadow)" />
      <line x1="150" y1="110" x2="150" y2="95" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <circle cx="150" cy="90" r="5" fill="#ffd700" />
      <circle cx="130" cy="140" r="10" fill="url(#blueGradient)" />
      <circle cx="170" cy="140" r="10" fill="url(#blueGradient)" />
      <circle cx="133" cy="137" r="4" fill="white" />
      <circle cx="173" cy="137" r="4" fill="white" />
      <path
        d="M 130 165 Q 150 175 170 165"
        fill="none"
        stroke="url(#blueGradient)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="80" cy="80" r="4" fill="white" opacity="0.6" />
      <circle cx="220" cy="100" r="3" fill="white" opacity="0.5" />
      <circle cx="90" cy="220" r="5" fill="white" opacity="0.7" />
      <circle cx="210" cy="200" r="4" fill="white" opacity="0.6" />
      <rect x="200" y="220" width="60" height="35" rx="17.5" fill="#ffd700" filter="url(#shadow)" />
      <text
        x="230"
        y="245"
        fontFamily="Arial, sans-serif"
        fontSize="24"
        fontWeight="bold"
        fill="#0066ff"
        textAnchor="middle"
      >
        01
      </text>
    </svg>
  );
}
