"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, getDoc, doc, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Company } from "@/shared/types"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Timestamp } from "firebase/firestore"

export function SuperAdminAnalytics() {
  const [stats, setStats] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    totalUsers: 0,
    platformRevenue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<any[]>([])

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      setLoading(true)

      // Get all companies
      const companiesSnapshot = await getDocs(collection(db, "companies"))
      const companies = companiesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Company[]

      const totalCompanies = companies.length
      const activeCompanies = companies.filter((c) => c.status === "active").length

      // Get user counts per company and calculate platform revenue
      let totalUsers = 0
      let platformRevenue = 0
      const userCountsByCompany: Record<string, number> = {}
      const monthlyData: Record<string, { companies: number; users: number; revenue: number }> = {}

      // Get current month for grouping
      const now = new Date()
      const currentMonth = now.toLocaleString("default", { month: "short" })

      for (const company of companies) {
        // Get user count
        try {
          const usersSnapshot = await getDocs(
            query(collection(db, "companies", company.id, "users"), where("status", "!=", "deleted")),
          )
          const userCount = usersSnapshot.size
          totalUsers += userCount
          userCountsByCompany[company.id] = userCount
        } catch (error) {
          console.error(`Error loading users for company ${company.id}:`, error)
          userCountsByCompany[company.id] = 0
        }

        // Get active subscription to calculate revenue
        try {
          const subscriptionsSnapshot = await getDocs(
            query(
              collection(db, "companies", company.id, "subscriptions"),
              where("status", "in", ["active", "trial"]),
            ),
          )
          if (!subscriptionsSnapshot.empty) {
            const subscription = subscriptionsSnapshot.docs[0].data()
            // Get plan details to calculate monthly revenue
            if (subscription.planId) {
              try {
                const planDocRef = doc(db, "subscriptionPlans", subscription.planId)
                const planDoc = await getDoc(planDocRef)
                if (planDoc.exists()) {
                  const plan = planDoc.data()
                  const monthlyPrice = plan.price?.monthly || plan.price?.yearly / 12 || 0
                  platformRevenue += monthlyPrice
                }
              } catch (planError) {
                console.error(`Error loading plan ${subscription.planId}:`, planError)
              }
            }
          }
        } catch (error) {
          console.error(`Error loading subscription for company ${company.id}:`, error)
        }

        // Group by creation month for historical data
        if (company.createdAt) {
          let createdAt: Date
          if (company.createdAt instanceof Date) {
            createdAt = company.createdAt
          } else if (company.createdAt && typeof company.createdAt === 'object' && 'toDate' in company.createdAt) {
            createdAt = (company.createdAt as any).toDate()
          } else {
            createdAt = new Date(company.createdAt)
          }
          const monthKey = createdAt.toLocaleString("default", { month: "short" })
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { companies: 0, users: 0, revenue: 0 }
          }
          monthlyData[monthKey].companies += 1
          monthlyData[monthKey].users += userCountsByCompany[company.id] || 0
        }
      }

      // Calculate revenue for each month (simplified - using current revenue distribution)
      const months = Object.keys(monthlyData).sort()
      const chartData = months.map((month) => ({
        date: month,
        companies: monthlyData[month].companies,
        users: monthlyData[month].users,
        revenue: Math.round((platformRevenue / totalCompanies) * monthlyData[month].companies),
      }))

      // If no historical data, show current month
      if (chartData.length === 0) {
        chartData.push({
          date: currentMonth,
          companies: totalCompanies,
          users: totalUsers,
          revenue: platformRevenue,
        })
      }

      setStats({
        totalCompanies,
        activeCompanies,
        totalUsers,
        platformRevenue: Math.round(platformRevenue),
      })

      setAnalyticsData(chartData)
    } catch (error) {
      console.error("Error loading analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Companies</h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalCompanies}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Companies</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{stats.activeCompanies}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{stats.totalUsers}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Platform Revenue</h3>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">${stats.platformRevenue}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Growth Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analyticsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="companies" stroke="#3b82f6" />
            <Line type="monotone" dataKey="users" stroke="#10b981" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
