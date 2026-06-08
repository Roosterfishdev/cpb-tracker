import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

interface SectionHeaderProps {
  icon: ReactNode
  title: string
  onClick?: () => void
  subtitle?: string
}

export function SectionHeader({ icon, title, onClick, subtitle }: SectionHeaderProps) {
  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`mb-4 flex w-full items-center gap-3 ${onClick ? 'text-left' : ''}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-xs font-medium text-muted">{subtitle}</p>}
      </div>
      {onClick && <ChevronRight size={20} className="shrink-0 text-muted" />}
    </Wrapper>
  )
}
