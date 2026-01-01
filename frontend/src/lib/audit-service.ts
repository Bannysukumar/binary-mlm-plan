import { collection, doc, getDocs, setDoc, query, where, orderBy, limit, Timestamp } from "firebase/firestore"
import { db } from "./firebase"

export interface AuditLogEntry {
  id: string
  companyId: string
  adminId: string
  adminEmail: string
  action: string
  actionCategory: "user_management" | "income" | "withdrawal" | "billing" | "compliance" | "emergency" | "system"
  severity: "info" | "warning" | "critical"
  targetType?: "user" | "company" | "withdrawal" | "subscription" | "transaction"
  targetId?: string
  targetName?: string
  changes?: {
    before?: Record<string, any>
    after?: Record<string, any>
  }
  ipAddress?: string
  userAgent?: string
  status: "success" | "failed"
  errorMessage?: string
  metadata?: Record<string, any>
  timestamp: Date
}

export const auditService = {
  async log(log: Omit<AuditLogEntry, "id" | "timestamp">) {
    const docRef = doc(collection(db, "globalAuditLogs"))
    await setDoc(docRef, {
      ...log,
      timestamp: Timestamp.now(),
    })

    // Also log to company-specific collection for faster queries
    if (log.companyId) {
      const companyLogRef = doc(collection(db, "companies", log.companyId, "auditLogs"))
      await setDoc(companyLogRef, {
        ...log,
        timestamp: Timestamp.now(),
      })
    }

    return docRef.id
  },

  async getGlobalLogs(filters?: any, limitCount = 100) {
    let q = query(collection(db, "globalAuditLogs"), orderBy("timestamp", "desc"), limit(limitCount))

    if (filters?.adminId) {
      q = query(
        collection(db, "globalAuditLogs"),
        where("adminId", "==", filters.adminId),
        orderBy("timestamp", "desc"),
        limit(limitCount),
      )
    }

    if (filters?.actionCategory) {
      q = query(
        collection(db, "globalAuditLogs"),
        where("actionCategory", "==", filters.actionCategory),
        orderBy("timestamp", "desc"),
        limit(limitCount),
      )
    }

    if (filters?.severity) {
      q = query(
        collection(db, "globalAuditLogs"),
        where("severity", "==", filters.severity),
        orderBy("timestamp", "desc"),
        limit(limitCount),
      )
    }

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AuditLogEntry)
  },

  async getCompanyLogs(companyId: string, filters?: any, limitCount = 100) {
    let q = query(collection(db, "companies", companyId, "auditLogs"), orderBy("timestamp", "desc"), limit(limitCount))

    if (filters?.adminId) {
      q = query(
        collection(db, "companies", companyId, "auditLogs"),
        where("adminId", "==", filters.adminId),
        orderBy("timestamp", "desc"),
        limit(limitCount),
      )
    }

    if (filters?.actionCategory) {
      q = query(
        collection(db, "companies", companyId, "auditLogs"),
        where("actionCategory", "==", filters.actionCategory),
        orderBy("timestamp", "desc"),
        limit(limitCount),
      )
    }

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AuditLogEntry)
  },

  async getAdminActivitySummary(adminId: string, daysBack = 30) {
    const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
    const q = query(
      collection(db, "globalAuditLogs"),
      where("adminId", "==", adminId),
      where("timestamp", ">=", Timestamp.fromDate(cutoffDate)),
      orderBy("timestamp", "desc"),
    )

    const snapshot = await getDocs(q)
    const logs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AuditLogEntry)

    // Summarize by category
    const summary: Record<string, number> = {}
    const failures = logs.filter((l) => l.status === "failed").length
    const critical = logs.filter((l) => l.severity === "critical").length

    logs.forEach((log) => {
      summary[log.actionCategory] = (summary[log.actionCategory] || 0) + 1
    })

    return {
      totalActions: logs.length,
      actionsByCategory: summary,
      failures,
      critical,
      logs,
    }
  },

  async getCriticalActions(hoursBack = 24, limitCount = 50) {
    const cutoffDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000)
    const q = query(
      collection(db, "globalAuditLogs"),
      where("severity", "==", "critical"),
      where("timestamp", ">=", Timestamp.fromDate(cutoffDate)),
      orderBy("timestamp", "desc"),
      limit(limitCount),
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AuditLogEntry)
  },

  async getFailedOperations(hoursBack = 24, limitCount = 50) {
    const cutoffDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000)
    const q = query(
      collection(db, "globalAuditLogs"),
      where("status", "==", "failed"),
      where("timestamp", ">=", Timestamp.fromDate(cutoffDate)),
      orderBy("timestamp", "desc"),
      limit(limitCount),
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AuditLogEntry)
  },

  async searchLogs(query_text: string, limitCount = 100) {
    // Simple substring search in action field
    const q = query(collection(db, "globalAuditLogs"), orderBy("timestamp", "desc"), limit(limitCount * 3))

    const snapshot = await getDocs(q)
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as AuditLogEntry)
      .filter((log) => log.action.toLowerCase().includes(query_text.toLowerCase()))
      .slice(0, limitCount)
  },
}

// Utility function for logging common admin actions
export function logAdminAction(
  companyId: string,
  adminId: string,
  adminEmail: string,
  action: string,
  category: string,
  severity: "info" | "warning" | "critical",
  options?: {
    targetType?: string
    targetId?: string
    targetName?: string
    before?: Record<string, any>
    after?: Record<string, any>
    ipAddress?: string
    userAgent?: string
  },
) {
  return auditService.log({
    companyId,
    adminId,
    adminEmail,
    action,
    actionCategory: category as any,
    severity,
    targetType: options?.targetType as any,
    targetId: options?.targetId,
    targetName: options?.targetName,
    changes: options?.before || options?.after ? { before: options.before, after: options.after } : undefined,
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
    status: "success",
  })
}
