"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuthStore } from "@/store/authStore"

export function CompanyStatsOverview() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalIncome: 0,
    pendingWithdrawals: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.companyId) {
      loadStats()
    }
  }, [user?.companyId])

  const loadStats = async () => {
    try {
      setLoading(true)
      if (!user?.companyId) return

      // Get total users
      const usersSnapshot = await getDocs(
        query(collection(db, "companies", user.companyId, "users"), where("status", "!=", "deleted")),
      )
      const totalUsers = usersSnapshot.size

      const activeUsers = usersSnapshot.docs.filter((doc) => doc.data().status === "active").length

      // Get pending withdrawals
      const withdrawalsSnapshot = await getDocs(
        query(collection(db, "companies", user.companyId, "withdrawals"), where("status", "==", "pending")),
      )
      const pendingWithdrawals = withdrawalsSnapshot.size

      setStats({
        totalUsers,
        activeUsers,
        totalIncome: 0, // Would aggregate from income transactions
        pendingWithdrawals,
      })
    } catch (error) {
      console.error("Error loading stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading statistics...</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</h3>
        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalUsers}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Users</h3>
        <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{stats.activeUsers}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Income</h3>
        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">${stats.totalIncome}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Withdrawals</h3>
        <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">{stats.pendingWithdrawals}</p>
      </div>
    </div>
  )
}
