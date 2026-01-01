// ==================== SAAS BILLING TYPES ====================

export type PlanTier = "starter" | "professional" | "enterprise"
export type BillingCycle = "monthly" | "yearly"
export type SubscriptionStatus = "active" | "past_due" | "suspended" | "cancelled" | "trial"

export interface SubscriptionPlan {
  id: string
  name: string
  tier: PlanTier
  description: string
  price: {
    monthly: number
    yearly: number
  }
  currency: string
  features: PlanFeature[]
  limits: PlanLimits
  isActive: boolean
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface PlanFeature {
  id: string
  name: string
  description: string
  enabled: boolean
  icon?: string
}

export interface PlanLimits {
  maxUsers: number
  maxAdmins: number
  maxCompanies?: number // For super admin
  binariesEnabled: boolean
  customBrandingEnabled: boolean
  apiAccessEnabled: boolean
  advancedAnalyticsEnabled: boolean
  prioritySupportEnabled: boolean
  maxCustomIncomeStreams: number
  monthlyIncomeCapIfApplies?: number
  storageInGB: number
}

export interface CompanySubscription {
  id: string
  companyId: string
  planId: string
  tier: PlanTier
  status: SubscriptionStatus
  currentCycle: {
    startDate: Date
    endDate: Date
    invoiceId?: string
  }
  billingCycle: BillingCycle
  autoRenew: boolean
  trialEndsAt?: Date
  isTrialActive: boolean
  razorpaySubscriptionId?: string
  razorpayCustomerId?: string
  nextBillingDate: Date
  cancelledAt?: Date
  cancelReason?: string
  featureUsage: FeatureUsage
  createdAt: Date
  updatedAt: Date
}

export interface FeatureUsage {
  activeUsers: number
  admins: number
  monthlyIncomeProcessed: number
  storageUsedInGB: number
  apiCallsThisMonth: number
  lastUpdatedAt: Date
}

export interface BillingInvoice {
  id: string
  companyId: string
  subscriptionId: string
  invoiceNumber: string
  amount: number
  currency: string
  tax?: number
  discount?: number
  finalAmount: number
  status: "draft" | "issued" | "paid" | "partially_paid" | "failed" | "refunded"
  billingPeriodStart: Date
  billingPeriodEnd: Date
  dueDate: Date
  paidAt?: Date
  razorpayInvoiceId?: string
  pdfUrl?: string
  items: InvoiceItem[]
  createdAt: Date
  updatedAt: Date
}

export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  amount: number
  taxable: boolean
}

export interface PaymentMethod {
  id: string
  companyId: string
  razorpayPaymentMethodId?: string
  type: "card" | "netbanking" | "upi" | "wallet"
  isDefault: boolean
  lastUsedAt?: Date
  expiryDate?: Date
  maskedDetails: string // Last 4 digits for cards, etc
  createdAt: Date
}

export interface RazorpayWebhookEvent {
  event: string
  created_at: number
  entity: {
    id: string
    entity: string
    [key: string]: any
  }
}

export interface BillingEvent {
  id: string
  companyId: string
  eventType:
    | "subscription_created"
    | "subscription_renewed"
    | "subscription_paused"
    | "subscription_resumed"
    | "subscription_cancelled"
    | "payment_successful"
    | "payment_failed"
    | "invoice_generated"
  companyName: string
  details: Record<string, any>
  processedAt: Date
  retryCount?: number
}

export interface TrialConfig {
  durationDays: number
  maxUsersInTrial: number
  allowFullFeatures: boolean
  requirePaymentMethodOnSignup: boolean
  trialConversionRate?: number
}

export interface CompanyBillingHistory {
  companyId: string
  currentPlan: SubscriptionPlan
  currentSubscription: CompanySubscription
  recentInvoices: BillingInvoice[]
  paymentMethods: PaymentMethod[]
  upcomingInvoice?: BillingInvoice
  totalSpentYTD: number
  nextPaymentDueDate: Date
}

export interface UsageAlert {
  id: string
  companyId: string
  alertType: "approaching_limit" | "limit_exceeded" | "trial_ending_soon"
  feature: string
  currentUsage: number
  limit: number
  severity: "warning" | "critical"
  sentAt: Date
  acknowledgedAt?: Date
}
