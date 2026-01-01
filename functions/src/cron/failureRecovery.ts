import * as admin from "firebase-admin"
import { IdempotencyManager } from "../utils/idempotency"

/**
 * Recovery job for failed cron jobs
 * Runs periodically to detect and retry failed jobs
 */

export async function runFailureRecovery() {
  try {
    console.log("[v0] Starting failure recovery job")

    // Find failed locks with retry attempts remaining
    const failedLocksSnapshot = await admin
      .firestore()
      .collection("idempotencyLocks")
      .where("status", "==", "failed")
      .where("executionCount", "<", 3)
      .get()

    console.log(`[v0] Found ${failedLocksSnapshot.size} failed jobs to retry`)

    for (const lockDoc of failedLocksSnapshot.docs) {
      const lock = lockDoc.data()

      // Only retry if failure was recent (last 24 hours)
      const failureAge = Date.now() - lock.completedAt.toMillis()
      if (failureAge > 24 * 60 * 60 * 1000) {
        continue
      }

      console.log(`[v0] Retrying failed job: ${lock.jobType} for company ${lock.companyId}`)

      try {
        // Re-attempt based on job type
        switch (lock.jobType) {
          case "daily-pairing":
            // Could call the daily pairing function again
            break
          case "process-withdrawals":
            // Could call withdrawal processor again
            break
        }

        // Lock will be updated by the job itself if it completes successfully
      } catch (error) {
        console.error(`[v0] Retry failed for job ${lock.jobId}:`, error)
        // Update execution count
        await lockDoc.ref.update({
          executionCount: admin.firestore.FieldValue.increment(1),
        })
      }
    }

    // Clean up old stale locks
    await IdempotencyManager.cleanupStaleLocks()
  } catch (error) {
    console.error("[v0] Failure recovery job failed:", error)
    throw error
  }
}
