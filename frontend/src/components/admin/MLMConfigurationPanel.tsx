"use client"

import { useState, useEffect } from "react"
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { MLMConfig } from "@/shared/types"
import { useAuthStore } from "@/store/authStore"
import { toast } from "react-hot-toast"

const defaultMLMConfig: MLMConfig = {
  companyId: "",
  binaryPlan: {
    enabled: true,
    ratio: "1:1",
    pairValue: 100,
    carryForward: true,
    flushOutRules: "Weekly",
    weakLegCalculation: "auto",
    pairingTiming: "realtime",
    dailyCapping: 0,
    weeklyCapping: 0,
    monthlyCapping: 0,
  },
  directIncome: {
    enabled: true,
    type: "percentage",
    value: 10,
    instantCredit: true,
  },
  matchingIncome: {
    enabled: true,
    levels: 5,
    percentagePerLevel: [10, 5, 3, 2, 1],
  },
  sponsorMatching: {
    enabled: false,
    levels: 3,
    percentagePerLevel: [5, 3, 1],
  },
  repurchaseIncome: {
    enabled: false,
    repurchaseBV: 100,
    distributionPercentage: 10,
    eligibleUplineDepth: 10,
    monthlyReset: true,
  },
  ranks: [],
  globalLimits: {
    maxDepth: 20,
    antifraudThreshold: 100000,
    minPairsForIncome: 1,
  },
}

export function MLMConfigurationPanel() {
  const { user } = useAuthStore()
  const [config, setConfig] = useState<MLMConfig>(defaultMLMConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user?.companyId) {
      loadConfig()
    }
  }, [user?.companyId])

  const loadConfig = async () => {
    try {
      setLoading(true)
      if (!user?.companyId) return

      const docRef = doc(db, "companies", user.companyId, "mlmConfig", "main")
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        setConfig(docSnap.data() as MLMConfig)
      } else {
        setConfig({ ...defaultMLMConfig, companyId: user.companyId })
      }
    } catch (error) {
      console.error("Error loading MLM config:", error)
      toast.error("Failed to load MLM configuration")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      if (!user?.companyId) {
        toast.error("Company ID not found")
        return
      }

      const docRef = doc(db, "companies", user.companyId, "mlmConfig", "main")
      await setDoc(docRef, { ...config, updatedAt: Timestamp.now() }, { merge: true })
      toast.success("MLM configuration saved successfully")
    } catch (error) {
      console.error("Error saving MLM config:", error)
      toast.error("Failed to save MLM configuration")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading MLM configuration...</div>
  }

  return (
    <div className="space-y-8">
      {/* Binary Plan Configuration */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Binary Plan Configuration</h3>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="binaryEnabled"
              checked={config.binaryPlan.enabled}
              onChange={(e) =>
                setConfig({
                  ...config,
                  binaryPlan: { ...config.binaryPlan, enabled: e.target.checked },
                })
              }
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="binaryEnabled" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Enable Binary Plan
            </label>
          </div>

          {config.binaryPlan.enabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Binary Ratio</label>
                  <input
                    type="text"
                    value={config.binaryPlan.ratio}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        binaryPlan: { ...config.binaryPlan, ratio: e.target.value },
                      })
                    }
                    placeholder="e.g., 1:1, 2:1"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pair Value</label>
                  <input
                    type="number"
                    value={config.binaryPlan.pairValue}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        binaryPlan: { ...config.binaryPlan, pairValue: Number(e.target.value) },
                      })
                    }
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="carryForward"
                  checked={config.binaryPlan.carryForward}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      binaryPlan: { ...config.binaryPlan, carryForward: e.target.checked },
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="carryForward" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Enable Carry Forward
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Weak Leg Calculation
                </label>
                <select
                  value={config.binaryPlan.weakLegCalculation}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      binaryPlan: { ...config.binaryPlan, weakLegCalculation: e.target.value as any },
                    })
                  }
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Direct Income Configuration */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Direct Income Configuration</h3>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="directEnabled"
              checked={config.directIncome.enabled}
              onChange={(e) =>
                setConfig({
                  ...config,
                  directIncome: { ...config.directIncome, enabled: e.target.checked },
                })
              }
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="directEnabled" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Enable Direct Income
            </label>
          </div>

          {config.directIncome.enabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Income Type</label>
                  <select
                    value={config.directIncome.type}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        directIncome: { ...config.directIncome, type: e.target.value as any },
                      })
                    }
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Value {config.directIncome.type === "percentage" ? "(%)" : ""}
                  </label>
                  <input
                    type="number"
                    value={config.directIncome.value}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        directIncome: { ...config.directIncome, value: Number(e.target.value) },
                      })
                    }
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="instantCredit"
                  checked={config.directIncome.instantCredit}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      directIncome: { ...config.directIncome, instantCredit: e.target.checked },
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="instantCredit" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Instant Credit
                </label>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Matching Income Configuration */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Matching Income Configuration</h3>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="matchingEnabled"
              checked={config.matchingIncome.enabled}
              onChange={(e) =>
                setConfig({
                  ...config,
                  matchingIncome: { ...config.matchingIncome, enabled: e.target.checked },
                })
              }
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="matchingEnabled" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Enable Matching Income
            </label>
          </div>

          {config.matchingIncome.enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Number of Levels</label>
                <input
                  type="number"
                  value={config.matchingIncome.levels}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      matchingIncome: { ...config.matchingIncome, levels: Number(e.target.value) },
                    })
                  }
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Percentage Per Level (comma-separated)
                </label>
                <input
                  type="text"
                  value={config.matchingIncome.percentagePerLevel.join(", ")}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      matchingIncome: {
                        ...config.matchingIncome,
                        percentagePerLevel: e.target.value.split(",").map((v) => Number(v.trim())),
                      },
                    })
                  }
                  placeholder="10, 5, 3, 2, 1"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Global Limits */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Global Limits</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Max Depth</label>
            <input
              type="number"
              value={config.globalLimits.maxDepth}
              onChange={(e) =>
                setConfig({
                  ...config,
                  globalLimits: { ...config.globalLimits, maxDepth: Number(e.target.value) },
                })
              }
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Antifraud Threshold</label>
            <input
              type="number"
              value={config.globalLimits.antifraudThreshold}
              onChange={(e) =>
                setConfig({
                  ...config,
                  globalLimits: { ...config.globalLimits, antifraudThreshold: Number(e.target.value) },
                })
              }
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
        >
          {saving ? "Saving..." : "Save Configuration"}
        </button>
      </div>
    </div>
  )
}
