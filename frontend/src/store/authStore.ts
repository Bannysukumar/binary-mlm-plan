import { create } from "zustand"
import type { AuthUser } from "@/lib/auth"
import { getCurrentUser } from "@/lib/auth"
import type { UserRole } from "@/shared/types"

interface AuthState {
  user: AuthUser | null
  loading: boolean
  error: string | null
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  initialize: () => Promise<void>
  hasRole: (role: UserRole | UserRole[]) => boolean
  hasPermission: (permission: string) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  error: null,

  setUser: (user) => set({ user }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  initialize: async () => {
    set({ loading: true, error: null })
    try {
      const user = await getCurrentUser()
      set({ user, loading: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to initialize auth"
      set({ user: null, loading: false, error: errorMessage })
    }
  },

  hasRole: (role) => {
    const { user } = get()
    if (!user) return false
    const roles = Array.isArray(role) ? role : [role]
    return roles.includes(user.role)
  },

  hasPermission: (permission) => {
    const { user } = get()
    if (!user) return false

    const rolePermissions: Record<UserRole, string[]> = {
      super_admin: [
        "manage_companies",
        "manage_admins",
        "manage_users",
        "manage_mlm_config",
        "view_analytics",
        "manage_withdrawals",
      ],
      company_admin: [
        "manage_users",
        "manage_mlm_config",
        "view_analytics",
        "manage_withdrawals",
        "manage_announcements",
        "manage_audit_logs",
      ],
      user: ["view_profile", "view_wallet", "request_withdrawal", "view_team"],
    }

    return (rolePermissions[user.role] || []).includes(permission)
  },
}))
