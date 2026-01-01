"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, addDoc, doc, updateDoc, Timestamp, query, where, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Company } from "@/shared/types"
import { toast } from "react-hot-toast"
import { CompanyDetailModal } from "./CompanyDetailModal"
import { useAuthStore } from "@/store/authStore"

export function CompaniesListEnhanced() {
  const { hasRole } = useAuthStore()
  const [companies, setCompanies] = useState<(Company & { userCount: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    adminEmail: "",
    currency: "INR",
    currencySymbol: "₹",
    timezone: "Asia/Kolkata",
    demoMode: true,
  })

  useEffect(() => {
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    try {
      setLoading(true)
      const snapshot = await getDocs(collection(db, "companies"))
      const companiesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Company[]

      // Load user counts for each company
      const companiesWithUserCounts = await Promise.all(
        companiesData.map(async (company) => {
          try {
            const usersSnapshot = await getDocs(
              query(collection(db, "companies", company.id, "users"), where("status", "!=", "deleted")),
            )
            return {
              ...company,
              userCount: usersSnapshot.size,
            }
          } catch (error) {
            console.error(`Error loading users for company ${company.id}:`, error)
            return {
              ...company,
              userCount: 0,
            }
          }
        }),
      )

      setCompanies(companiesWithUserCounts)
    } catch (error) {
      console.error("Error loading companies:", error)
      toast.error("Failed to load companies")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (companyId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "suspended" : "active"
      await updateDoc(doc(db, "companies", companyId), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      })
      toast.success(`Company ${newStatus}`)
      loadCompanies()
    } catch (error) {
      console.error("Error updating company:", error)
      toast.error("Failed to update company status")
    }
  }

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm("Are you sure you want to delete this company?")) return

    try {
      await updateDoc(doc(db, "companies", companyId), {
        status: "deleted",
        updatedAt: Timestamp.now(),
      })
      toast.success("Company deleted")
      loadCompanies()
    } catch (error) {
      console.error("Error deleting company:", error)
      toast.error("Failed to delete company")
    }
  }

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!hasRole("super_admin")) {
      toast.error("Only Super Admins can create companies")
      return
    }

    if (!formData.name.trim()) {
      toast.error("Company name is required")
      return
    }

    if (!formData.adminEmail.trim()) {
      toast.error("Admin email is required")
      return
    }

    try {
      // Generate company code from name
      const code = formData.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .substring(0, 10) || "COMPANY"

      // Create company document
      const companyRef = await addDoc(collection(db, "companies"), {
        name: formData.name,
        code: code,
        adminEmail: formData.adminEmail,
        defaultCurrency: formData.currency,
        currencySymbol: formData.currencySymbol,
        timezone: formData.timezone,
        demoMode: formData.demoMode,
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      toast.success(`Company "${formData.name}" created successfully!`)
      toast(`Company ID: ${companyRef.id}. Please create admin account using: node scripts/create-admin-service-account.js ${formData.adminEmail} <password> company_admin ${companyRef.id}`, {
        duration: 10000,
        icon: 'ℹ️',
      })

      // Reset form
      setFormData({
        name: "",
        adminEmail: "",
        currency: "INR",
        currencySymbol: "₹",
        timezone: "Asia/Kolkata",
        demoMode: true,
      })
      setShowCreateModal(false)
      loadCompanies()
    } catch (error: any) {
      console.error("Error creating company:", error)
      if (error?.code === "permission-denied") {
        toast.error("Permission denied. Make sure you are logged in as Super Admin.")
      } else {
        toast.error(`Failed to create company: ${error?.message || "Unknown error"}`)
      }
    }
  }

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return <div className="text-center py-8">Loading companies...</div>
  }

  return (
    <>
      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Search companies by name or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
        >
          Create Company
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Code</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Currency</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Users</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredCompanies.map((company) => (
              <tr key={company.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{company.name}</td>
                <td className="px-6 py-4 text-sm font-mono text-gray-600 dark:text-gray-400">{company.code}</td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{company.defaultCurrency}</td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      company.status === "active"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}
                  >
                    {company.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{company.userCount || 0}</td>
                <td className="px-6 py-4 text-sm space-x-2">
                  <button
                    onClick={() => {
                      setSelectedCompany(company.id)
                      setShowDetailModal(true)
                    }}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleStatus(company.id, company.status)}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {company.status === "active" ? "Suspend" : "Activate"}
                  </button>
                  <button
                    onClick={() => handleDeleteCompany(company.id)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedCompany && (
        <CompanyDetailModal
          companyId={selectedCompany}
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          onUpdate={loadCompanies}
        />
      )}

      {/* Create Company Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Company</h2>

            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Test MLM Company"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Admin Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  placeholder="newcompany@test.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Admin account will need to be created separately using the script
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => {
                      const currencySymbols: Record<string, string> = {
                        USD: "$",
                        INR: "₹",
                        EUR: "€",
                        GBP: "£",
                      }
                      setFormData({
                        ...formData,
                        currency: e.target.value,
                        currencySymbol: currencySymbols[e.target.value] || "$",
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="USD">USD</option>
                    <option value="INR">INR</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Timezone
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="UTC">UTC</option>
                    <option value="Asia/Kolkata">Asia/Kolkata</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="demoMode"
                  checked={formData.demoMode}
                  onChange={(e) => setFormData({ ...formData, demoMode: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="demoMode" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Demo Mode
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setFormData({
                      name: "",
                      adminEmail: "",
                      currency: "INR",
                      currencySymbol: "₹",
                      timezone: "Asia/Kolkata",
                      demoMode: true,
                    })
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Create Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
