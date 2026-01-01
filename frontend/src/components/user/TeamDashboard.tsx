"use client"

import { useState, useEffect } from "react"
import { binaryTreeService } from "@/lib/firebase-services"
import { useAuthStore } from "@/store/authStore"
import type { BinaryPosition } from "@/shared/types"

export function TeamDashboard() {
  const { user } = useAuthStore()
  const [position, setPosition] = useState<BinaryPosition | null>(null)
  const [teamCount, setTeamCount] = useState({ total: 0, left: 0, right: 0 })
  const [teamVolume, setTeamVolume] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.companyId && user?.uid) {
      loadTeamData()
    }
  }, [user?.companyId, user?.uid])

  const loadTeamData = async () => {
    try {
      setLoading(true)
      if (!user?.companyId || !user?.uid) return

      const pos = await binaryTreeService.getBinaryPosition(user.companyId, user.uid)
      setPosition(pos)

      const count = await binaryTreeService.getTeamCount(user.companyId, user.uid)
      setTeamCount(count)

      const volume = await binaryTreeService.calculateTeamVolume(user.companyId, user.uid)
      setTeamVolume(volume)
    } catch (error) {
      console.error("[v0] Error loading team data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading team data...</div>
  }

  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Team Members</h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{teamCount.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Left Leg Members</h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{teamCount.left}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Right Leg Members</h3>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">{teamCount.right}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Team Volume</h3>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">{teamVolume}</p>
        </div>
      </div>

      {/* Binary Position */}
      {position && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Binary Position</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Left Member</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white font-mono">
                {position.left ? (
                  <span className="text-green-600 dark:text-green-400">Placed</span>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">Empty</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Right Member</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white font-mono">
                {position.right ? (
                  <span className="text-green-600 dark:text-green-400">Placed</span>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">Empty</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Left Volume</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{position.leftVolume}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Right Volume</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{position.rightVolume}</p>
            </div>
          </div>
        </div>
      )}

      {/* Referral Info */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Build Your Network</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Share your referral link with others to expand your network. When they join under your sponsorship, they'll be
          added to your team.
        </p>

        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Your Referral Link</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={`${typeof window !== "undefined" ? window.location.origin : ""}/register?sponsor=${user?.uid}`}
              className="flex-1 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md text-gray-900 dark:text-white text-sm font-mono"
            />
            <button
              onClick={() => {
                const link = `${typeof window !== "undefined" ? window.location.origin : ""}/register?sponsor=${user?.uid}`
                navigator.clipboard.writeText(link)
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
            >
              Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
