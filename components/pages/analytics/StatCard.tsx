export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border-light bg-surface p-4">
      <div className="text-sm text-text-tertiary">{label}</div>
      <div className="mt-1 truncate text-2xl font-semibold text-text-primary tabular-nums">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-text-tertiary">{hint}</div>}
    </div>
  );
}
