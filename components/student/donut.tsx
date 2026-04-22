import { cn } from '@/lib/utils';

interface DonutProps {
  /** 0..100 */
  value: number;
  label?: string;
  sublabel?: string;
  size?: number;
  stroke?: number;
  className?: string;
  /** CSS color for the progress arc (e.g. 'var(--chart-1)') */
  color?: string;
  /** Opacity 0..1 for the track (same color as progress, dimmed) */
  trackOpacity?: number;
}

export function Donut({
  value,
  label,
  sublabel,
  size = 140,
  stroke = 14,
  className,
  color = 'hsl(var(--primary))',
  trackOpacity = 0.12,
}: DonutProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          stroke={color}
          strokeOpacity={trackOpacity}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {label && <span className="text-lg font-bold leading-none">{label}</span>}
        {sublabel && <span className="text-[10px] text-muted-foreground mt-0.5">{sublabel}</span>}
      </div>
    </div>
  );
}
