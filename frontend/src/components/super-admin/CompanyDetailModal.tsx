"use client"

import { useState, useEffect } from "react"
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Company } from "@/shared/types"
import { toast } from "react-hot-toast"
import { AlertCircle, CreditCard } from "lucide-react"
import { subscriptionService } from "@/lib/billing-service"

interface CompanyDetailModalProps {
  companyId: string
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export function CompanyDetailModal({ companyId, isOpen, onClose, onUpdate }: CompanyDetailModalProps) {
  const [company, setCompany] = useState<Company | null>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<Partial<Company>>({})
  const [activeTab, setActiveTab] = useState<"general" | "billing">("general")

  useEffect(() => {
    if (isOpen && companyId) {
      loadCompany()
    }
  }, [isOpen, companyId])

  const loadCompany = async () => {
    try {
      setLoading(true)
      const docRef = doc(db, "companies", companyId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data() as Company
        setCompany(data)
        setFormData(data)

        const sub = await subscriptionService.getActive(companyId)
        setSubscription(sub)
      }
    } catch (error) {
      console.error("Error loading company:", error)
      toast.error("Failed to load company details")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      await updateDoc(doc(db, "companies", companyId), {
        ...formData,
        updatedAt: Timestamp.now(),
      })
      toast.success("Company updated successfully")
      onUpdate()
      onClose()
    } catch (error) {
      console.error("Error updating company:", error)
      toast.error("Failed to update company")
    }
  }

  async function suspendCompany() {
    if (!confirm("Suspend this company? This will block all operations.")) {
      return
    }
    try {
      await updateDoc(doc(db, "companies", companyId), {
        status: "suspended",
        updatedAt: Timestamp.now(),
      })
      toast.success("Company suspended")
      onUpdate()
      onClose()
    } catch (error) {
      toast.error("Failed to suspend company")
    }
  }

  if (!isOpen) return null

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Company Details</h2>

        <div className="flex gap-4 border-b mb-6">
          <button
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2 font-medium ${
              activeTab === "general"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            className={`px-4 py-2 font-medium flex items-center gap-2 ${
              activeTab === "billing"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Billing
          </button>
        </div>

        {/* General Tab */}
        {activeTab === "general" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company Name</label>
              <input
                type="text"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company Code</label>
                <input
                  type="text"
                  disabled
                  value={formData.code || ""}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <select
                  value={formData.status || "active"}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as "active" | "suspended" | "deleted" })
                  }
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="deleted">Deleted</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
                <input
                  type="text"
                  value={formData.defaultCurrency || ""}
                  onChange={(e) => setFormData({ ...formData, defaultCurrency: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
                <input
                  type="text"
                  value={formData.timezone || ""}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Admin Email</label>
              <input
                type="email"
                value={formData.adminEmail || ""}
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="demoMode"
                checked={formData.demoMode || false}
                onChange={(e) => setFormData({ ...formData, demoMode: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="demoMode" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Demo Mode
              </label>
            </div>
          </div>
        )}

        {activeTab === "billing" && (
          <div className="space-y-4">
            {!subscription ? (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <p className="flex items-center gap-2 font-medium text-yellow-800">
                  <AlertCircle className="h-4 w-4" />
                  No Active Subscription
                </p>
                <p className="mt-1 text-sm text-yellow-700">This company does not have an active subscription.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-600">Plan</p>
                    <p className="mt-1 text-lg font-bold capitalize">{subscription.tier}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-600">Status</p>
                    <p
                      className={`mt-1 text-lg font-bold capitalize ${
                        subscription.status === "active" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {subscription.status}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-600">Billing Cycle</p>
                    <p className="mt-1 text-lg font-bold capitalize">{subscription.billingCycle}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-600">Next Billing</p>
                    <p className="mt-1 text-lg font-bold">
                      {new Date(subscription.nextBillingDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="font-medium">Feature Usage</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <p>Active Users: {subscription.featureUsage.activeUsers}</p>
                    <p>Admins: {subscription.featureUsage.admins}</p>
                    <p>Storage: {subscription.featureUsage.storageUsedInGB} GB</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
          >
            Close
          </button>
          {activeTab === "general" && (
            <>
              <button onClick={suspendCompany} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                Suspend Company
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
