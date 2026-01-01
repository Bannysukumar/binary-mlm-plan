import * as admin from "firebase-admin"

/**
 * Service to manage income distribution pause/resume state
 */
export const incomeDistributionService = {
  /**
   * Check if income distribution is paused for a company
   */
  async isPaused(companyId: string): Promise<boolean> {
    try {
      const distributionRef = admin
        .firestore()
        .collection(`companies/${companyId}/settings`)
        .doc("incomeDistribution")
      
      const distributionSnap = await distributionRef.get()
      
      if (!distributionSnap.exists()) {
        return false // Not paused if document doesn't exist
      }
      
      const data = distributionSnap.data()
      return data?.isPaused === true
    } catch (error) {
      console.error(`[v0] Error checking income distribution status for company ${companyId}:`, error)
      return false // Default to not paused on error
    }
  },

  /**
   * Pause income distribution for a company
   */
  async pauseDistribution(companyId: string, reason: string): Promise<void> {
    try {
      const distributionRef = admin
        .firestore()
        .collection(`companies/${companyId}/settings`)
        .doc("incomeDistribution")
      
      await distributionRef.set({
        isPaused: true,
        pausedAt: admin.firestore.FieldValue.serverTimestamp(),
        pausedReason: reason,
        pausedBy: "system",
      }, { merge: true })
      
      console.log(`[v0] Income distribution paused for company ${companyId}: ${reason}`)
    } catch (error) {
      console.error(`[v0] Error pausing income distribution for company ${companyId}:`, error)
      throw error
    }
  },

  /**
   * Resume income distribution for a company
   */
  async resumeDistribution(companyId: string): Promise<void> {
    try {
      const distributionRef = admin
        .firestore()
        .collection(`companies/${companyId}/settings`)
        .doc("incomeDistribution")
      
      await distributionRef.set({
        isPaused: false,
        resumedAt: admin.firestore.FieldValue.serverTimestamp(),
        resumedBy: "system",
      }, { merge: true })
      
      console.log(`[v0] Income distribution resumed for company ${companyId}`)
    } catch (error) {
      console.error(`[v0] Error resuming income distribution for company ${companyId}:`, error)
      throw error
    }
  },
}

