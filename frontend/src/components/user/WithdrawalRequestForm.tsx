"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { withdrawalService, walletService } from "@/lib/firebase-services"
import { useAuthStore } from "@/store/authStore"
import { toast } from "react-hot-toast"

export function WithdrawalRequestForm() {
  const { user } = useAuthStore()
  const [amount, setAmount] = useState("")
  const [bankDetails, setBankDetails] = useState({
    accountName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
  })
  const [loading, setLoading] = useState(false)
  const [availableBalance, setAvailableBalance] = useState(0)
  const [settings, setSettings] = useState<any>(null)

  useEffect(() => {
    if (user?.companyId && user?.uid) {
      loadData()
    }
  }, [user?.companyId, user?.uid])

  const loadData = async () => {
    try {
      if (!user?.companyId || !user?.uid) return

      const wallet = await walletService.getOrCreate(user.companyId, user.uid)
      setAvailableBalance(wallet.availableBalance)

      const withdrawalSettings = await withdrawalService.getSettings(user.companyId)
      setSettings(withdrawalSettings)
    } catch (error) {
      console.error("[v0] Error loading data:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.companyId || !user?.uid) {
      toast.error("User not authenticated")
      return
    }

    try {
      setLoading(true)

      const withdrawalAmount = Number(amount)

      if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
        toast.error("Invalid amount")
        return
      }

      if (withdrawalAmount > availableBalance) {
        toast.error("Insufficient balance")
        return
      }

      if (settings?.minimumWithdrawal && withdrawalAmount < settings.minimumWithdrawal) {
        toast.error(`Minimum withdrawal is ${settings.minimumWithdrawal}`)
        return
      }

      // Create withdrawal request
      const withdrawalId = await withdrawalService.create(user.companyId, {
        companyId: user.companyId,
        userId: user.uid,
        amount: withdrawalAmount,
        requestedAmount: withdrawalAmount,
        adminCharges: settings?.adminCharges || 0,
        tds: (withdrawalAmount * (settings?.tdsPercentage || 0)) / 100,
        status: "pending",
        bankDetails,
      })

      toast.success("Withdrawal request submitted successfully")
      setAmount("")
      setBankDetails({
        accountName: "",
        accountNumber: "",
        ifscCode: "",
        bankName: "",
      })
    } catch (error: any) {
      console.error("[v0] Withdrawal error:", error)
      toast.error(error.message || "Failed to create withdrawal request")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Request Withdrawal</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Available Balance:{" "}
        <span className="font-bold text-green-600 dark:text-green-400">${availableBalance.toFixed(2)}</span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Withdrawal Amount *</label>
          <input
            type="number"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            min="1"
            max={availableBalance}
          />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">Bank Details</h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account Name *</label>
            <input
              type="text"
              required
              value={bankDetails.accountName}
              onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account Number *</label>
              <input
                type="text"
                required
                value={bankDetails.accountNumber}
                onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">IFSC Code *</label>
              <input
                type="text"
                required
                value={bankDetails.ifscCode}
                onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bank Name *</label>
            <input
              type="text"
              required
              value={bankDetails.bankName}
              onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !amount}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
        >
          {loading ? "Processing..." : "Request Withdrawal"}
        </button>
      </form>
    </div>
  )
}
