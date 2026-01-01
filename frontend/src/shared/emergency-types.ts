// ==================== EMERGENCY CONTROLS TYPES ====================

export type EmergencyAction = "payout_freeze" | "income_pause" | "user_block" | "company_freeze" | "maintenance_mode"
export type FreezeLevel = "global" | "company" | "user"
export type FreezePriority = "low" | "medium" | "high" | "critical"

export interface EmergencyControl {
  id: string
  action: EmergencyAction
  level: FreezeLevel
  priority: FreezePriority
  targetId?: string // companyId or userId if applicable
  reason: string
  description?: string
  activatedAt: Date
  deactivatedAt?: Date
  isActive: boolean
  activatedBy: string
  autoExpireAt?: Date // Auto-deactivate after this time
  affectedEntities: {
    companiesCount?: number
    usersCount?: number
  }
  rollbackRequired: boolean
  rollbackInstructions?: string
  createdAt: Date
}

export interface EmergencyEvent {
  id: string
  emergencyControlId: string
  eventType: "activated" | "deactivated" | "auto_expired" | "escalated" | "resolved"
  details: Record<string, any>
  severity: "info" | "warning" | "critical"
  timestamp: Date
  actedBy?: string
}

export interface PayoutFreezeConfig {
  id: string
  companyId: string
  isFrozen: boolean
  globalFreeze: boolean
  freezeReason?: string
  estimatedUnfreezeTime?: Date
  allowManualApprovals?: boolean
  currentPayoutsCount: number
  currentPayoutValue: number
  createdAt: Date
  updatedAt: Date
}

export interface IncomeDistributionState {
  companyId: string
  isPaused: boolean
  pauseReason?: string
  pausedAt?: Date
  resumeAt?: Date
  affectedIncomeTypes: string[]
  manualOverrideAllowed?: boolean
  backlogSize: number
}

export interface UserBlockList {
  id: string
  userId: string
  companyId: string
  blockReason: string
  blockType: "temporary" | "permanent"
  blockedAt: Date
  unblockDate?: Date
  affectedFeatures: ("income" | "withdrawals" | "login" | "trading")[]
  blockingAdmin: string
  approvalRequired?: boolean
}

export interface MaintenanceMode {
  id: string
  companyId?: string
  isActive: boolean
  message: string
  maintenanceType: "scheduled" | "emergency"
  startTime: Date
  estimatedEndTime?: Date
  allowedAdminOnly: boolean
  allowedRoles?: string[]
  createdBy: string
  createdAt: Date
}

export interface GlobalIncomeRollback {
  id: string
  requestedAt: Date
  approvedAt?: Date
  completedAt?: Date
  companyId: string
  fromDate: Date
  toDate: Date
  incomeTypesToRollback: string[]
  estimatedAffected: number
  status: "pending" | "approved" | "in_progress" | "completed" | "failed"
  reason: string
  requestedBy: string
  approvedBy?: string
  executedBy?: string
  rollbackSummary?: {
    totalAmount: number
    transactionsRolledBack: number
    walletsAffected: number
  }
}

export interface EmergencyDashboardMetrics {
  activeControls: number
  frozenCompanies: number
  pausedIncomeDistribution: number
  blockedUsers: number
  maintenanceModeActive: boolean
  recentEvents: EmergencyEvent[]
  systemHealthScore: number // 0-100
}

export interface RollbackLog {
  id: string
  rollbackId: string
  transactionId: string
  userId: string
  companyId: string
  originalAmount: number
  reversalAmount: number
  status: "pending" | "completed" | "failed"
  failureReason?: string
  processedAt: Date
}
