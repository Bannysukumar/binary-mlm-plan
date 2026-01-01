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
  limit,
  Timestamp,
  increment,
  writeBatch,
} from "firebase/firestore"
import { db } from "./firebase"
import type {
  SubscriptionPlan,
  CompanySubscription,
  BillingInvoice,
  PaymentMethod,
  BillingEvent,
  UsageAlert,
} from "@/shared/billing-types"

export const planService = {
  async getAll(): Promise<SubscriptionPlan[]> {
    const q = query(collection(db, "subscriptionPlans"), where("isActive", "==", true), orderBy("displayOrder"))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as SubscriptionPlan)
  },

  async getById(planId: string): Promise<SubscriptionPlan | null> {
    const docRef = doc(db, "subscriptionPlans", planId)
    const docSnap = await getDoc(docRef)
    return docSnap.exists() ? (docSnap.data() as SubscriptionPlan) : null
  },

  async create(plan: Omit<SubscriptionPlan, "id" | "createdAt" | "updatedAt">) {
    const docRef = doc(collection(db, "subscriptionPlans"))
    const timestamp = Timestamp.now()
    await setDoc(docRef, {
      ...plan,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    return docRef.id
  },

  async update(planId: string, data: Partial<SubscriptionPlan>) {
    const docRef = doc(db, "subscriptionPlans", planId)
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    })
  },
}

export const subscriptionService = {
  async create(companyId: string, subscription: Omit<CompanySubscription, "id" | "createdAt" | "updatedAt">) {
    const docRef = doc(collection(db, "companies", companyId, "subscriptions"))
    const timestamp = Timestamp.now()
    await setDoc(docRef, {
      ...subscription,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    return docRef.id
  },

  async getActive(companyId: string): Promise<CompanySubscription | null> {
    const q = query(
      collection(db, "companies", companyId, "subscriptions"),
      where("status", "in", ["active", "trial"]),
      orderBy("createdAt", "desc"),
      limit(1),
    )
    const snapshot = await getDocs(q)
    return snapshot.empty ? null : (snapshot.docs[0].data() as CompanySubscription)
  },

  async getById(companyId: string, subscriptionId: string): Promise<CompanySubscription | null> {
    const docRef = doc(db, "companies", companyId, "subscriptions", subscriptionId)
    const docSnap = await getDoc(docRef)
    return docSnap.exists() ? (docSnap.data() as CompanySubscription) : null
  },

  async update(companyId: string, subscriptionId: string, data: Partial<CompanySubscription>) {
    const docRef = doc(db, "companies", companyId, "subscriptions", subscriptionId)
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    })
  },

  async suspend(companyId: string, subscriptionId: string, reason?: string) {
    const docRef = doc(db, "companies", companyId, "subscriptions", subscriptionId)
    await updateDoc(docRef, {
      status: "suspended",
      updatedAt: Timestamp.now(),
    })
    // Log billing event
    await billingEventService.log(companyId, {
      companyId,
      eventType: "subscription_paused",
      companyName: "",
      details: { reason, subscriptionId },
    })
  },

  async cancel(companyId: string, subscriptionId: string, reason?: string) {
    const docRef = doc(db, "companies", companyId, "subscriptions", subscriptionId)
    await updateDoc(docRef, {
      status: "cancelled",
      cancelledAt: Timestamp.now(),
      cancelReason: reason,
      updatedAt: Timestamp.now(),
    })
  },

  async updateFeatureUsage(companyId: string, subscriptionId: string, updates: Record<string, number>) {
    const docRef = doc(db, "companies", companyId, "subscriptions", subscriptionId)
    const updateData: Record<string, any> = {}
    for (const [key, value] of Object.entries(updates)) {
      updateData[`featureUsage.${key}`] = increment(value)
    }
    updateData["featureUsage.lastUpdatedAt"] = Timestamp.now()
    await updateDoc(docRef, updateData)
  },
}

