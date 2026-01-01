import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore"
import { db } from "./firebase"

export const superAdminService = {
  async isSuperAdmin(uid: string): Promise<boolean> {
    const docRef = doc(db, "admins", uid)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return false

    const data = docSnap.data()
    return data?.role === "super_admin"
  },

  async getSuperAdminProfile(uid: string) {
    const docRef = doc(db, "admins", uid)
    const docSnap = await getDoc(docRef)
    return docSnap.exists() ? docSnap.data() : null
  },

  async listAllSuperAdmins() {
    const q = query(collection(db, "admins"), where("role", "==", "super_admin"))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  },
}

export const companyAdminService = {
  async getCompanyAdmins(companyId: string) {
    const q = query(collection(db, "companies", companyId, "admins"), where("role", "==", "company_admin"))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  },

  async getPrimaryAdmin(companyId: string) {
    const q = query(collection(db, "companies", companyId, "admins"), where("isPrimary", "==", true))
    const snapshot = await getDocs(q)
    return snapshot.empty ? null : snapshot.docs[0].data()
  },

  async canManageCompany(uid: string, companyId: string): Promise<boolean> {
    const docRef = doc(db, "companies", companyId, "admins", uid)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      // Check if super admin
      return await superAdminService.isSuperAdmin(uid)
    }

    const data = docSnap.data()
    return data?.role === "company_admin" && data?.status === "active"
  },
}

export const roleService = {
  canAccessSuperAdmin(role: string): boolean {
    return role === "super_admin"
  },

  canAccessCompanyAdmin(role: string): boolean {
    return role === "super_admin" || role === "company_admin"
  },

  canAccessUserDashboard(role: string): boolean {
    return role === "user"
  },

  requiresCompanyId(role: string): boolean {
    return role !== "super_admin"
  },

  hasPermission(role: string, permission: string): boolean {
    const permissions: Record<string, string[]> = {
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

    return (permissions[role] || []).includes(permission)
  },
}
