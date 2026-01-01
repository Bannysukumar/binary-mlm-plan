"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, doc, updateDoc, Timestamp, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { Company } from "@/shared/types"
import { toast } from "react-hot-toast"
import { CompanyDetailModal } from "./CompanyDetailModal"

export function CompaniesListEnhanced() {
  const [companies, setCompanies] = useState<(Company & { userCount: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

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
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search companies by name or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
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
    </>
  )
}
