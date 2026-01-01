"use client"

import { useState, useEffect } from "react"
import { CreditCard } from "lucide-react"
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { planService } from "@/lib/billing-service"
import type { SubscriptionPlan, CompanySubscription } from "@/shared/billing-types"

export function BillingDashboard() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [stats, setStats] = useState({
    totalActiveSubscriptions: 0,
    totalMRR: 0,
    trialConversions: 0,
    paymentFailures: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBillingData()
  }, [])

  async function loadBillingData() {
    try {
      setLoading(true)
      const plansData = await planService.getAll()
      setPlans(plansData)

      // Get all companies
      const companiesSnapshot = await getDocs(collection(db, "companies"))
      const companies = companiesSnapshot.docs.map((doc) => doc.id)

      let totalActiveSubscriptions = 0
      let totalMRR = 0
      let trialConversions = 0
      let paymentFailures = 0

      // Get all subscriptions across all companies
      for (const companyId of companies) {
        try {
          // Get active subscriptions
          const activeSubscriptionsSnapshot = await getDocs(
            query(
              collection(db, "companies", companyId, "subscriptions"),
              where("status", "in", ["active", "trial"]),
            ),
          )

          for (const subDoc of activeSubscriptionsSnapshot.docs) {
            const subscription = subDoc.data() as CompanySubscription
            totalActiveSubscriptions++

            // Calculate MRR
            if (subscription.planId) {
              const plan = plansData.find((p) => p.id === subscription.planId)
              if (plan) {
                const monthlyPrice = plan.price?.monthly || plan.price?.yearly / 12 || 0
                totalMRR += monthlyPrice
              }
            }

            // Count trial conversions (trial status that has ended - meaning it converted)
            if (subscription.status === "trial" && subscription.trialEndsAt) {
              try {
                let trialEnd: Date
                const trialEndValue = subscription.trialEndsAt
                if (trialEndValue instanceof Timestamp) {
                  trialEnd = trialEndValue.toDate()
                } else if (trialEndValue && typeof trialEndValue === 'object' && 'toDate' in trialEndValue) {
                  trialEnd = (trialEndValue as any).toDate()
                } else if (trialEndValue instanceof Date) {
                  trialEnd = trialEndValue
                } else {
                  trialEnd = new Date(trialEndValue)
                }
                // Count as conversion if trial has ended (past the trial end date)
                if (trialEnd < new Date()) {
                  trialConversions++
                }
              } catch (error) {
                console.error(`Error processing trial conversion for subscription ${subDoc.id}:`, error)
              }
            }
          }

          // Get failed payments from billing events
          const billingEventsSnapshot = await getDocs(
            query(
              collection(db, "companies", companyId, "billingEvents"),
              where("eventType", "in", ["payment_failed", "subscription_payment_failed"]),
            ),
          )
          paymentFailures += billingEventsSnapshot.size
        } catch (error) {
          console.error(`Error loading billing data for company ${companyId}:`, error)
        }
      }

      setStats({
        totalActiveSubscriptions,
        totalMRR: Math.round(totalMRR),
        trialConversions,
        paymentFailures,
      })
    } catch (error) {
      console.error("Failed to load billing data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading billing data...</div>
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <CreditCard className="h-6 w-6" />
          Billing Dashboard
        </h2>
        <p className="mt-2 text-sm text-gray-600">Monitor SaaS revenue and subscription metrics</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-600">Active Subscriptions</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{stats.totalActiveSubscriptions}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-600">Monthly Recurring Revenue</p>
          <p className="mt-2 text-3xl font-bold">₹{stats.totalMRR.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-600">Trial Conversions</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{stats.trialConversions}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-600">Payment Failures</p>
          <p className="mt-2 text-3xl font-bold text-red-600">{stats.paymentFailures}</p>
        </div>
      </div>

      {/* Subscription Plans */}
      <div>
        <h3 className="font-semibold mb-4">Active Plans</h3>
        <div className="grid grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-lg border p-6 hover:shadow-lg transition">
              <p className="font-semibold uppercase text-sm">{plan.tier}</p>
              <p className="mt-2 text-3xl font-bold">₹{Math.min(plan.price.monthly, plan.price.yearly)}/month</p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li>Max Users: {plan.limits.maxUsers}</li>
                <li>Binary Enabled: {plan.limits.binariesEnabled ? "Yes" : "No"}</li>
                <li>Storage: {plan.limits.storageInGB}GB</li>
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
