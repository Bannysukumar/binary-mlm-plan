// ==================== LEGAL & COMPLIANCE TYPES ====================

export type ComplianceRegion = "india" | "us" | "global"

export interface ComplianceDocument {
  id: string
  companyId: string
  type: "terms_conditions" | "privacy_policy" | "income_disclaimer" | "mlm_disclosure"
  region: ComplianceRegion
  content: string
  version: number
  htmlContent?: string
  isActive: boolean
  effectiveDate: Date
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

export interface ComplianceConfig {
  companyId: string
  region: ComplianceRegion
  kycRequired: boolean
  kycVerificationMethod: "manual" | "automated" | "hybrid"
  kycApprovalRequired: boolean
  blockCountries: string[] // ISO country codes to block
  blockStates?: string[] // For India: block specific states
  minAgeRequired: number
  maxAgeAllowed?: number
  incomeDisclaimerRequired: boolean
  termsAcceptanceRequired: boolean
  privacyPolicyRequired: boolean
  mlmDisclosureRequired: boolean
  monthlyComplianceAudit: boolean
  maxPayoutPercentageOfVolume: number // India FMRDA rules
  minProductPurchasePercentage: number // % of income must be from products
  updatedAt: Date
}

export interface KYCSubmission {
  id: string
  userId: string
  companyId: string
  status: "pending" | "approved" | "rejected" | "resubmission_required"
  submittedAt: Date
  approvedAt?: Date
  rejectedAt?: Date
  rejectionReason?: string
  expiryDate?: Date // KYC validity period
  documents: KYCDocument[]
  personalInfo: {
    firstName: string
    lastName: string
    dateOfBirth: Date
    nationality: string
    state?: string
    city?: string
    postalCode?: string
    address: string
  }
  governmentId: {
    type: "aadhaar" | "pan" | "dl" | "passport"
    number: string
    issuedDate?: Date
    expiryDate?: Date
  }
  bankDetails?: {
    accountName: string
    accountNumber: string
    ifscCode: string
    bankName: string
  }
  verifiedBy?: string
}

export interface KYCDocument {
  id: string
  type: "id_proof" | "address_proof" | "bank_proof" | "income_proof"
  fileName: string
  fileUrl: string
  uploadedAt: Date
  verified: boolean
  verifiedAt?: Date
}

export interface ComplianceAuditLog {
  id: string
  companyId: string
  action: string
  targetUserId?: string
  details: Record<string, any>
  severity: "info" | "warning" | "critical"
  timestamp: Date
  resolvedAt?: Date
}

export interface IncomeDisclaimerAcceptance {
  id: string
  userId: string
  companyId: string
  disclaimerVersion: number
  acceptedAt: Date
  ipAddress?: string
  userAgent?: string
}

export interface MLMComplianceReport {
  id: string
  companyId: string
  period: "monthly" | "quarterly" | "annual"
  periodStartDate: Date
  periodEndDate: Date
  totalMembers: number
  totalRevenue: number
  productSalesPercentage: number // % of revenue from actual products
  incomeFromRecruitment: number // % income from recruitment
  avgMonthlyIncomePerMember: number
  newMembersCount: number
  inactiveMembers: number // Members with no activity
  complaintsReceived: number
  complaintsResolved: number
  violationsFound: string[]
  isCompliant: boolean
  notes?: string
  generatedAt: Date
}

export interface ComplianceCheckResult {
  isCompliant: boolean
  violations: ComplianceViolation[]
  warnings: string[]
  riskLevel: "green" | "yellow" | "red"
  recommendedActions: string[]
}

export interface ComplianceViolation {
  type: string
  severity: "warning" | "critical"
  message: string
  affectedUsers?: number
  suggestedFix: string
}

// Country-specific compliance configs
export interface IndiaComplianceConfig extends ComplianceConfig {
  fmdraCompliant: boolean
  maximumIncomePercentageFromRecruitment: number // Usually 40%
  minimumProductPercentage: number // Usually 60%
  mlmRegistrationNumber?: string
  directorPAN?: string
}

export interface CountryBlockList {
  companyId: string
  blockedCountries: {
    countryCode: string
    countryName: string
    reason: string
    blockedAt: Date
  }[]
  updatedAt: Date
}
