"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, Lock, PauseCircle } from "lucide-react"
import { emergencyControlService, payoutFreezeService } from "@/lib/emergency-service"
import type { EmergencyControl } from "@/shared/emergency-types"

export function EmergencyControlPanel() {
  const [activeControls, setActiveControls] = useState<EmergencyControl[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [showFreezeDialog, setShowFreezeDialog] = useState(false)
  const [freezeReason, setFreezeReason] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadEmergencyStatus()
    const interval = setInterval(loadEmergencyStatus, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [])

  async function loadEmergencyStatus() {
    try {
      const [controls, summary] = await Promise.all([
        emergencyControlService.getActiveControls(),
        emergencyControlService.getActiveSummary(),
      ])
      setActiveControls(controls)
      setSummary(summary)
    } catch (error) {
      console.error("Failed to load emergency status:", error)
    }
  }

  async function handleGlobalPayoutFreeze() {
    if (!freezeReason.trim()) {
      alert("Please provide a reason for the freeze")
      return
    }

    setIsLoading(true)
    try {
      await payoutFreezeService.freeze(undefined, freezeReason)
      setFreezeReason("")
      setShowFreezeDialog(false)
      await loadEmergencyStatus()
      alert("Global payout freeze activated")
    } catch (error) {
      alert(`Failed to activate freeze: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDeactivateControl(controlId: string) {
    if (!confirm("Are you sure? This action cannot be undone immediately.")) {
      return
    }

    setIsLoading(true)
    try {
      await emergencyControlService.deactivate(controlId, "super_admin")
      await loadEmergencyStatus()
      alert("Control deactivated")
    } catch (error) {
      alert(`Failed to deactivate: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const systemHealthScore = summary?.systemHealthScore || 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-red-600">
          <AlertTriangle className="h-6 w-6" />
          Emergency Controls
        </h2>
        <p className="mt-2 text-sm text-gray-600">Critical controls for platform-wide emergencies. Use with caution.</p>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm font-medium text-gray-600">System Health</p>
          <p className={`mt-2 text-2xl font-bold ${systemHealthScore > 75 ? "text-green-600" : "text-red-600"}`}>
            {systemHealthScore}%
          </p>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm font-medium text-gray-600">Active Controls</p>
          <p className="mt-2 text-2xl font-bold text-orange-600">{summary?.totalActive || 0}</p>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm font-medium text-gray-600">Frozen Companies</p>
          <p className="mt-2 text-2xl font-bold text-red-600">{summary?.companiesFrozen || 0}</p>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm font-medium text-gray-600">Blocked Users</p>
          <p className="mt-2 text-2xl font-bold text-red-600">{summary?.usersBlocked || 0}</p>
        </div>
      </div>

      {/* Critical Actions */}
      <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
        <h3 className="font-semibold text-red-900">Critical Actions</h3>
        <div className="mt-3 space-y-2">
          <button
            onClick={() => setShowFreezeDialog(true)}
            className="flex w-full items-center gap-2 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            <Lock className="h-4 w-4" />
            Global Payout Freeze
          </button>
          <button className="flex w-full items-center gap-2 rounded bg-orange-600 px-4 py-2 text-white hover:bg-orange-700">
            <PauseCircle className="h-4 w-4" />
            Pause All Income Distribution
          </button>
        </div>
      </div>

      {/* Active Controls List */}
      {activeControls.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Active Controls ({activeControls.length})</h3>
          {activeControls.map((control) => (
            <div
              key={control.id}
              className="flex items-start justify-between rounded-lg border border-red-200 bg-red-50 p-4"
            >
              <div className="flex-1">
                <p className="font-medium text-red-900 uppercase">{control.action.replace("_", " ")}</p>
                <p className="mt-1 text-sm text-gray-700">{control.reason}</p>
                <p className="mt-2 text-xs text-gray-600">
                  Activated: {new Date(control.activatedAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => handleDeactivateControl(control.id)}
                className="ml-4 rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
              >
                Deactivate
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Freeze Dialog */}
      {showFreezeDialog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-lg bg-white p-6">
            <h3 className="text-lg font-bold text-red-600">Global Payout Freeze</h3>
            <p className="mt-2 text-sm text-gray-600">Provide a reason for this emergency action:</p>

            <textarea
              value={freezeReason}
              onChange={(e) => setFreezeReason(e.target.value)}
              placeholder="Emergency reason..."
              className="mt-3 w-full rounded border p-2 text-sm"
              rows={4}
            />

            <div className="mt-4 flex gap-2">
              <button
                onClick={handleGlobalPayoutFreeze}
                disabled={isLoading}
                className="flex-1 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? "Activating..." : "Activate Freeze"}
              </button>
              <button onClick={() => setShowFreezeDialog(false)} className="rounded border px-4 py-2 hover:bg-gray-100">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