export const invoiceService = {
  async create(companyId: string, invoice: Omit<BillingInvoice, "id" | "createdAt" | "updatedAt">) {
    const docRef = doc(collection(db, "companies", companyId, "invoices"))
    const timestamp = Timestamp.now()
    await setDoc(docRef, {
      ...invoice,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    return docRef.id
  },

  async getById(companyId: string, invoiceId: string): Promise<BillingInvoice | null> {
    const docRef = doc(db, "companies", companyId, "invoices", invoiceId)
    const docSnap = await getDoc(docRef)
    return docSnap.exists() ? (docSnap.data() as BillingInvoice) : null
  },

  async listRecent(companyId: string, limitCount = 12) {
    const q = query(collection(db, "companies", companyId, "invoices"), orderBy("createdAt", "desc"), limit(limitCount))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as BillingInvoice)
  },

  async update(companyId: string, invoiceId: string, data: Partial<BillingInvoice>) {
    const docRef = doc(db, "companies", companyId, "invoices", invoiceId)
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    })
  },

  async markAsPaid(companyId: string, invoiceId: string) {
    const docRef = doc(db, "companies", companyId, "invoices", invoiceId)
    await updateDoc(docRef, {
      status: "paid",
      paidAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
  },

  async markAsFailed(companyId: string, invoiceId: string) {
    const docRef = doc(db, "companies", companyId, "invoices", invoiceId)
    await updateDoc(docRef, {
      status: "failed",
      updatedAt: Timestamp.now(),
    })
  },
}

export const paymentMethodService = {
  async create(companyId: string, method: Omit<PaymentMethod, "id" | "createdAt">) {
    const docRef = doc(collection(db, "companies", companyId, "paymentMethods"))
    await setDoc(docRef, {
      ...method,
      createdAt: Timestamp.now(),
    })
    return docRef.id
  },

  async getDefault(companyId: string): Promise<PaymentMethod | null> {
    const q = query(collection(db, "companies", companyId, "paymentMethods"), where("isDefault", "==", true), limit(1))
    const snapshot = await getDocs(q)
    return snapshot.empty ? null : (snapshot.docs[0].data() as PaymentMethod)
  },

  async listAll(companyId: string) {
    const q = query(collection(db, "companies", companyId, "paymentMethods"), orderBy("createdAt", "desc"))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as PaymentMethod)
  },

  async setAsDefault(companyId: string, methodId: string) {
    const batch = writeBatch(db)
    // Unset all defaults
    const allMethods = await this.listAll(companyId)
    for (const method of allMethods) {
      batch.update(doc(db, "companies", companyId, "paymentMethods", method.id), { isDefault: false })
    }
    // Set new default
    batch.update(doc(db, "companies", companyId, "paymentMethods", methodId), { isDefault: true })
    await batch.commit()
  },

  async delete(companyId: string, methodId: string) {
    const docRef = doc(db, "companies", companyId, "paymentMethods", methodId)
    // Soft delete by marking as inactive or hard delete
    await updateDoc(docRef, { isDefault: false })
  },
}

export const billingEventService = {
  async log(companyId: string, event: Omit<BillingEvent, "id" | "processedAt">) {
    const docRef = doc(collection(db, "companies", companyId, "billingEvents"))
    await setDoc(docRef, {
      ...event,
      processedAt: Timestamp.now(),
    })
    return docRef.id
  },

  async listRecent(companyId: string, limitCount = 50) {
    const q = query(
      collection(db, "companies", companyId, "billingEvents"),
      orderBy("processedAt", "desc"),
      limit(limitCount),
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as BillingEvent)
  },
}

export const usageAlertService = {
  async checkAndCreateAlerts(companyId: string, subscription: CompanySubscription) {
    const plan = await planService.getById(subscription.planId)
    if (!plan) return

    const alerts: Omit<UsageAlert, "id" | "sentAt">[] = []

    // Check active users
    if (subscription.featureUsage.activeUsers >= plan.limits.maxUsers * 0.8) {
      alerts.push({
        companyId,
        alertType: "approaching_limit",
        feature: "activeUsers",
        currentUsage: subscription.featureUsage.activeUsers,
        limit: plan.limits.maxUsers,
        severity: subscription.featureUsage.activeUsers >= plan.limits.maxUsers ? "critical" : "warning",
      })
    }

    // Check storage
    if (subscription.featureUsage.storageUsedInGB >= plan.limits.storageInGB * 0.9) {
      alerts.push({
        companyId,
        alertType: "approaching_limit",
        feature: "storage",
        currentUsage: subscription.featureUsage.storageUsedInGB,
        limit: plan.limits.storageInGB,
        severity: subscription.featureUsage.storageUsedInGB >= plan.limits.storageInGB ? "critical" : "warning",
      })
    }

    // Create alerts
    for (const alert of alerts) {
      const docRef = doc(collection(db, "companies", companyId, "usageAlerts"))
      await setDoc(docRef, {
        ...alert,
        sentAt: Timestamp.now(),
      })
    }
  },

  async getPending(companyId: string) {
    const q = query(
      collection(db, "companies", companyId, "usageAlerts"),
      where("acknowledgedAt", "==", null),
      orderBy("sentAt", "desc"),
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as UsageAlert)
  },
}
