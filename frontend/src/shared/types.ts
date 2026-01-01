// ==================== AUTHENTICATION & ROLES ====================
export type UserRole = "super_admin" | "company_admin" | "user"

// ==================== COMPANY & SUPER ADMIN ====================
export interface Company {
  id: string
  name: string
  code: string
  adminEmail: string
  defaultCurrency: string
  country: string
  timezone: string
  language: string
  domain?: string
  status: "active" | "suspended" | "deleted"
  demoMode: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CompanySettings {
  companyId: string
  name?: string // Alias for appName
  appName?: string
  logo?: string
  logoDark?: string
  primaryColor?: string // Alias for brandColors.primary
  secondaryColor?: string // Alias for brandColors.secondary
  brandColors?: {
    primary: string
    secondary: string
    accent: string
  }
  fontFamily?: string
  currency?: string
  currencySymbol?: string
  language?: string
  timezone?: string
  emailTemplates?: Record<string, string>
  smsTemplates?: Record<string, string>
}

// ==================== MLM CONFIGURATION ====================
export interface MLMConfig {
  companyId: string
  spilloverMode?: 'auto' | 'manual'
  binaryPlan?: {
    enabled: boolean
    ratio: string // e.g., "1:1", "2:1"
    pairValue: number
    carryForward: boolean
    flushOutRules: string
    weakLegCalculation: "left" | "right" | "auto"
    pairingTiming: "realtime" | "cron"
    dailyCapping?: number
    weeklyCapping?: number
    monthlyCapping?: number
  }
  binaryMatching?: {
    enabled: boolean
    pairRatio: string // e.g., "1:1", "2:1"
    pairIncome: number
    cappingPeriod?: 'daily' | 'weekly' | 'monthly'
    cappingAmount?: number
    carryForward?: boolean
    flushOut?: boolean
    weakLegLogic?: 'left' | 'right' | 'smaller'
  }
  directIncome: {
    enabled: boolean
    type: "fixed" | "percentage"
    value: number
    packageBased?: Record<string, number>
    basedOnPackage?: boolean // Alias for packageBased
    instantCredit?: boolean
    creditTiming?: "instant" | "delayed" // Alias for instantCredit
    delayHours?: number
    eligibilityRules?: string
    autoDisableIfInactive?: boolean
  }
  matchingIncome?: {
    enabled: boolean
    levels: number
    percentagePerLevel: number[]
    qualificationConditions?: string
    compressionLogic?: string
  }
  sponsorMatching?: {
    enabled: boolean
    levels: number | Array<{
      level: number
      percentage: number
      qualification: {
        teamVolume?: number
        pairs?: number
        directs?: number
      }
    }>
    percentagePerLevel?: number[]
    qualificationConditions?: string
    autoDisableIfInactive?: boolean
    inactiveDays?: number
  }
  repurchaseIncome?: {
    enabled: boolean
    repurchaseBV: number
    distributionPercentage?: number
    incomePercentage?: number // Alias for distributionPercentage
    eligibleUplineDepth?: number
    eligibleLevels?: number[] // Array of eligible levels
    monthlyReset?: boolean
    monthlyQualification?: boolean // Alias for monthlyReset
  }
  ranks?: Rank[]
  globalLimits?: {
    maxDepth: number
    antifraudThreshold: number
    minPairsForIncome: number
  }
  updatedAt?: Date
  updatedBy?: string
}

export interface Rank {
  id: string
  name: string
  level?: number
  requirements?: {
    pairs?: number
    teamVolume?: number
    directs?: number
  }
  qualification?: {
    pairs?: number
    teamVolume?: number
    directs?: number
  }
  rewards?: Record<string, any>
  isAutomatic?: boolean
  autoAssign?: boolean
}

export interface Package {
  id: string
  companyId: string
  name: string
  bv: number
  price: number
  activationRequired: boolean
  repurchaseEligible: boolean
  allowUpgrade: boolean
  allowDowngrade: boolean
}

// ==================== USER & PROFILE ====================
export interface User {
  id: string
  companyId: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  sponsorId?: string
  placementSide?: "left" | "right"
  placementUnderUserId?: string
  packageId: string
  packageBV?: number
  status: "active" | "inactive" | "blocked" | "pending"
  kycStatus: "pending" | "approved" | "rejected"
  kycData?: Record<string, any>
  registrationDate: Date
  lastActiveDate?: Date
  blockedIncome: boolean
  blockedWithdrawals: boolean
  rankId?: string
  metadata?: Record<string, any>
}

export interface BinaryPosition {
  userId: string
  left?: string // user ID
  right?: string // user ID
  leftVolume: number
  rightVolume: number
}

export interface BinaryTreeData {
  userId: string
  companyId: string
  leftLegId?: string | null
  rightLegId?: string | null
  leftVolume: number
  rightVolume: number
  totalVolume: number
  leftCount: number
  rightCount: number
  totalCount: number
  lastUpdated?: Date
}

// ==================== WALLET & INCOME ====================
export interface Wallet {
  userId: string
  companyId: string
  availableBalance: number
  lockedBalance: number
  totalWithdrawn: number
  withdrawnBalance?: number // Alias for totalWithdrawn
  totalEarned: number
  totalEarnings?: number // Alias for totalEarned
  currency?: string
  currencySymbol?: string
  isFrozen?: boolean
  lastUpdated: Date
}

export interface IncomeTransaction {
  id: string
  companyId: string
  userId: string
  incomeType: "direct" | "matching" | "sponsor_matching" | "repurchase" | "bonus"
  amount: number
  sourceUserId?: string // who generated this income
  description: string
  status: "pending" | "credited" | "reversed"
  createdAt: Date
  creditedAt?: Date
}

export interface Withdrawal {
  id: string
  companyId: string
  userId: string
  amount: number
  requestedAmount: number
  adminCharges: number
  tds: number
  netAmount?: number
  currency?: string
  currencySymbol?: string
  status: "pending" | "approved" | "rejected" | "processed" | "cancelled"
  bankDetails?: {
    accountName: string
    accountNumber: string
    ifscCode: string
    bankName: string
  }
  notes?: string
  remarks?: string
  requestedAt: Date
  processedAt?: Date
  processedBy?: string
}

export interface WithdrawalSettings {
  companyId: string
  minimumWithdrawal: number
  adminCharges: number
  tdsPercentage: number
  withdrawalSchedule: "daily" | "weekly" | "monthly"
  approvalRequired: boolean
  currency?: string
  currencySymbol?: string
  charges?: {
    type: 'fixed' | 'percentage'
    value: number
  }
  tds?: {
    enabled: boolean
    percentage: number
    threshold?: number
  }
  adminFee?: {
    enabled: boolean
    type: 'fixed' | 'percentage'
    value: number
  }
}

// Alias for backward compatibility
export type WithdrawalConfig = WithdrawalSettings

// ==================== AUDIT & LOGGING ====================
export interface AuditLog {
  id: string
  companyId: string
  userId: string // User/admin who performed the action
  adminId?: string // Alias for userId (for backward compatibility)
  action: string
  resource?: string // Resource type (e.g., 'users', 'withdrawals')
  resourceId?: string // ID of the resource
  targetUserId?: string
  changes?: Record<string, any>
  timestamp?: Date // Alias for createdAt
  createdAt?: Date // Primary timestamp field
  ipAddress?: string
  userAgent?: string
}

export interface IncomeAdjustmentLog {
  id: string
  companyId: string
  adminId: string
  userId: string
  adjustmentAmount: number
  reason: string
  timestamp: Date
  originalIncome: number
  adjustedIncome: number
}

// ==================== COMMUNICATION ====================
export interface Announcement {
  id: string
  companyId: string
  title: string
  content: string
  type: "info" | "warning" | "success" | "error"
  createdBy: string
  createdAt: Date
  expiresAt?: Date
  targetAudience?: "all" | "users" | "admins"
  isActive?: boolean
}

export interface Notification {
  id: string
  userId: string
  companyId: string
  title: string
  message: string
  type: "income" | "rank" | "announcement" | "withdrawal" | "system"
  read: boolean
  createdAt: Date
  expiresAt?: Date
}

// ==================== ANALYTICS ====================
export interface CompanyAnalytics {
  companyId: string
  date: Date
  totalUsers: number
  activeUsers: number
  newRegistrations: number
  totalVolume: number
  totalIncome: number
  totalWithdrawals: number
  totalPairs?: number
  averageTeamSize: number
  incomeByType?: Record<string, number>
}

export interface UserAnalytics {
  userId: string
  companyId: string
  totalIncome: number
  incomeByType: Record<string, number>
  teamSize: number
  leftLegSize: number
  rightLegSize: number
  currentRank: string
  activePairs: number
}
