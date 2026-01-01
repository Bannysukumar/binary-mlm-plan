import * as admin from "firebase-admin"
import type { MLMConfig } from "../types"
import { incomeDistributionService } from "../services/incomeDistributionService"

export async function calculateDirectIncome(companyId: string, userId: string): Promise<void> {
  const isPaused = await incomeDistributionService.isPaused(companyId)
  if (isPaused) {
    console.log(`[v0] Income distribution paused for company ${companyId}, skipping user ${userId}`)
    return
  }

  // Get MLM config
  const configDoc = await admin.firestore().collection(`companies/${companyId}/mlmConfig`).doc("main").get()

  if (!configDoc.exists) {
    return
  }

  const config = configDoc.data() as MLMConfig

  if (!config.directIncome.enabled) {
    return
  }

  // Get user data
  const userDoc = await admin.firestore().collection(`companies/${companyId}/users`).doc(userId).get()

  if (!userDoc.exists) {
    return
  }

  const userData = userDoc.data()
  if (!userData?.sponsorId) {
    return
  }

  // Get sponsor data
  const sponsorDoc = await admin.firestore().collection(`companies/${companyId}/users`).doc(userData.sponsorId).get()

  if (!sponsorDoc.exists) {
    return
  }

  const sponsorData = sponsorDoc.data()
  const packageBV = userData.packageBV || 0

  // Calculate income
  let incomeAmount = 0
  if (config.directIncome.type === "fixed") {
    incomeAmount = config.directIncome.value
  } else {
    incomeAmount = (packageBV * config.directIncome.value) / 100
  }

  if (incomeAmount <= 0) {
    return
  }

  // Create income transaction
  const transactionRef = admin.firestore().collection(`companies/${companyId}/incomeTransactions`).doc()

  const transactionData = {
    companyId,
    userId: userData.sponsorId,
    incomeType: "direct",
    amount: incomeAmount,
    currency: "USD",
    description: `Direct income from ${userData.firstName} ${userData.lastName}`,
    relatedUserId: userId,
    status: config.directIncome.creditTiming === "instant" ? "credited" : "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }

  await transactionRef.set(transactionData)

  // If delayed, schedule credit
  if (config.directIncome.creditTiming === "delayed" && config.directIncome.delayHours) {
    // Schedule credit after delay hours
    // This would typically use Cloud Tasks or a scheduled function
  }
}
