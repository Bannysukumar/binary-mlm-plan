import * as admin from "firebase-admin"

/**
 * Idempotency lock system to prevent duplicate processing
 * Ensures that cron jobs don't create duplicate income transactions
 */

export interface IdempotencyLock {
  jobId: string
  jobType: string
  companyId: string
  userId?: string
  status: "processing" | "completed" | "failed"
  startedAt: any
  completedAt?: any
  errorMessage?: string
  executionCount: number
  maxRetries: number
}

export class IdempotencyManager {
  private static readonly LOCK_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
  private static readonly LOCK_COLLECTION = "idempotencyLocks"

  /**
   * Acquire a lock for a job
   * Returns null if lock already exists and is not stale
   */
  static async acquireLock(jobId: string, jobType: string, companyId: string, userId?: string): Promise<boolean> {
    const lockKey = this.generateLockKey(jobId, jobType, companyId, userId)
    const docRef = admin.firestore().collection(this.LOCK_COLLECTION).doc(lockKey)

    try {
      const existingLock = await docRef.get()

      if (existingLock.exists) {
        const lock = existingLock.data() as IdempotencyLock
        const lockAge = Date.now() - lock.startedAt.toMillis()

        // If lock is stale (older than timeout), allow retry
        if (lockAge > this.LOCK_TIMEOUT_MS && lock.status === "processing") {
          console.log(`[v0] Stale lock detected for ${jobId}, acquiring new lock`)
          await docRef.update({
            status: "failed",
            errorMessage: "Timeout - new attempt initiated",
          })
        } else if (lock.status === "completed") {
          // Already completed successfully
          console.log(`[v0] Job ${jobId} already completed successfully`)
          return false
        } else if (lock.status === "processing") {
          // Currently being processed
          console.log(`[v0] Job ${jobId} already in progress`)
          return false
        }
      }

      // Create new lock
      await docRef.set({
        jobId,
        jobType,
        companyId,
        userId,
        status: "processing",
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        executionCount: (existingLock.exists && existingLock.data() ? (existingLock.data()!.executionCount || 0) : 0) + 1,
        maxRetries: 3,
      })

      return true
    } catch (error) {
      console.error(`[v0] Failed to acquire lock for ${jobId}:`, error)
      return false
    }
  }

  /**
   * Mark a job as completed
   */
  static async completeLock(jobId: string, jobType: string, companyId: string, userId?: string) {
    const lockKey = this.generateLockKey(jobId, jobType, companyId, userId)
    const docRef = admin.firestore().collection(this.LOCK_COLLECTION).doc(lockKey)

    await docRef.update({
      status: "completed",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  }

  /**
   * Mark a job as failed
   */
  static async failLock(jobId: string, jobType: string, companyId: string, error: string, userId?: string) {
    const lockKey = this.generateLockKey(jobId, jobType, companyId, userId)
    const docRef = admin.firestore().collection(this.LOCK_COLLECTION).doc(lockKey)

    await docRef.update({
      status: "failed",
      errorMessage: error,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  }

  /**
   * Clean up old locks
   */
  static async cleanupStaleLocks() {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
    const query = admin
      .firestore()
      .collection(this.LOCK_COLLECTION)
      .where("completedAt", "<", admin.firestore.Timestamp.fromDate(cutoffTime))

    const snapshot = await query.get()
    const batch = admin.firestore().batch()

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })

    await batch.commit()
    console.log(`[v0] Cleaned up ${snapshot.size} stale locks`)
  }

  private static generateLockKey(jobId: string, jobType: string, companyId: string, userId?: string): string {
    return `${jobType}:${companyId}:${userId || "global"}:${jobId}`
  }
}
