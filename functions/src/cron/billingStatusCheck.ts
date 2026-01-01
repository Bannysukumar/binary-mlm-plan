import * as admin from "firebase-admin"
import { incomeDistributionService } from "../services/incomeDistributionService"

/**
 * Cloud Function to check billing status and pause/resume income distribution
 * Runs daily to ensure income is only distributed to companies with active subscriptions
 */

export async function checkBillingStatusAndUpdateIncome() {
  try {
    console.log("[v0] Starting billing status check for income distribution")

    const companiesSnapshot = await admin.firestore().collection("companies").where("status", "==", "active").get()

    const updates = {
      paused: 0,
      resumed: 0,
      errors: 0,
    }

    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id

      try {
        // Get active subscription
        const subQuery = admin
          .firestore()
          .collection(`companies/${companyId}/subscriptions`)
          .where("status", "in", ["active", "trial"])
          .limit(1)

        const subSnapshot = await subQuery.get()
        const hasActiveSubscription = !subSnapshot.empty

        // Get current distribution state
        const distributionRef = admin
          .firestore()
          .collection(`companies/${companyId}/settings`)
          .doc("incomeDistribution")
        const distributionSnap = await distributionRef.get()
        const distributionData = distributionSnap.exists() ? distributionSnap.data() : null
        const currentlyPaused = distributionData?.isPaused === true

        // Update state if needed
        if (!hasActiveSubscription && !currentlyPaused) {
          // No subscription but distribution is active -> pause it
          await incomeDistributionService.pauseDistribution(companyId, "Subscription inactive - auto paused")
          updates.paused++
          console.log(`[v0] Paused income for company ${companyId} - no active subscription`)
        } else if (hasActiveSubscription && currentlyPaused) {
          // Has subscription but distribution is paused -> resume it
          await incomeDistributionService.resumeDistribution(companyId)
          updates.resumed++
          console.log(`[v0] Resumed income for company ${companyId} - subscription active`)
        }
      } catch (error) {
        updates.errors++
        console.error(`[v0] Error processing company ${companyId}:`, error)
      }
    }

    console.log(
      `[v0] Billing check completed: ${updates.paused} paused, ${updates.resumed} resumed, ${updates.errors} errors`,
    )
    return { success: true, ...updates }
  } catch (error) {
    console.error("[v0] Billing status check failed:", error)
    throw error
  }
}
