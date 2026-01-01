import * as functions from "firebase-functions"
import * as admin from "firebase-admin"

admin.initializeApp()

// Import function modules
import { onUserCreate } from "./triggers/userTriggers"
import { onIncomeTransactionCreate } from "./triggers/incomeTriggers"
import { onUserPackageUpdate } from "./triggers/purchaseTriggers"
import { calculateBinaryIncome } from "./income/binaryIncome"
import { calculateDirectIncome } from "./income/directIncome"
import { calculateSponsorMatching } from "./income/sponsorMatching"
import { calculateRepurchaseIncome } from "./income/repurchaseIncome"
import { updateBinaryTree } from "./binary/binaryTree"
import { processWithdrawals } from "./withdrawals/withdrawalProcessor"
import { evaluateRanks } from "./ranks/rankEvaluator"
import { runDailyPairMatching } from "./cron/dailyPairMatching"
import { runFailureRecovery } from "./cron/failureRecovery"
import { IdempotencyManager } from "./utils/idempotency"
import { checkBillingStatusAndUpdateIncome } from "./cron/billingStatusCheck"

// User triggers
export const userCreated = functions.firestore.document("companies/{companyId}/users/{userId}").onCreate(onUserCreate)

// Purchase/Repurchase trigger - automatically calculate income when packageBV changes
export const userPackageUpdated = functions.firestore
  .document("companies/{companyId}/users/{userId}")
  .onUpdate(onUserPackageUpdate)

// Income calculation functions
export const calculateIncome = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated")
  }

  const { companyId, userId, incomeType } = data

  switch (incomeType) {
    case "direct":
      return await calculateDirectIncome(companyId, userId)
    case "binary_matching":
      return await calculateBinaryIncome(companyId, userId)
    case "sponsor_matching":
      return await calculateSponsorMatching(companyId, userId)
    case "repurchase":
      // Note: calculateRepurchaseIncome requires repurchaseBV parameter
      // This callable function should be called with repurchaseBV in data
      const repurchaseBV = data.repurchaseBV || 0
      return await calculateRepurchaseIncome(companyId, userId, repurchaseBV)
    default:
      throw new functions.https.HttpsError("invalid-argument", "Invalid income type")
  }
})

// Binary tree update
export const updateBinaryTreeStructure = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated")
  }

  const { companyId, userId } = data
  return await updateBinaryTree(companyId, userId)
})

// Scheduled functions
export const dailyBinaryMatching = functions.pubsub
  .schedule("0 0 * * *") // Daily at midnight UTC
  .timeZone("UTC")
  .onRun(async (context) => {
    try {
      await runDailyPairMatching()
      return { success: true }
    } catch (error) {
      console.error("[v0] Daily binary matching failed:", error)
      throw error
    }
  })

export const failureRecoveryJob = functions.pubsub
  .schedule("0 */4 * * *") // Every 4 hours
  .timeZone("UTC")
  .onRun(async (context) => {
    try {
      await runFailureRecovery()
      return { success: true }
    } catch (error) {
      console.error("[v0] Failure recovery job failed:", error)
      throw error
    }
  })

export const billingStatusCheck = functions.pubsub
  .schedule("0 2 * * *") // Daily at 2 AM UTC
  .timeZone("UTC")
  .onRun(async (context) => {
    try {
      const result = await checkBillingStatusAndUpdateIncome()
      return result
    } catch (error) {
      console.error("[v0] Billing status check failed:", error)
      throw error
    }
  })

export const dailyLockCleanup = functions.pubsub
  .schedule("0 3 * * *") // Daily at 3 AM UTC
  .timeZone("UTC")
  .onRun(async (context) => {
    try {
      await IdempotencyManager.cleanupStaleLocks()
      return { success: true }
    } catch (error) {
      console.error("[v0] Lock cleanup failed:", error)
      throw error
    }
  })

export const processPendingWithdrawals = functions.pubsub
  .schedule("0 9 * * *") // Daily at 9 AM UTC
  .timeZone("UTC")
  .onRun(async (context) => {
    return await processWithdrawals()
  })

export const evaluateUserRanks = functions.pubsub
  .schedule("0 1 * * *") // Daily at 1 AM UTC
  .timeZone("UTC")
  .onRun(async (context) => {
    return await evaluateRanks()
  })

// Income transaction trigger
export const incomeTransactionCreated = functions.firestore
  .document("companies/{companyId}/incomeTransactions/{transactionId}")
  .onCreate(onIncomeTransactionCreate)
