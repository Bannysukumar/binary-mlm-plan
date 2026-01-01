"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layouts/DashboardLayout"
import { useAuthStore } from "@/store/authStore"
import { ProfilePage } from "@/components/user/ProfilePage"
import { TeamDashboard } from "@/components/user/TeamDashboard"
import { WalletDashboard } from "@/components/user/WalletDashboard"
import { WithdrawalRequestForm } from "@/components/user/WithdrawalRequestForm"
import { SettingsPage } from "@/components/user/SettingsPage"
import { User, Users, Wallet } from "lucide-react"

// Dashboard Overview Component
function DashboardOverview() {
  const { user } = useAuthStore()
  const [wallet, setWallet] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.companyId && user?.uid) {
      loadWalletData()
    }
  }, [user?.companyId, user?.uid])

  const loadWalletData = async () => {
    try {
      setLoading(true)
      if (!user?.companyId || !user?.uid) return
      const { walletService } = await import("@/lib/firebase-services")
      const walletData = await walletService.getOrCreate(user.companyId, user.uid)
      setWallet(walletData)
    } catch (error) {
      console.error("[v0] Error loading wallet data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Available Balance</h3>
          <p className="text-3xl font-bold text-green-600">
            ${wallet?.availableBalance?.toFixed(2) || "0.00"}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Locked Balance</h3>
          <p className="text-3xl font-bold text-yellow-600">
            ${wallet?.lockedBalance?.toFixed(2) || "0.00"}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Earned</h3>
          <p className="text-3xl font-bold text-blue-600">
            ${wallet?.totalEarned?.toFixed(2) || "0.00"}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Withdrawn</h3>
          <p className="text-3xl font-bold text-purple-600">
            ${wallet?.totalWithdrawn?.toFixed(2) || "0.00"}
          </p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <h3 className="text-lg font-bold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => window.location.href = "/user?tab=wallet"}
            className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-left"
          >
            <Wallet className="mb-2 text-primary" size={24} />
            <h4 className="font-semibold text-foreground">View Wallet</h4>
            <p className="text-sm text-muted-foreground">Check your balance and transactions</p>
          </button>
          <button
            onClick={() => window.location.href = "/user?tab=team"}
            className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-left"
          >
            <Users className="mb-2 text-primary" size={24} />
            <h4 className="font-semibold text-foreground">View Team</h4>
            <p className="text-sm text-muted-foreground">Manage your network and downline</p>
          </button>
          <button
            onClick={() => window.location.href = "/user?tab=profile"}
            className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-left"
          >
            <User className="mb-2 text-primary" size={24} />
            <h4 className="font-semibold text-foreground">Edit Profile</h4>
            <p className="text-sm text-muted-foreground">Update your personal information</p>
          </button>
        </div>
      </div>
    </div>
  )
}

function UserPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState("dashboard")

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab && ["dashboard", "profile", "team", "wallet", "withdrawal", "settings"].includes(tab)) {
      setActiveTab(tab)
    } else {
      setActiveTab("dashboard")
    }
  }, [searchParams])

  return (
    <DashboardLayout title="" role="user">
      <div className="animate-in fade-in duration-300">
        {activeTab === "dashboard" && <DashboardOverview />}
        {activeTab === "profile" && <ProfilePage />}
        {activeTab === "team" && <TeamDashboard />}
        {activeTab === "wallet" && <WalletDashboard />}
        {activeTab === "withdrawal" && <WithdrawalRequestForm />}
        {activeTab === "settings" && <SettingsPage />}
      </div>
    </DashboardLayout>
  )
}

export default function UserPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-center"><h1 className="text-2xl font-bold">Loading...</h1></div></div>}>
      <UserPageContent />
    </Suspense>
  )
}
