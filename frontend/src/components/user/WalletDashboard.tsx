"use client"

import { useState, useEffect } from "react"
import { walletService, incomeTransactionService } from "@/lib/firebase-services"
import { useAuthStore } from "@/store/authStore"
import type { IncomeTransaction, Wallet } from "@/shared/types"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"

export function WalletDashboard() {
  const { user } = useAuthStore()
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [transactions, setTransactions] = useState<IncomeTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [incomeByType, setIncomeByType] = useState<any[]>([])

  useEffect(() => {
    if (user?.companyId && user?.uid) {
      loadWalletData()
    }
  }, [user?.companyId, user?.uid])

  const loadWalletData = async () => {
    try {
      setLoading(true)
      if (!user?.companyId || !user?.uid) return

      // Get wallet
      const walletData = await walletService.getOrCreate(user.companyId, user.uid)
      setWallet(walletData)

      // Get transactions
      const transactionData = await incomeTransactionService.getByUser(user.companyId, user.uid, 100)
      setTransactions(transactionData)

      // Calculate income by type
      const byType: Record<string, number> = {}
      transactionData.forEach((tx) => {
        if (tx.status === "credited") {
          byType[tx.incomeType] = (byType[tx.incomeType] || 0) + tx.amount
        }
      })

      const typeData = Object.entries(byType).map(([type, amount]) => ({
        type,
        amount,
      }))
      setIncomeByType(typeData)
    } catch (error) {
      console.error("[v0] Error loading wallet data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading wallet data...</div>
  }

  if (!wallet) {
    return <div className="text-center py-8">No wallet data found</div>
  }

  return (
    <div className="space-y-6">
      {/* Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Available Balance</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
            ${wallet.availableBalance.toFixed(2)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Locked Balance</h3>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
            ${wallet.lockedBalance.toFixed(2)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Earned</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">${wallet.totalEarned.toFixed(2)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Withdrawn</h3>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
            ${wallet.totalWithdrawn.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Income by Type Chart */}
      {incomeByType.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Income Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={incomeByType}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Transactions</h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Description</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.slice(0, 10).map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {new Date(transaction.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {transaction.incomeType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{transaction.description}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-green-600 dark:text-green-400">
                    +${transaction.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        transaction.status === "credited"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      }`}
                    >
                      {transaction.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
