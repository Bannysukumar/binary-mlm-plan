import type React from "react"
import { TrendingUp, TrendingDown } from "lucide-react"

interface StatBoxProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  change?: number
  changeLabel?: string
  trend?: "up" | "down"
  className?: string
}

export function StatBox({ label, value, icon, change, changeLabel, trend, className = "" }: StatBoxProps) {
  return (
    <div className={`stat-box ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="stat-label">{label}</p>
          <p className="stat-value">{value}</p>
          {(change !== undefined || changeLabel) && (
            <div className={`stat-change ${trend === "up" ? "stat-change-positive" : "stat-change-negative"}`}>
              {trend === "up" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>
                {change !== undefined && `${Math.abs(change)}% `}
                {changeLabel && changeLabel}
              </span>
            </div>
          )}
        </div>
        {icon && <div className="flex-shrink-0">{icon}</div>}
      </div>
    </div>
  )
}
