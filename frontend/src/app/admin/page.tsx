"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { DashboardLayout } from "@/components/layouts/DashboardLayout"
import { CompanyStatsOverview } from "@/components/admin/CompanyStatsOverview"
import { EnhancedMLMConfigPanel } from "@/components/admin/EnhancedMLMConfigPanel"
import { EnhancedAnalyticsDashboard } from "@/components/admin/EnhancedAnalyticsDashboard"
import { UsersManagement } from "@/components/admin/UsersManagement"
import { WithdrawalsManagement } from "@/components/admin/WithdrawalsManagement"
import { AnnouncementsManagement } from "@/components/admin/AnnouncementsManagement"
import { AuditLogs } from "@/components/admin/AuditLogs"
import { CompanySettingsPage } from "@/components/admin/CompanySettingsPage"
import { PackagesManagement } from "@/components/admin/PackagesManagement"

// Dashboard Overview Component
function DashboardOverview() {
  return (
    <div className="space-y-6">
      <CompanyStatsOverview />
      <EnhancedAnalyticsDashboard />
    </div>
  )
}

function AdminPageContent() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab && ["overview", "mlm-config", "analytics", "users", "withdrawals", "announcements", "audit", "settings", "packages"].includes(tab)) {
      setActiveTab(tab)
    } else {
      setActiveTab("overview")
    }
  }, [searchParams])

  return (
    <DashboardLayout title="" role="company_admin">
      <div className="animate-in fade-in duration-300">
        {activeTab === "overview" && <DashboardOverview />}
        {activeTab === "mlm-config" && <EnhancedMLMConfigPanel />}
        {activeTab === "analytics" && <EnhancedAnalyticsDashboard />}
        {activeTab === "users" && <UsersManagement />}
        {activeTab === "withdrawals" && <WithdrawalsManagement />}
        {activeTab === "announcements" && <AnnouncementsManagement />}
        {activeTab === "audit" && <AuditLogs />}
        {activeTab === "settings" && <CompanySettingsPage />}
        {activeTab === "packages" && <PackagesManagement />}
      </div>
    </DashboardLayout>
  )
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-center"><h1 className="text-2xl font-bold">Loading...</h1></div></div>}>
      <AdminPageContent />
    </Suspense>
  )
}
