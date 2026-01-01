import type React from "react"

interface ModernCardProps {
  children: React.ReactNode
  className?: string
  elevated?: boolean
  large?: boolean
}

export function ModernCard({ children, className = "", elevated = false, large = false }: ModernCardProps) {
  const baseClass = large ? "card-modern-lg" : elevated ? "card-modern-elevated" : "card-modern"
  return <div className={`${baseClass} ${className}`}>{children}</div>
}

interface CardHeaderProps {
  title?: string
  subtitle?: string
  action?: React.ReactNode
  children?: React.ReactNode
}

export function CardHeader({ title, subtitle, action, children }: CardHeaderProps) {
  return (
    <div className="card-header">
      <div>
        {title && <h3 className="text-lg font-semibold text-foreground">{title}</h3>}
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action && <div className="ml-auto">{action}</div>}
      {children}
    </div>
  )
}

interface CardBodyProps {
  children: React.ReactNode
  className?: string
}

export function CardBody({ children, className = "" }: CardBodyProps) {
  return <div className={`card-body ${className}`}>{children}</div>
}

interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return <div className={`card-footer ${className}`}>{children}</div>
}
