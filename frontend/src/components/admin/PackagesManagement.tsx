"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuthStore } from "@/store/authStore"
import { toast } from "react-hot-toast"
import { Plus, Edit, Trash2, Check, X } from "lucide-react"
import type { Package } from "@/shared/types"

export function PackagesManagement() {
  const { user } = useAuthStore()
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    bv: 0,
    activationRequired: false,
    repurchaseEligible: true,
    allowUpgrade: true,
    allowDowngrade: false,
  })

  useEffect(() => {
    if (user?.companyId) {
      loadPackages()
    }
  }, [user?.companyId])

  const loadPackages = async () => {
    if (!user?.companyId) return

    try {
      setLoading(true)
      const packagesRef = collection(db, "companies", user.companyId, "packages")
      const snapshot = await getDocs(query(packagesRef, orderBy("createdAt", "desc")))
      
      const packagesData = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          companyId: data.companyId || user.companyId,
          name: data.name || "",
          bv: data.bv || 0,
          price: data.price || 0,
          activationRequired: data.activationRequired ?? false,
          repurchaseEligible: data.repurchaseEligible ?? true,
          allowUpgrade: data.allowUpgrade ?? true,
          allowDowngrade: data.allowDowngrade ?? false,
        } as Package
      })

      setPackages(packagesData)
    } catch (error) {
      console.error("Error loading packages:", error)
      toast.error("Failed to load packages")
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.companyId) {
      toast.error("Company ID not found")
      return
    }

    if (!formData.name.trim()) {
      toast.error("Package name is required")
      return
    }

    if (formData.price <= 0) {
      toast.error("Price must be greater than 0")
      return
    }

    if (formData.bv <= 0) {
      toast.error("BV must be greater than 0")
      return
    }

    try {
      const packagesRef = collection(db, "companies", user.companyId, "packages")
      await addDoc(packagesRef, {
        name: formData.name,
        price: formData.price,
        bv: formData.bv,
        activationRequired: formData.activationRequired,
        repurchaseEligible: formData.repurchaseEligible,
        allowUpgrade: formData.allowUpgrade,
        allowDowngrade: formData.allowDowngrade,
        companyId: user.companyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      toast.success("Package created successfully")
      setShowCreateModal(false)
      setFormData({ name: "", price: 0, bv: 0, activationRequired: false, repurchaseEligible: true, allowUpgrade: true, allowDowngrade: false })
      loadPackages()
    } catch (error) {
      console.error("Error creating package:", error)
      toast.error("Failed to create package")
    }
  }

  const handleUpdatePackage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.companyId || !editingPackage) {
      return
    }

    try {
      const packageRef = doc(db, "companies", user.companyId, "packages", editingPackage.id)
      await updateDoc(packageRef, {
        name: formData.name,
        price: formData.price,
        bv: formData.bv,
        activationRequired: formData.activationRequired,
        repurchaseEligible: formData.repurchaseEligible,
        allowUpgrade: formData.allowUpgrade,
        allowDowngrade: formData.allowDowngrade,
        updatedAt: serverTimestamp(),
      })

      toast.success("Package updated successfully")
      setEditingPackage(null)
      setFormData({ name: "", price: 0, bv: 0, activationRequired: false, repurchaseEligible: true, allowUpgrade: true, allowDowngrade: false })
      loadPackages()
    } catch (error) {
      console.error("Error updating package:", error)
      toast.error("Failed to update package")
    }
  }

  // Note: Package interface doesn't have isActive, but we'll use a workaround
  // by checking if package exists and is not deleted

  const handleDeletePackage = async (pkg: Package) => {
    if (!confirm(`Are you sure you want to delete package "${pkg.name}"?`)) {
      return
    }

    if (!user?.companyId) return

    try {
      const packageRef = doc(db, "companies", user.companyId, "packages", pkg.id)
      await deleteDoc(packageRef)

      toast.success("Package deleted successfully")
      loadPackages()
    } catch (error) {
      console.error("Error deleting package:", error)
      toast.error("Failed to delete package")
    }
  }

  const startEdit = (pkg: Package) => {
    setEditingPackage(pkg)
    setFormData({
      name: pkg.name,
      price: pkg.price,
      bv: pkg.bv,
      activationRequired: pkg.activationRequired ?? false,
      repurchaseEligible: pkg.repurchaseEligible ?? true,
      allowUpgrade: pkg.allowUpgrade ?? true,
      allowDowngrade: pkg.allowDowngrade ?? false,
    })
    setShowCreateModal(true)
  }

  const cancelEdit = () => {
    setEditingPackage(null)
    setShowCreateModal(false)
    setFormData({ name: "", price: 0, bv: 0, activationRequired: false, repurchaseEligible: true, allowUpgrade: true, allowDowngrade: false })
  }

  if (loading) {
    return <div className="text-center py-8">Loading packages...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Packages Management</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Create and manage packages for user registration
          </p>
        </div>
        <button
          onClick={() => {
            setEditingPackage(null)
            setFormData({ name: "", price: 0, bv: 0, activationRequired: false, repurchaseEligible: true, allowUpgrade: true, allowDowngrade: false })
            setShowCreateModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <Plus size={20} />
          Create Package
        </button>
      </div>

      {/* Packages List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                BV
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Repurchase
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {packages.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  No packages found. Create your first package.
                </td>
              </tr>
            ) : (
              packages.map((pkg) => (
                <tr key={pkg.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {pkg.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    ${pkg.price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {pkg.bv.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        pkg.repurchaseEligible
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                      }`}
                    >
                      {pkg.repurchaseEligible ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => startEdit(pkg)}
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeletePackage(pkg)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {editingPackage ? "Edit Package" : "Create Package"}
            </h2>
            <form onSubmit={editingPackage ? handleUpdatePackage : handleCreatePackage} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Package Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Price ($) *
                </label>
                <input
                  type="number"
                  id="price"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label htmlFor="bv" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Business Volume (BV) *
                </label>
                <input
                  type="number"
                  id="bv"
                  value={formData.bv}
                  onChange={(e) => setFormData({ ...formData, bv: Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  min="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="activationRequired"
                    checked={formData.activationRequired}
                    onChange={(e) => setFormData({ ...formData, activationRequired: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="activationRequired" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Activation Required
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="repurchaseEligible"
                    checked={formData.repurchaseEligible}
                    onChange={(e) => setFormData({ ...formData, repurchaseEligible: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="repurchaseEligible" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Repurchase Eligible
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allowUpgrade"
                    checked={formData.allowUpgrade}
                    onChange={(e) => setFormData({ ...formData, allowUpgrade: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="allowUpgrade" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Allow Upgrade
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allowDowngrade"
                    checked={formData.allowDowngrade}
                    onChange={(e) => setFormData({ ...formData, allowDowngrade: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="allowDowngrade" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Allow Downgrade
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  {editingPackage ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

