"use client"

import type { ReactNode } from "react"
import { ModernDashboardLayout } from "./ModernDashboardLayout"

interface DashboardLayoutProps {
  children: ReactNode
  title: string
  role: "super_admin" | "company_admin" | "user"
}

export function DashboardLayout({ children, title, role }: DashboardLayoutProps) {
  return <ModernDashboardLayout children={children} title={title} role={role} />
}
