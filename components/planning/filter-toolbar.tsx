export function FilterToolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border flex-wrap flex-shrink-0">
      {children}
    </div>
  );
}
