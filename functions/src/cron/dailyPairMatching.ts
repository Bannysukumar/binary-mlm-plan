import * as admin from "firebase-admin"
import { IdempotencyManager } from "../utils/idempotency"
import { calculateBinaryIncome } from "../income/binaryIncome"

/**
 * Daily Pair Matching Cron Job
 * Runs at 00:00 UTC each day
 * Processes binary pairing and income distribution for all active companies
 */

interface PairingResult {
  companyId: string
  usersProcessed: number
  incomeCreated: number
  errors: Array<{ userId: string; error: string }>
  duration: number
}

export async function runDailyPairMatching() {
  const startTime = Date.now()
  const results: PairingResult[] = []

  try {
    const jobId = `daily-pairing-${new Date().toISOString().split("T")[0]}`

    // Get all active companies
    const companiesSnapshot = await admin.firestore().collection("companies").where("status", "==", "active").get()

    console.log(`[v0] Starting pair matching for ${companiesSnapshot.size} companies`)

    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id

      // Acquire lock for this company
      const lockKey = `${jobId}:${companyId}`
      const canProcess = await IdempotencyManager.acquireLock(lockKey, "daily-pairing", companyId)

      if (!canProcess) {
        console.log(`[v0] Skipping ${companyId} - already being processed`)
        continue
      }

      try {
        const result = await processPairingForCompany(companyId)
        results.push(result)
        await IdempotencyManager.completeLock(lockKey, "daily-pairing", companyId)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        await IdempotencyManager.failLock(lockKey, "daily-pairing", companyId, errorMsg)
        results.push({
          companyId,
          usersProcessed: 0,
          incomeCreated: 0,
          errors: [{ userId: "company", error: errorMsg }],
          duration: Date.now() - startTime,
        })
      }
    }

    // Log summary
    const totalProcessed = results.reduce((sum, r) => sum + r.usersProcessed, 0)
    const totalIncomeCreated = results.reduce((sum, r) => sum + r.incomeCreated, 0)
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)

    console.log(
      `[v0] Pair matching completed: ${totalProcessed} users, ${totalIncomeCreated} transactions, ${totalErrors} errors`,
    )

    // Store execution summary
    await storePairingExecutionSummary({
      date: new Date(),
      companiesProcessed: companiesSnapshot.size,
      totalUsersProcessed: totalProcessed,
      totalIncomeCreated,
      totalErrors,
      duration: Date.now() - startTime,
      results,
    })
  } catch (error) {
    console.error("[v0] Daily pairing job failed:", error)
    throw error
  }
}

async function processPairingForCompany(companyId: string): Promise<PairingResult> {
  const result: PairingResult = {
    companyId,
    usersProcessed: 0,
    incomeCreated: 0,
    errors: [],
    duration: 0,
  }

  const startTime = Date.now()

  try {
    // Get MLM config
    const configDoc = await admin.firestore().collection(`companies/${companyId}/mlmConfig`).doc("main").get()

    if (!configDoc.exists) {
      result.errors.push({ userId: "config", error: "MLM config not found" })
      return result
    }

    const config = configDoc.data()
    if (!config?.binaryPlan?.enabled) {
      console.log(`[v0] Binary plan not enabled for company ${companyId}`)
      return result
    }

    // Get all active users with binary positions
    const usersSnapshot = await admin
      .firestore()
      .collection(`companies/${companyId}/users`)
      .where("status", "==", "active")
      .get()

    console.log(`[v0] Processing ${usersSnapshot.size} active users for company ${companyId}`)

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id

      try {
        // Check if user has enough volume for pairing
        const binaryTreeDoc = await admin
          .firestore()
          .collection(`companies/${companyId}/users/${userId}/binaryTree`)
          .doc("position")
          .get()

        if (!binaryTreeDoc.exists) {
          continue
        }

        const tree = binaryTreeDoc.data()
        const leftVol = tree?.leftVolume || 0
        const rightVol = tree?.rightVolume || 0

        // Only process users with volume in both legs
        if (leftVol > 0 && rightVol > 0) {
          await calculateBinaryIncome(companyId, userId)
          result.incomeCreated++
        }

        result.usersProcessed++
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        result.errors.push({ userId, error: errorMsg })
        console.error(`[v0] Error processing user ${userId}:`, error)
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    result.errors.push({ userId: "batch", error: errorMsg })
  }

  result.duration = Date.now() - startTime
  return result
}

async function storePairingExecutionSummary(summary: any) {
  const docRef = admin.firestore().collection("cronExecutionLogs").doc()
  await docRef.set({
    jobType: "daily-pairing",
    executedAt: admin.firestore.FieldValue.serverTimestamp(),
    ...summary,
  })
}
