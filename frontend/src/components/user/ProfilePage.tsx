"use client"

import { useState, useEffect } from "react"
import { userService, walletService } from "@/lib/firebase-services"
import { useAuthStore } from "@/store/authStore"
import type { User, Wallet } from "@/shared/types"
import { toast } from "react-hot-toast"

export function ProfilePage() {
  const { user: authUser } = useAuthStore()
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<User>>({})

  useEffect(() => {
    if (authUser?.companyId && authUser?.uid) {
      loadProfile()
    }
  }, [authUser?.companyId, authUser?.uid])

  const loadProfile = async () => {
    try {
      setLoading(true)
      if (!authUser?.companyId || !authUser?.uid) return

      const profile = await userService.getById(authUser.companyId, authUser.uid)
      setUserProfile(profile)
      if (profile) {
        setFormData(profile)
      }

      const walletData = await walletService.getOrCreate(authUser.companyId, authUser.uid)
      setWallet(walletData)
    } catch (error) {
      console.error("[v0] Error loading profile:", error)
      toast.error("Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      if (!authUser?.companyId || !authUser?.uid) {
        toast.error("User not authenticated")
        return
      }

      await userService.update(authUser.companyId, authUser.uid, formData)
      toast.success("Profile updated successfully")
      setIsEditing(false)
      loadProfile()
    } catch (error) {
      console.error("[v0] Error updating profile:", error)
      toast.error("Failed to update profile")
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading profile...</div>
  }

  if (!userProfile) {
    return <div className="text-center py-8">Profile not found</div>
  }

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              {userProfile.firstName} {userProfile.lastName}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{userProfile.email}</p>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            {isEditing ? "Cancel" : "Edit Profile"}
          </button>
        </div>

        {!isEditing ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{userProfile.phone || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
              <p className="text-lg font-semibold">
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    userProfile.status === "active"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  }`}
                >
                  {userProfile.status}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">KYC Status</p>
              <p className="text-lg font-semibold">
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    userProfile.kycStatus === "approved"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  }`}
                >
                  {userProfile.kycStatus}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sponsor ID</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white font-mono">
                {userProfile.sponsorId || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Package</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{userProfile.packageId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Joined Date</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {new Date(userProfile.registrationDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
                <input
                  type="text"
                  value={formData.firstName || ""}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                <input
                  type="text"
                  value={formData.lastName || ""}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
              <input
                type="tel"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Wallet Summary */}
      {wallet && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">Available Balance</h3>
            <p className="text-4xl font-bold text-green-900 dark:text-green-100">
              ${wallet.availableBalance.toFixed(2)}
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Total Earned</h3>
            <p className="text-4xl font-bold text-blue-900 dark:text-blue-100">${wallet.totalEarned.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Account Settings */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Account Settings</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Blocked Income</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {userProfile.blockedIncome ? "Currently blocked" : "Active"}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                userProfile.blockedIncome
                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              }`}
            >
              {userProfile.blockedIncome ? "Blocked" : "Active"}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Withdrawals</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {userProfile.blockedWithdrawals ? "Currently blocked" : "Enabled"}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                userProfile.blockedWithdrawals
                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              }`}
            >
              {userProfile.blockedWithdrawals ? "Blocked" : "Enabled"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
