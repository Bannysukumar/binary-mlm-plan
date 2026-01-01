import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore"
import { db } from "./firebase"
import type { EmergencyControl, EmergencyEvent, GlobalIncomeRollback } from "@/shared/emergency-types"

export const emergencyControlService = {
  /**
   * Activate a global emergency control
   * Used by Super Admin for platform-wide emergencies
   */
  async activate(control: Omit<EmergencyControl, "id" | "createdAt">) {
    const docRef = doc(collection(db, "emergencyControls"))
    await setDoc(docRef, {
      ...control,
      isActive: true,
      activatedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    })

    // Log event
    await emergencyEventService.log(docRef.id, {
      emergencyControlId: docRef.id,
      eventType: "activated",
      severity: control.priority === "critical" ? "critical" : "warning",
      details: control,
    })

    return docRef.id
  },

  /**
   * Deactivate an emergency control
   */
  async deactivate(controlId: string, deactivatedBy: string) {
    const docRef = doc(db, "emergencyControls", controlId)
    await updateDoc(docRef, {
      isActive: false,
      deactivatedAt: Timestamp.now(),
    })

    // Log event
    await emergencyEventService.log(controlId, {
      emergencyControlId: controlId,
      eventType: "deactivated",
      severity: "info",
      details: { deactivatedBy },
    })
  },

  /**
   * Get all active emergency controls
   */
  async getActiveControls() {
    const q = query(collection(db, "emergencyControls"), where("isActive", "==", true), orderBy("activatedAt", "desc"))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as EmergencyControl)
  },

  /**
   * Check if a specific control is active
   */
  async isActionActive(action: string, level: string, targetId?: string): Promise<boolean> {
    const constraints = [where("isActive", "==", true), where("action", "==", action), where("level", "==", level)]

    if (targetId && level !== "global") {
      constraints.push(where("targetId", "==", targetId))
    }

    const q = query(collection(db, "emergencyControls"), ...constraints)
    const snapshot = await getDocs(q)
    return !snapshot.empty
  },

  /**
   * Get summary of all active controls
   */
  async getActiveSummary() {
    const controls = await this.getActiveControls()
    const summary = {
      totalActive: controls.length,
      payoutFrozen: controls.filter((c) => c.action === "payout_freeze").length > 0,
      incomePaused: controls.filter((c) => c.action === "income_pause").length > 0,
      usersBlocked: controls.filter((c) => c.action === "user_block").length,
      companiesFrozen: controls.filter((c) => c.action === "company_freeze").length,
      maintenanceActive: controls.filter((c) => c.action === "maintenance_mode").length > 0,
    }
    return summary
  },
}

export const payoutFreezeService = {
  /**
   * Freeze all payouts globally or for a company
   */
  async freeze(companyId?: string, reason = "Admin initiated payout freeze") {
    if (!companyId) {
      // Global freeze
      const docRef = doc(db, "settings", "payoutFreeze")
      await setDoc(docRef, {
        globalFreeze: true,
        freezeReason: reason,
        frozenAt: Timestamp.now(),
        allowManualApprovals: true,
      })

      // Create emergency control
      await emergencyControlService.activate({
        action: "payout_freeze",
        level: "global",
        priority: "critical",
        reason,
        activatedBy: "system",
        isActive: true,
        activatedAt: new Date(),
        rollbackRequired: true,
        affectedEntities: {},
      })
    } else {
      // Company-specific freeze
      const docRef = doc(db, "companies", companyId, "settings", "payoutFreeze")
      await setDoc(docRef, {
        isFrozen: true,
        freezeReason: reason,
        frozenAt: Timestamp.now(),
        allowManualApprovals: true,
      })

      // Create emergency control
      await emergencyControlService.activate({
        action: "payout_freeze",
        level: "company",
        priority: "high",
        targetId: companyId,
        reason,
        activatedBy: "system",
        isActive: true,
        activatedAt: new Date(),
        rollbackRequired: true,
        affectedEntities: { companiesCount: 1 },
      })
    }
  },

  /**
   * Unfreeze payouts
   */
  async unfreeze(companyId?: string) {
    if (!companyId) {
      const docRef = doc(db, "settings", "payoutFreeze")
      await updateDoc(docRef, {
        globalFreeze: false,
        unfrozenAt: Timestamp.now(),
      })
    } else {
      const docRef = doc(db, "companies", companyId, "settings", "payoutFreeze")
      await updateDoc(docRef, {
        isFrozen: false,
        unfrozenAt: Timestamp.now(),
      })
    }
  },

  /**
   * Check if payouts are frozen
   */
  async isFrozen(companyId?: string): Promise<boolean> {
    if (!companyId) {
      const docRef = doc(db, "settings", "payoutFreeze")
      const docSnap = await getDoc(docRef)
      return docSnap.exists() ? docSnap.data().globalFreeze === true : false
    } else {
      const docRef = doc(db, "companies", companyId, "settings", "payoutFreeze")
      const docSnap = await getDoc(docRef)
      return docSnap.exists() ? docSnap.data().isFrozen === true : false
    }
  },
}

