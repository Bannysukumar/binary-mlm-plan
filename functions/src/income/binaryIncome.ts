import * as admin from "firebase-admin"
import type { MLMConfig } from "../types"
import { incomeDistributionService } from "../services/incomeDistributionService"

export async function calculateBinaryIncome(companyId: string, userId: string): Promise<void> {
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

  if (!config.binaryMatching.enabled) {
    return
  }

  // Get user's binary tree
  const treeDoc = await admin
    .firestore()
    .collection(`companies/${companyId}/users/${userId}/binaryTree`)
    .doc("main")
    .get()

  if (!treeDoc.exists) {
    return
  }

  const treeData = treeDoc.data()
  if (!treeData) {
    return
  }

  const leftVolume = treeData.leftVolume || 0
  const rightVolume = treeData.rightVolume || 0

  // Parse pair ratio (e.g., "1:1", "2:1")
  const [leftRatio, rightRatio] = config.binaryMatching.pairRatio.split(":").map(Number)

  // Calculate pairs based on ratio
  let pairs = 0
  if (leftRatio === rightRatio) {
    // 1:1 ratio
    pairs = Math.min(leftVolume, rightVolume)
  } else {
    // Calculate pairs for different ratios
    const leftPairs = Math.floor(leftVolume / leftRatio)
    const rightPairs = Math.floor(rightVolume / rightRatio)
    pairs = Math.min(leftPairs, rightPairs)
  }

  if (pairs <= 0) {
    return
  }

  // Check capping
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let totalIncomeToday = 0
  if (config.binaryMatching.cappingPeriod === "daily") {
    const todayTransactions = await admin
      .firestore()
      .collection(`companies/${companyId}/incomeTransactions`)
      .where("userId", "==", userId)
      .where("incomeType", "==", "binary_matching")
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(today))
      .get()

    totalIncomeToday = todayTransactions.docs.reduce((sum, doc) => {
      return sum + (doc.data().amount || 0)
    }, 0)
  }

  const maxIncome = config.binaryMatching.cappingAmount || Number.POSITIVE_INFINITY
  const remainingCap = maxIncome - totalIncomeToday

  if (remainingCap <= 0) {
    return
  }

  // Calculate income
  const pairIncome = config.binaryMatching.pairIncome
  let incomeAmount = pairs * pairIncome

  if (incomeAmount > remainingCap) {
    incomeAmount = remainingCap
  }

  // Create income transaction
  const transactionRef = admin.firestore().collection(`companies/${companyId}/incomeTransactions`).doc()

  await transactionRef.set({
    companyId,
    userId,
    incomeType: "binary_matching",
    amount: incomeAmount,
    currency: "USD",
    description: `Binary matching income: ${pairs} pairs`,
    pairCount: pairs,
    status: "credited",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    creditedAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  // Flush out if enabled
  if (config.binaryMatching.flushOut) {
    // Reset volumes after pairing
    // This would depend on the flush out logic
  }
}
