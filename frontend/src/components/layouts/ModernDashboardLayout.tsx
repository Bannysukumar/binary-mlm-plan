"use client"

import { type ReactNode, useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { logout } from "@/lib/auth"
import { toast } from "react-hot-toast"
import {
  Menu,
  X,
  LogOut,
  Settings,
  Bell,
  ChevronDown,
  Home,
  BarChart3,
  Users,
  CreditCard,
  Shield,
  Zap,
  Building2,
  FileText,
} from "lucide-react"
import Link from "next/link"
import clsx from "clsx"

interface ModernDashboardLayoutProps {
  children: ReactNode
  title: string
  role: "super_admin" | "company_admin" | "user"
}

const roleNavigation = {
  super_admin: [
    { label: "Analytics", id: "analytics", href: "/super-admin", icon: BarChart3 },
    { label: "Companies", id: "companies", href: "/super-admin?tab=companies", icon: Building2 },
    { label: "Billing", id: "billing", href: "/super-admin?tab=billing", icon: CreditCard },
    { label: "Compliance", id: "compliance", href: "/super-admin?tab=compliance", icon: Shield },
    { label: "Audit Trail", id: "audit", href: "/super-admin?tab=audit", icon: FileText },
    { label: "Emergency", id: "emergency", href: "/super-admin?tab=emergency", icon: Zap },
    { label: "Settings", id: "settings", href: "/super-admin?tab=settings", icon: Settings },
  ],
  company_admin: [
    { label: "Overview", id: "overview", href: "/admin", icon: Home },
    { label: "MLM Config", id: "mlm-config", href: "/admin?tab=mlm-config", icon: Settings },
    { label: "Analytics", id: "analytics", href: "/admin?tab=analytics", icon: BarChart3 },
    { label: "Users", id: "users", href: "/admin?tab=users", icon: Users },
    { label: "Withdrawals", id: "withdrawals", href: "/admin?tab=withdrawals", icon: CreditCard },
    { label: "Announcements", id: "announcements", href: "/admin?tab=announcements", icon: Bell },
    { label: "Audit", id: "audit", href: "/admin?tab=audit", icon: Shield },
    { label: "Settings", id: "settings", href: "/admin?tab=settings", icon: Settings },
  ],
  user: [
    { label: "Dashboard", id: "dashboard", href: "/user", icon: Home },
    { label: "Profile", id: "profile", href: "/user?tab=profile", icon: Users },
    { label: "Wallet", id: "wallet", href: "/user?tab=wallet", icon: CreditCard },
    { label: "Team", id: "team", href: "/user?tab=team", icon: BarChart3 },
    { label: "Settings", id: "settings", href: "/user?tab=settings", icon: Settings },
  ],
}

export function ModernDashboardLayout({ children, title, role }: ModernDashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, hasRole, loading } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    if (!loading && !hasRole(role)) {
      router.push("/login")
    }
  }, [loading, hasRole, role, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!hasRole(role)) {
    return null
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/login")
      toast.success("Logged out successfully")
    } catch (error) {
      toast.error("Logout failed")
    }
  }

  const navigation = roleNavigation[role]
  
  // Determine active tab based on URL
  const getActiveTab = () => {
    if (role === "super_admin" && pathname === "/super-admin") {
      return searchParams.get("tab") || "analytics"
    }
    if (role === "company_admin" && pathname === "/admin") {
      return searchParams.get("tab") || "overview"
    }
    if (role === "user" && pathname === "/user") {
      return searchParams.get("tab") || "dashboard"
    }
    return null
  }
  
  const activeTab = getActiveTab()

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="font-bold text-slate-900">BinaryMLM</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 hover:bg-muted rounded-lg transition-colors"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-border p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = activeTab === item.id || 
                (role === "super_admin" && item.id === "analytics" && !searchParams.get("tab")) ||
                (role === "company_admin" && item.id === "overview" && !searchParams.get("tab"))
              return (
                <Link
                  key={item.id || item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    {
                      "bg-primary text-primary-foreground": isActive,
                      "text-muted-foreground hover:text-primary hover:bg-muted": !isActive,
                    }
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              )
            })}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        )}
      </div>

      <div className="flex h-[calc(100vh-64px)] lg:h-screen">
        {/* Desktop sidebar */}
        <aside
          className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 bg-card border-r border-border transition-transform duration-300 z-50 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-border">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <span className="font-bold text-slate-900 truncate">BinaryMLM</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = activeTab === item.id || 
                (role === "super_admin" && item.id === "analytics" && !searchParams.get("tab")) ||
                (role === "company_admin" && item.id === "overview" && !searchParams.get("tab"))
              return (
                <Link
                  key={item.id || item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                    {
                      "bg-primary text-primary-foreground": isActive,
                      "text-muted-foreground hover:text-primary hover:bg-muted": !isActive,
                    }
                  )}
                >
                  <item.icon size={18} className={isActive ? "" : "group-hover:text-primary"} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* User menu */}
          <div className="p-4 border-t border-border space-y-3">
            <div className="px-4 py-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Logged in as</p>
              <p className="text-sm font-semibold text-foreground truncate">{user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize mt-1">{role.replace("_", " ")}</p>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-slate-600">
                <Settings size={18} />
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-slate-600">
                <Bell size={18} />
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-destructive/10 transition-colors text-destructive"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-64 overflow-auto">
          {/* Top bar */}
          <header className={`hidden lg:flex items-center h-16 px-8 bg-card border-b border-border sticky top-0 z-30 ${title ? 'justify-between' : 'justify-end'}`}>
            {title && (
              <div>
                <h1 className="text-xl font-bold text-foreground">{title}</h1>
              </div>
            )}

            <div className="flex items-center gap-4">
              <button className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors">
                <Bell size={20} />
              </button>

              {/* User dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white text-sm font-semibold">
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown size={16} className="text-muted-foreground" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-lg border border-border overflow-hidden z-40">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-semibold text-foreground">{user?.email}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-1">{role.replace("_", " ")}</p>
                    </div>
                    <button className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-muted transition-colors text-muted-foreground hover:text-primary">
                      <Settings size={16} />
                      Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-destructive/10 transition-colors text-destructive"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
