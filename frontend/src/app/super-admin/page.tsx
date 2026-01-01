"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { DashboardLayout } from "@/components/layouts/DashboardLayout"
import { SuperAdminAnalytics } from "@/components/super-admin/SuperAdminAnalytics"
import { CompaniesListEnhanced } from "@/components/super-admin/CompaniesListEnhanced"
import { BillingDashboard } from "@/components/super-admin/BillingDashboard"
import { AuditTrailDashboard } from "@/components/super-admin/AuditTrailDashboard"
import { EmergencyControlPanel } from "@/components/super-admin/EmergencyControlPanel"
import { ComplianceReportGenerator } from "@/components/super-admin/ComplianceReportGenerator"
import { SuperAdminSettingsPage } from "@/components/super-admin/SuperAdminSettingsPage"

function SuperAdminPageContent() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState("analytics")

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab && ["analytics", "companies", "billing", "compliance", "audit", "emergency", "settings"].includes(tab)) {
      setActiveTab(tab)
    } else {
      setActiveTab("analytics")
    }
  }, [searchParams])

  return (
    <DashboardLayout title="" role="super_admin">
      <div className="animate-in fade-in duration-300">
        {activeTab === "analytics" && <SuperAdminAnalytics />}
        {activeTab === "companies" && <CompaniesListEnhanced />}
        {activeTab === "billing" && <BillingDashboard />}
        {activeTab === "compliance" && <ComplianceReportGenerator />}
        {activeTab === "audit" && <AuditTrailDashboard />}
        {activeTab === "emergency" && <EmergencyControlPanel />}
        {activeTab === "settings" && <SuperAdminSettingsPage />}
      </div>
    </DashboardLayout>
  )
}

export default function SuperAdminPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-center"><h1 className="text-2xl font-bold">Loading...</h1></div></div>}>
      <SuperAdminPageContent />
    </Suspense>
  )
}
