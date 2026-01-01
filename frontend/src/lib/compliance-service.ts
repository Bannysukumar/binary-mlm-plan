import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore"
import { db } from "./firebase"
import type {
  ComplianceDocument,
  ComplianceConfig,
  KYCSubmission,
  ComplianceAuditLog,
  MLMComplianceReport,
  ComplianceCheckResult,
  ComplianceViolation,
} from "@/shared/compliance-types"

export const complianceDocumentService = {
  async create(doc_data: Omit<ComplianceDocument, "id" | "createdAt" | "updatedAt">) {
    const docRef = doc(collection(db, "companies", doc_data.companyId, "complianceDocuments"))
    const timestamp = Timestamp.now()
    await setDoc(docRef, {
      ...doc_data,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    return docRef.id
  },

  async getLatestByType(companyId: string, type: string) {
    const q = query(
      collection(db, "companies", companyId, "complianceDocuments"),
      where("type", "==", type),
      where("isActive", "==", true),
      orderBy("effectiveDate", "desc"),
    )
    const snapshot = await getDocs(q)
    return snapshot.empty ? null : (snapshot.docs[0].data() as ComplianceDocument)
  },

  async getAllByType(companyId: string, type: string) {
    const q = query(
      collection(db, "companies", companyId, "complianceDocuments"),
      where("type", "==", type),
      orderBy("version", "desc"),
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ComplianceDocument)
  },

  async update(companyId: string, documentId: string, data: Partial<ComplianceDocument>) {
    const docRef = doc(db, "companies", companyId, "complianceDocuments", documentId)
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    })
  },

  async deactivatePrevious(companyId: string, type: string) {
    const docs = await this.getAllByType(companyId, type)
    const batch = writeBatch(db)
    for (const document of docs) {
      const docRef = doc(db, "companies", companyId, "complianceDocuments", document.id)
      batch.update(docRef, { isActive: false })
    }
    await batch.commit()
  },
}

export const complianceConfigService = {
  async get(companyId: string): Promise<ComplianceConfig | null> {
    const docRef = doc(db, "companies", companyId, "settings", "compliance")
    const docSnap = await getDoc(docRef)
    return docSnap.exists() ? (docSnap.data() as ComplianceConfig) : null
  },

  async getOrCreateDefault(companyId: string): Promise<ComplianceConfig> {
    const existing = await this.get(companyId)
    if (existing) return existing

    const defaultConfig: ComplianceConfig = {
      companyId,
      region: "global",
      kycRequired: true,
      kycVerificationMethod: "manual",
      kycApprovalRequired: true,
      blockCountries: [],
      minAgeRequired: 18,
      incomeDisclaimerRequired: true,
      termsAcceptanceRequired: true,
      privacyPolicyRequired: true,
      mlmDisclosureRequired: true,
      monthlyComplianceAudit: true,
      maxPayoutPercentageOfVolume: 60, // 60% for India
      minProductPurchasePercentage: 40,
      updatedAt: new Date(),
    }

    const docRef = doc(db, "companies", companyId, "settings", "compliance")
    await setDoc(docRef, defaultConfig)
    return defaultConfig
  },

  async update(companyId: string, config: Partial<ComplianceConfig>) {
    const docRef = doc(db, "companies", companyId, "settings", "compliance")
    await updateDoc(docRef, {
      ...config,
      updatedAt: Timestamp.now(),
    })
  },
}

export const kycService = {
  async submit(companyId: string, submission: Omit<KYCSubmission, "id" | "submittedAt">) {
    const docRef = doc(collection(db, "companies", companyId, "kycSubmissions"))
    await setDoc(docRef, {
      ...submission,
      submittedAt: Timestamp.now(),
    })
    return docRef.id
  },

  async getByUser(companyId: string, userId: string): Promise<KYCSubmission | null> {
    const q = query(
      collection(db, "companies", companyId, "kycSubmissions"),
      where("userId", "==", userId),
      orderBy("submittedAt", "desc"),
    )
    const snapshot = await getDocs(q)
    return snapshot.empty ? null : (snapshot.docs[0].data() as KYCSubmission)
  },

  async approve(companyId: string, kycId: string, approvedBy: string, expiryDate?: Date) {
    const docRef = doc(db, "companies", companyId, "kycSubmissions", kycId)
    await updateDoc(docRef, {
      status: "approved",
      approvedAt: Timestamp.now(),
      verifiedBy: approvedBy,
      expiryDate: expiryDate ? Timestamp.fromDate(expiryDate) : undefined,
    })
  },

  async reject(companyId: string, kycId: string, rejectionReason: string) {
    const docRef = doc(db, "companies", companyId, "kycSubmissions", kycId)
    await updateDoc(docRef, {
      status: "rejected",
      rejectedAt: Timestamp.now(),
      rejectionReason,
    })
  },

  async requestResubmission(companyId: string, kycId: string, rejectionReason: string) {
    const docRef = doc(db, "companies", companyId, "kycSubmissions", kycId)
    await updateDoc(docRef, {
      status: "resubmission_required",
      rejectionReason,
    })
  },

  async getPendingApprovals(companyId: string) {
    const q = query(
      collection(db, "companies", companyId, "kycSubmissions"),
      where("status", "==", "pending"),
      orderBy("submittedAt", "desc"),
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as KYCSubmission)
  },
}

