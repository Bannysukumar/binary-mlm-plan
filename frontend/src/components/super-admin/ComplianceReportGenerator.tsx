"use client"

import { useState } from "react"
import { FileText, Download } from "lucide-react"
import { auditService } from "@/lib/audit-service"
import { complianceCheckService } from "@/lib/compliance-service"

export function ComplianceReportGenerator() {
  const [generating, setGenerating] = useState(false)
  const [reportData, setReportData] = useState<any>(null)

  async function generateReport() {
    setGenerating(true)
    try {
      const [auditLogs, complianceCheck] = await Promise.all([
        auditService.getGlobalLogs(undefined, 1000),
        complianceCheckService.runComplianceCheck("global"),
      ])

      // Calculate compliance metrics
      const totalLogs = auditLogs.length
      const failedOps = auditLogs.filter((l) => l.status === "failed").length
      const criticalActions = auditLogs.filter((l) => l.severity === "critical").length

      const report = {
        generatedAt: new Date(),
        period: "Last 30 days",
        summary: {
          totalAdminActions: totalLogs,
          failedOperations: failedOps,
          successRate: ((1 - failedOps / totalLogs) * 100).toFixed(2),
          criticalEvents: criticalActions,
        },
        complianceStatus: complianceCheck,
        categoryBreakdown: (() => {
          const breakdown: Record<string, number> = {}
          auditLogs.forEach((log) => {
            breakdown[log.actionCategory] = (breakdown[log.actionCategory] || 0) + 1
          })
          return breakdown
        })(),
      }

      setReportData(report)
    } catch (error) {
      alert(`Failed to generate report: ${error}`)
    } finally {
      setGenerating(false)
    }
  }

  function downloadReport() {
    if (!reportData) return

    const csv = [
      ["Compliance & Audit Report"],
      ["Generated:", reportData.generatedAt],
      [],
      ["SUMMARY"],
      ["Total Admin Actions", reportData.summary.totalAdminActions],
      ["Failed Operations", reportData.summary.failedOperations],
      ["Success Rate", reportData.summary.successRate + "%"],
      ["Critical Events", reportData.summary.criticalEvents],
      [],
      ["COMPLIANCE STATUS"],
      ["Compliant", reportData.complianceStatus.isCompliant],
      ["Risk Level", reportData.complianceStatus.riskLevel],
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `compliance-report-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  return (
    <div className="rounded-lg border p-6">
      <h3 className="flex items-center gap-2 font-semibold text-lg mb-4">
        <FileText className="h-5 w-5" />
        Compliance Report Generator
      </h3>

      {!reportData ? (
        <button
          onClick={generateReport}
          disabled={generating}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {generating ? "Generating..." : "Generate Compliance Report"}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-700">Total Admin Actions</span>
              <span className="font-bold">{reportData.summary.totalAdminActions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Success Rate</span>
              <span className="font-bold text-green-600">{reportData.summary.successRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Critical Events</span>
              <span className="font-bold text-red-600">{reportData.summary.criticalEvents}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Compliance Status</span>
              <span
                className={`font-bold ${reportData.complianceStatus.isCompliant ? "text-green-600" : "text-red-600"}`}
              >
                {reportData.complianceStatus.isCompliant ? "Compliant" : "Non-Compliant"}
              </span>
            </div>
          </div>

          <button
            onClick={downloadReport}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download CSV Report
          </button>

          <button onClick={() => setReportData(null)} className="w-full px-4 py-2 border rounded-md hover:bg-gray-50">
            Generate New Report
          </button>
        </div>
      )}
    </div>
  )
}
