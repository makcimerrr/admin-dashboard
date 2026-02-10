export function EmployeeColorDot({ color, className = '' }: { color: string; className?: string }) {
  return (
    <div
      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${className}`}
      style={{ backgroundColor: color }}
    />
  );
}