export const incomeDistributionService = {
  /**
   * Pause income distribution for a company
   */
  async pauseDistribution(companyId: string, reason: string, resumeAt?: Date) {
    const docRef = doc(db, "companies", companyId, "settings", "incomeDistribution")
    await setDoc(docRef, {
      isPaused: true,
      pauseReason: reason,
      pausedAt: Timestamp.now(),
      resumeAt: resumeAt ? Timestamp.fromDate(resumeAt) : null,
      affectedIncomeTypes: ["all"],
    })

    // Create emergency control
    await emergencyControlService.activate({
      action: "income_pause",
      level: "company",
      priority: "high",
      targetId: companyId,
      reason,
      autoExpireAt: resumeAt,
      activatedBy: "system",
      isActive: true,
      activatedAt: new Date(),
      rollbackRequired: false,
      affectedEntities: { companiesCount: 1 },
    })
  },

  /**
   * Resume income distribution
   */
  async resumeDistribution(companyId: string) {
    const docRef = doc(db, "companies", companyId, "settings", "incomeDistribution")
    await updateDoc(docRef, {
      isPaused: false,
      resumedAt: Timestamp.now(),
    })
  },

  /**
   * Check if distribution is paused
   */
  async isPaused(companyId: string): Promise<boolean> {
    const docRef = doc(db, "companies", companyId, "settings", "incomeDistribution")
    const docSnap = await getDoc(docRef)
    return docSnap.exists() ? docSnap.data().isPaused === true : false
  },
}

export const emergencyEventService = {
  async log(controlId: string, event: Omit<EmergencyEvent, "id" | "timestamp">) {
    const docRef = doc(collection(db, "emergencyEvents"))
    await setDoc(docRef, {
      ...event,
      emergencyControlId: controlId,
      timestamp: Timestamp.now(),
    })
  },

  async getControlHistory(controlId: string) {
    const q = query(
      collection(db, "emergencyEvents"),
      where("emergencyControlId", "==", controlId),
      orderBy("timestamp", "desc"),
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as EmergencyEvent)
  },
}

export const maintenanceModeService = {
  /**
   * Activate maintenance mode
   */
  async activate(companyId: string | null, message: string, estimatedEndTime?: Date) {
    const docRef = doc(collection(db, "maintenanceMode"))
    await setDoc(docRef, {
      companyId,
      isActive: true,
      message,
      maintenanceType: "emergency",
      startTime: Timestamp.now(),
      estimatedEndTime: estimatedEndTime ? Timestamp.fromDate(estimatedEndTime) : null,
      allowedAdminOnly: true,
      createdBy: "system",
      createdAt: Timestamp.now(),
    })

    return docRef.id
  },

  /**
   * Deactivate maintenance mode
   */
  async deactivate(maintenanceId: string) {
    const docRef = doc(db, "maintenanceMode", maintenanceId)
    await updateDoc(docRef, {
      isActive: false,
      endedAt: Timestamp.now(),
    })
  },

  /**
   * Check if maintenance mode is active
   */
  async isActive(companyId?: string): Promise<boolean> {
    const constraints = [where("isActive", "==", true)]
    if (companyId) {
      constraints.push(where("companyId", "==", companyId))
    }

    const q = query(collection(db, "maintenanceMode"), ...constraints)
    const snapshot = await getDocs(q)
    return !snapshot.empty
  },
}

export const incomeRollbackService = {
  /**
   * Request a global income rollback
   */
  async requestRollback(rollback: Omit<GlobalIncomeRollback, "id" | "requestedAt">) {
    const docRef = doc(collection(db, "incomeRollbacks"))
    await setDoc(docRef, {
      ...rollback,
      status: "pending",
      requestedAt: Timestamp.now(),
    })

    return docRef.id
  },

  /**
   * Approve a rollback request
   */
  async approve(rollbackId: string, approvedBy: string) {
    const docRef = doc(db, "incomeRollbacks", rollbackId)
    await updateDoc(docRef, {
      status: "approved",
      approvedAt: Timestamp.now(),
      approvedBy,
    })
  },

  /**
   * Execute a rollback (should be called by Cloud Function)
   */
  async execute(rollbackId: string) {
    const docRef = doc(db, "incomeRollbacks", rollbackId)
    await updateDoc(docRef, {
      status: "in_progress",
    })
    // Actual rollback logic would be in Cloud Function
  },

  /**
   * Get pending rollback requests
   */
  async getPendingRequests() {
    const q = query(collection(db, "incomeRollbacks"), where("status", "==", "pending"), orderBy("requestedAt", "desc"))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as GlobalIncomeRollback)
  },
}