export const disclaimerService = {
  async recordAcceptance(
    companyId: string,
    userId: string,
    disclaimerVersion: number,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const docRef = doc(collection(db, "companies", companyId, "disclaimerAcceptances"))
    await setDoc(docRef, {
      userId,
      companyId,
      disclaimerVersion,
      acceptedAt: Timestamp.now(),
      ipAddress,
      userAgent,
    })
  },

  async hasAccepted(companyId: string, userId: string, disclaimerVersion: number): Promise<boolean> {
    const q = query(
      collection(db, "companies", companyId, "disclaimerAcceptances"),
      where("userId", "==", userId),
      where("disclaimerVersion", "==", disclaimerVersion),
    )
    const snapshot = await getDocs(q)
    return !snapshot.empty
  },
}

export const complianceAuditService = {
  async log(companyId: string, log: Omit<ComplianceAuditLog, "id" | "timestamp">) {
    const docRef = doc(collection(db, "companies", companyId, "complianceAudits"))
    await setDoc(docRef, {
      ...log,
      timestamp: Timestamp.now(),
    })
  },

  async getByUser(companyId: string, userId: string) {
    const q = query(
      collection(db, "companies", companyId, "complianceAudits"),
      where("targetUserId", "==", userId),
      orderBy("timestamp", "desc"),
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ComplianceAuditLog)
  },

  async getCriticalViolations(companyId: string) {
    const q = query(
      collection(db, "companies", companyId, "complianceAudits"),
      where("severity", "==", "critical"),
      where("resolvedAt", "==", null),
      orderBy("timestamp", "desc"),
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ComplianceAuditLog)
  },

  async resolve(companyId: string, auditId: string) {
    const docRef = doc(db, "companies", companyId, "complianceAudits", auditId)
    await updateDoc(docRef, {
      resolvedAt: Timestamp.now(),
    })
  },
}

export const complianceCheckService = {
  async runComplianceCheck(companyId: string): Promise<ComplianceCheckResult> {
    const violations: ComplianceViolation[] = []
    const warnings: string[] = []
    const config = await complianceConfigService.get(companyId)

    if (!config) {
      return {
        isCompliant: false,
        violations: [
          {
            type: "missing_config",
            severity: "critical",
            message: "Compliance config not set up",
            suggestedFix: "Configure compliance settings in admin panel",
          },
        ],
        warnings,
        riskLevel: "red",
        recommendedActions: ["Setup compliance configuration immediately"],
      }
    }

    // Check for required documents
    const tcs = await complianceDocumentService.getLatestByType(companyId, "terms_conditions")
    if (!tcs && config.termsAcceptanceRequired) {
      violations.push({
        type: "missing_document",
        severity: "critical",
        message: "Terms & Conditions not uploaded",
        suggestedFix: "Upload T&Cs document in compliance management",
      })
    }

    const disclaimer = await complianceDocumentService.getLatestByType(companyId, "income_disclaimer")
    if (!disclaimer && config.incomeDisclaimerRequired) {
      violations.push({
        type: "missing_document",
        severity: "critical",
        message: "Income Disclaimer not uploaded",
        suggestedFix: "Upload Income Disclaimer in compliance management",
      })
    }

    // Check KYC setup
    if (config.kycRequired && !config.kycVerificationMethod) {
      warnings.push("KYC is required but verification method not configured")
    }

    const riskLevel =
      violations.length > 0 ? (violations.some((v) => v.severity === "critical") ? "red" : "yellow") : "green"

    return {
      isCompliant: violations.length === 0 && riskLevel === "green",
      violations,
      warnings,
      riskLevel,
      recommendedActions: violations.map((v) => v.suggestedFix),
    }
  },

  async generateMonthlyReport(
    companyId: string,
    periodStartDate: Date,
    periodEndDate: Date,
  ): Promise<MLMComplianceReport> {
    // This would be implemented with actual company data
    // For now, return a template
    return {
      id: "",
      companyId,
      period: "monthly",
      periodStartDate,
      periodEndDate,
      totalMembers: 0,
      totalRevenue: 0,
      productSalesPercentage: 0,
      incomeFromRecruitment: 0,
      avgMonthlyIncomePerMember: 0,
      newMembersCount: 0,
      inactiveMembers: 0,
      complaintsReceived: 0,
      complaintsResolved: 0,
      violationsFound: [],
      isCompliant: true,
      generatedAt: new Date(),
    }
  },
}

import { writeBatch } from "firebase/firestore"
