interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  barClassName?: string
  height?: string
}

export function ProgressBar({
  value,
  max = 100,
  className = '',
  barClassName = 'bg-accent',
  height = 'h-2',
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0

  return (
    <div className={`overflow-hidden rounded-full bg-surface-muted ${height} ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${barClassName}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
