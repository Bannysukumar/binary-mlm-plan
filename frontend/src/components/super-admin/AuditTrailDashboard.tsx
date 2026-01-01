"use client"

import { useState, useEffect } from "react"
import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react"
import { auditService } from "@/lib/audit-service"
import type { AuditLogEntry } from "@/lib/audit-service"

export function AuditTrailDashboard() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [criticalLogs, setCriticalLogs] = useState<AuditLogEntry[]>([])
  const [failedLogs, setFailedLogs] = useState<AuditLogEntry[]>([])
  const [stats, setStats] = useState({
    totalLogsLast24h: 0,
    criticalActions: 0,
    failedOperations: 0,
    uniqueAdmins: 0,
  })
  const [activeFilter, setActiveFilter] = useState<"all" | "critical" | "failed">("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAuditData()
    const interval = setInterval(loadAuditData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  async function loadAuditData() {
    try {
      setLoading(true)
      const [global, critical, failed] = await Promise.all([
        auditService.getGlobalLogs(undefined, 50),
        auditService.getCriticalActions(24, 50),
        auditService.getFailedOperations(24, 50),
      ])

      setLogs(global)
      setCriticalLogs(critical)
      setFailedLogs(failed)

      // Calculate stats
      const uniqueAdmins = new Set(global.map((l) => l.adminId)).size
      setStats({
        totalLogsLast24h: global.length,
        criticalActions: critical.length,
        failedOperations: failed.length,
        uniqueAdmins,
      })
    } catch (error) {
      console.error("Failed to load audit logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const displayLogs = activeFilter === "critical" ? criticalLogs : activeFilter === "failed" ? failedLogs : logs

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6" />
          Admin Audit Trail
        </h2>
        <p className="mt-2 text-sm text-gray-600">Complete record of all admin actions and system events</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-600">Logs (24h)</p>
          <p className="mt-2 text-3xl font-bold">{stats.totalLogsLast24h}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-600">Critical Actions</p>
          <p className="mt-2 text-3xl font-bold text-red-600">{stats.criticalActions}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-600">Failed Operations</p>
          <p className="mt-2 text-3xl font-bold text-orange-600">{stats.failedOperations}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-600">Active Admins</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{stats.uniqueAdmins}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveFilter("all")}
          className={`px-4 py-2 rounded-md font-medium ${
            activeFilter === "all"
              ? "bg-indigo-600 text-white"
              : "border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          All Logs
        </button>
        <button
          onClick={() => setActiveFilter("critical")}
          className={`px-4 py-2 rounded-md font-medium flex items-center gap-2 ${
            activeFilter === "critical"
              ? "bg-red-600 text-white"
              : "border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          <AlertCircle className="h-4 w-4" />
          Critical ({stats.criticalActions})
        </button>
        <button
          onClick={() => setActiveFilter("failed")}
          className={`px-4 py-2 rounded-md font-medium flex items-center gap-2 ${
            activeFilter === "failed"
              ? "bg-orange-600 text-white"
              : "border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          <XCircle className="h-4 w-4" />
          Failed ({stats.failedOperations})
        </button>
      </div>

      {/* Log Table */}
      {!loading && displayLogs.length > 0 ? (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Timestamp</th>
                <th className="px-4 py-3 text-left font-semibold">Admin</th>
                <th className="px-4 py-3 text-left font-semibold">Action</th>
                <th className="px-4 py-3 text-left font-semibold">Category</th>
                <th className="px-4 py-3 text-left font-semibold">Target</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Severity</th>
              </tr>
            </thead>
            <tbody>
              {displayLogs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs">{log.adminEmail}</td>
                  <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="inline-block px-2 py-1 rounded bg-blue-100 text-blue-800 capitalize">
                      {log.actionCategory}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {log.targetName ? `${log.targetName} (${log.targetType})` : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {log.status === "success" ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        Success
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600">
                        <XCircle className="h-4 w-4" />
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize ${
                        log.severity === "critical"
                          ? "bg-red-100 text-red-800"
                          : log.severity === "warning"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {log.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-gray-500">{loading ? "Loading audit logs..." : "No logs found"}</p>
        </div>
      )}

      {/* Compliance Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border p-4">
          <p className="font-semibold mb-3">Top Actions (24h)</p>
          <div className="space-y-2 text-sm">
            {logs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex justify-between">
                <span>{log.action}</span>
                <span className="text-gray-500">{log.adminEmail.split("@")[0]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <p className="font-semibold mb-3">Action Categories</p>
          <div className="space-y-2 text-sm">
            {(() => {
              const categories: Record<string, number> = {}
              logs.forEach((log) => {
                categories[log.actionCategory] = (categories[log.actionCategory] || 0) + 1
              })
              return Object.entries(categories)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([cat, count]) => (
                  <div key={cat} className="flex justify-between">
                    <span className="capitalize">{cat}</span>
                    <span className="text-gray-500 font-medium">{count}</span>
                  </div>
                ))
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}
