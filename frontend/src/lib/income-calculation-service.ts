import { incomeTransactionService, walletService, userService, binaryTreeService } from "./firebase-services"
import type { MLMConfig } from "@/shared/types"

export const incomeCalculationService = {
  // Calculate direct income
  async calculateDirectIncome(companyId: string, packageValue: number, config: MLMConfig): Promise<number> {
    if (!config.directIncome.enabled) return 0

    const { type, value } = config.directIncome

    if (type === "percentage") {
      return (packageValue * value) / 100
    }

    return value // Fixed amount
  },

  // Calculate matching income (from sponsored users' purchases)
  async calculateMatchingIncome(
    companyId: string,
    userId: string,
    purchaseAmount: number,
    config: MLMConfig,
  ): Promise<Array<{ level: number; amount: number; recipientId: string }>> {
    if (!config.matchingIncome.enabled) return []

    const incomes: Array<{ level: number; amount: number; recipientId: string }> = []

    try {
      // Get sponsor chain
      let currentUserId: string | undefined = userId
      let level = 1

      while (currentUserId && level <= config.matchingIncome.levels) {
        const user = await userService.getById(companyId, currentUserId)
        if (!user || !user.sponsorId) break

        const percentage = config.matchingIncome.percentagePerLevel[level - 1] || 0
        const incomeAmount = (purchaseAmount * percentage) / 100

        incomes.push({
          level,
          amount: incomeAmount,
          recipientId: user.sponsorId,
        })

        currentUserId = user.sponsorId
        level++
      }
    } catch (error) {
      console.error("[v0] Error calculating matching income:", error)
    }

    return incomes
  },

  // Calculate binary income
  async calculateBinaryIncome(companyId: string, userId: string, config: MLMConfig): Promise<number> {
    if (!config.binaryPlan.enabled) return 0

    try {
      const position = await binaryTreeService.getBinaryPosition(companyId, userId)
      if (!position) return 0

      // Calculate pair value
      const leftVolume = position.leftVolume || 0
      const rightVolume = position.rightVolume || 0
      const weakLegVolume = Math.min(leftVolume, rightVolume)

      // Income = weak leg volume * pair value
      const income = weakLegVolume * config.binaryPlan.pairValue

      // Apply capping if configured
      if (config.binaryPlan.dailyCapping && income > config.binaryPlan.dailyCapping) {
        return config.binaryPlan.dailyCapping
      }

      return income
    } catch (error) {
      console.error("[v0] Error calculating binary income:", error)
      return 0
    }
  },

  // Process purchase and distribute income
  async processPurchaseIncome(
    companyId: string,
    userId: string,
    purchaseAmount: number,
    config: MLMConfig,
  ): Promise<void> {
    try {
      const user = await userService.getById(companyId, userId)
      if (!user || user.blockedIncome) return

      // Calculate and credit direct income
      const directIncome = await this.calculateDirectIncome(companyId, purchaseAmount, config)
      if (directIncome > 0) {
        await incomeTransactionService.create(companyId, {
          companyId,
          userId,
          incomeType: "direct",
          amount: directIncome,
          sourceUserId: userId,
          description: `Direct income from purchase of ${purchaseAmount}`,
          status: "credited",
        })

        // Wallet will be updated automatically by Cloud Function trigger on incomeTransaction creation
        // No need to update wallet here - Firestore rules prevent client-side wallet writes
      }

      // Calculate and credit matching income
      const matchingIncomes = await this.calculateMatchingIncome(companyId, userId, purchaseAmount, config)
      for (const income of matchingIncomes) {
        const sponsor = await userService.getById(companyId, income.recipientId)
        if (!sponsor || sponsor.blockedIncome) continue

        await incomeTransactionService.create(companyId, {
          companyId,
          userId: income.recipientId,
          incomeType: "sponsor_matching",
          amount: income.amount,
          sourceUserId: userId,
          description: `Matching income from level ${income.level} purchase`,
          status: "credited",
        })

        // Wallet will be updated automatically by Cloud Function trigger on incomeTransaction creation
        // No need to update wallet here - Firestore rules prevent client-side wallet writes
      }
    } catch (error) {
      console.error("[v0] Error processing purchase income:", error)
      throw error
    }
  },

  // Calculate sponsor matching income
  async calculateSponsorMatchingIncome(
    companyId: string,
    userId: string,
    teamIncome: number,
    config: MLMConfig,
  ): Promise<number> {
    if (!config.sponsorMatching.enabled) return 0

    try {
      // Get user's sponsor
      const user = await userService.getById(companyId, userId)
      if (!user || !user.sponsorId) return 0

      const percentage = config.sponsorMatching.percentagePerLevel[0] || 0
      return (teamIncome * percentage) / 100
    } catch (error) {
      console.error("[v0] Error calculating sponsor matching:", error)
      return 0
    }
  },

  // Calculate repurchase income
  async calculateRepurchaseIncome(
    companyId: string,
    userId: string,
    repurchaseValue: number,
    config: MLMConfig,
  ): Promise<Array<{ recipientId: string; amount: number }>> {
    if (!config.repurchaseIncome.enabled) return []

    if (repurchaseValue < config.repurchaseIncome.repurchaseBV) {
      return []
    }

    const distributions: Array<{ recipientId: string; amount: number }> = []

    try {
      // Get upline
      let currentUserId: string | undefined = userId
      let level = 0

      while (currentUserId && level < config.repurchaseIncome.eligibleUplineDepth) {
        const user = await userService.getById(companyId, currentUserId)
        if (!user || !user.sponsorId) break

        const amount = (repurchaseValue * config.repurchaseIncome.distributionPercentage) / 100

        distributions.push({
          recipientId: user.sponsorId,
          amount,
        })

        currentUserId = user.sponsorId
        level++
      }
    } catch (error) {
      console.error("[v0] Error calculating repurchase income:", error)
    }

    return distributions
  },

  // Process withdrawal with deductions
  async processWithdrawal(
    companyId: string,
    userId: string,
    amount: number,
    settings: any,
  ): Promise<{ finalAmount: number; adminCharges: number; tds: number }> {
    try {
      const adminCharges = settings.adminCharges || 0
      const tds = (amount * (settings.tdsPercentage || 0)) / 100
      const finalAmount = amount - adminCharges - tds

      await walletService.deductBalance(companyId, userId, amount)

      return {
        finalAmount,
        adminCharges,
        tds,
      }
    } catch (error) {
      console.error("[v0] Error processing withdrawal:", error)
      throw error
    }
  },
}
