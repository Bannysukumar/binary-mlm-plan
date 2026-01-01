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
  type QueryConstraint,
  writeBatch,
  Timestamp,
  increment,
} from "firebase/firestore"
import { db, getDb } from "./firebase"

// Helper to ensure db is initialized
function ensureDb(): NonNullable<typeof db> {
  if (!db) {
    throw new Error("Firestore is not initialized. Please refresh the page.")
  }
  return db
}
import type {
  User,
  Company,
  MLMConfig,
  Wallet,
  IncomeTransaction,
  Withdrawal,
  AuditLog,
  BinaryPosition,
  WithdrawalSettings,
} from "@/shared/types"

// ==================== COMPANY SERVICES ====================
export const companyService = {
  async create(company: Omit<Company, "id" | "createdAt" | "updatedAt">) {
    const firestore = ensureDb()
    const docRef = doc(collection(firestore, "companies"))
    const timestamp = Timestamp.now()
    await setDoc(docRef, {
      ...company,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    return docRef.id
  },

  async getById(companyId: string) {
    const firestore = ensureDb()
    const docRef = doc(firestore, "companies", companyId)
    const docSnap = await getDoc(docRef)
    return docSnap.exists() ? (docSnap.data() as Company) : null
  },

  async update(companyId: string, data: Partial<Company>) {
    const firestore = ensureDb()
    const docRef = doc(firestore, "companies", companyId)
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    })
  },

  async getAll(filters?: QueryConstraint[]) {
    const firestore = ensureDb()
    const baseFilters = [where("status", "!=", "deleted")]
    const constraints = filters ? [...baseFilters, ...filters] : baseFilters
    const q = query(collection(firestore, "companies"), ...constraints)
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Company)
  },

  async getWithBillingInfo(companyId: string) {
    const company = await this.getById(companyId)
    if (!company) return null

    // Get active subscription
    const firestore = ensureDb()
    const q = query(
      collection(firestore, "companies", companyId, "subscriptions"),
      where("status", "in", ["active", "trial"]),
      orderBy("createdAt", "desc"),
      limit(1),
    )
    const snapshot = await getDocs(q)
    const subscription = snapshot.empty ? null : snapshot.docs[0].data()

    // Get latest invoice
    const invoiceQuery = query(
      collection(firestore, "companies", companyId, "invoices"),
      orderBy("createdAt", "desc"),
      limit(1),
    )
    const invoiceSnapshot = await getDocs(invoiceQuery)
    const latestInvoice = invoiceSnapshot.empty ? null : invoiceSnapshot.docs[0].data()

    return {
      company,
      subscription,
      latestInvoice,
      billingStatus: subscription?.status === "active" ? "active" : "inactive",
    }
  },

  async updateBillingStatus(companyId: string, status: string) {
    const firestore = ensureDb()
    const docRef = doc(firestore, "companies", companyId)
    await updateDoc(docRef, {
      billingStatus: status,
      updatedAt: Timestamp.now(),
    })
  },
}

// ==================== USER SERVICES ====================
export const userService = {
  async create(companyId: string, user: Omit<User, "id" | "registrationDate">) {
    const firestore = ensureDb()
    const docRef = doc(collection(firestore, "companies", companyId, "users"))
    await setDoc(docRef, {
      ...user,
      registrationDate: Timestamp.now(),
    })
    return docRef.id
  },

  async getById(companyId: string, userId: string) {
    const firestore = ensureDb()
    // Try direct document ID first
    const docRef = doc(firestore, "companies", companyId, "users", userId)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as User
    }
    // If not found, try searching by id field
    const q = query(
      collection(firestore, "companies", companyId, "users"),
      where("id", "==", userId)
    )
    const snapshot = await getDocs(q)
    if (!snapshot.empty) {
      const doc = snapshot.docs[0]
      return { id: doc.id, ...doc.data() } as User
    }
    return null
  },

  async getByEmail(companyId: string, email: string) {
    const firestore = ensureDb()
    const q = query(collection(firestore, "companies", companyId, "users"), where("email", "==", email))
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const doc = snapshot.docs[0]
    return { id: doc.id, ...doc.data() } as User
  },

  async update(companyId: string, userId: string, data: Partial<User>) {
    const firestore = ensureDb()
    const docRef = doc(firestore, "companies", companyId, "users", userId)
    await updateDoc(docRef, data)
  },

  async listByCompany(companyId: string, filters?: QueryConstraint[]) {
    const firestore = ensureDb()
    const constraints = filters || []
    // Only add orderBy if we have filters that require it, or if no filters exist
    // If filters include sponsorId, we need the index for sponsorId + registrationDate
    const hasSponsorFilter = constraints.some((c: any) => c && c._fieldPath === 'sponsorId')
    const q = query(
      collection(firestore, "companies", companyId, "users"),
      ...constraints,
      ...(hasSponsorFilter ? [orderBy("registrationDate", "desc")] : []),
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as User)
  },

  async listByStatus(companyId: string, status: string) {
    return this.listByCompany(companyId, [where("status", "==", status)])
  },

  async getTotalCount(companyId: string) {
      if (!db) throw new Error("Firestore not initialized")
      const q = query(collection(db, "companies", companyId, "users"), where("status", "!=", "deleted"))
    const snapshot = await getDocs(q)
    return snapshot.size
  },
}

// ==================== USER SETTINGS SERVICES ====================
export interface UserSettings {
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
    incomeAlerts: boolean
    withdrawalAlerts: boolean
    teamUpdates: boolean
  }
  security: {
    twoFactorAuth: boolean
    loginAlerts: boolean
  }
  preferences: {
    theme: "light" | "dark" | "system"
    language: string
    currency: string
    timezone: string
  }
  privacy: {
    profileVisibility: "public" | "team" | "private"
    showEarnings: boolean
    showTeam: boolean
  }
  updatedAt?: Date
}

export const userSettingsService = {
  async get(companyId: string, userId: string): Promise<UserSettings | null> {
    const firestore = ensureDb()
    const docRef = doc(firestore, "companies", companyId, "users", userId, "settings", "main")
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const data = docSnap.data()
      return data as UserSettings
    }
    return null
  },

  async getOrCreateDefault(companyId: string, userId: string): Promise<UserSettings> {
    const existing = await this.get(companyId, userId)
    if (existing) return existing

    const defaultSettings: UserSettings = {
      notifications: {
        email: true,
        push: true,
        sms: false,
        incomeAlerts: true,
        withdrawalAlerts: true,
        teamUpdates: true,
      },
      security: {
        twoFactorAuth: false,
        loginAlerts: true,
      },
      preferences: {
        theme: "system",
        language: "en",
        currency: "USD",
        timezone: "UTC",
      },
      privacy: {
        profileVisibility: "public",
        showEarnings: true,
        showTeam: true,
      },
      updatedAt: new Date(),
    }

    await this.update(companyId, userId, defaultSettings)
    return defaultSettings
  },

  async update(companyId: string, userId: string, settings: Partial<UserSettings>) {
    const firestore = ensureDb()
    const docRef = doc(firestore, "companies", companyId, "users", userId, "settings", "main")
    const existing = await getDoc(docRef)
    
    if (existing.exists()) {
      await updateDoc(docRef, {
        ...settings,
        updatedAt: Timestamp.now(),
      })
    } else {
      await setDoc(docRef, {
        ...settings,
        updatedAt: Timestamp.now(),
      })
    }
  },
}

// ==================== BINARY TREE SERVICES ====================
export const binaryTreeService = {
  async getPosition(companyId: string, userId: string): Promise<BinaryPosition | null> {
    const firestore = ensureDb()
    const docRef = doc(firestore, "companies", companyId, "users", userId, "binaryTree", "position")
    const docSnap = await getDoc(docRef)
    return docSnap.exists() ? (docSnap.data() as BinaryPosition) : null
  },

  // Alias for getPosition (for compatibility)
  async getBinaryPosition(companyId: string, userId: string): Promise<BinaryPosition | null> {
    return this.getPosition(companyId, userId)
  },

  async setPosition(companyId: string, userId: string, position: BinaryPosition) {
    const firestore = ensureDb()
    const docRef = doc(firestore, "companies", companyId, "users", userId, "binaryTree", "position")
    await setDoc(docRef, position)
  },

  async updateVolume(companyId: string, userId: string, side: "left" | "right", volume: number) {
    const firestore = ensureDb()
    const docRef = doc(firestore, "companies", companyId, "users", userId, "binaryTree", "position")
    await updateDoc(docRef, {
      [`${side}Volume`]: increment(volume),
    })
  },

  async getDownline(companyId: string, sponsorId: string, depth = 0, maxDepth = 10): Promise<string[]> {
    if (depth > maxDepth) return []

    const users = await userService.listByCompany(companyId, [where("sponsorId", "==", sponsorId)])

    let downline = users.map((u) => u.id)
    for (const user of users) {
      const subDownline = await this.getDownline(companyId, user.id, depth + 1, maxDepth)
      downline = [...downline, ...subDownline]
    }
    return downline
  },

  // Get team count (left, right, total)
  async getTeamCount(companyId: string, userId: string): Promise<{ total: number; left: number; right: number }> {
    try {
      const firestore = ensureDb()
      // Query without orderBy to avoid index requirement - we just need to count
      const q = query(
        collection(firestore, "companies", companyId, "users"),
        where("sponsorId", "==", userId)
      )
      const snapshot = await getDocs(q)
      
      let leftCount = 0
      let rightCount = 0

      snapshot.docs.forEach((docSnap) => {
        const user = docSnap.data() as User
        if (user.placementSide === "left") leftCount++
        else if (user.placementSide === "right") rightCount++
      })

      return {
        total: snapshot.size,
        left: leftCount,
        right: rightCount,
      }
    } catch (error) {
      console.error("[v0] Error getting team count:", error)
      return { total: 0, left: 0, right: 0 }
    }
  },

  // Calculate team volume recursively
  async calculateTeamVolume(companyId: string, userId: string): Promise<number> {
    try {
      const position = await this.getPosition(companyId, userId)
      if (!position) return 0

      let volume = (position.leftVolume || 0) + (position.rightVolume || 0)

      // Recursively add children volumes
      if (position.left) {
        volume += await this.calculateTeamVolume(companyId, position.left)
      }
      if (position.right) {
        volume += await this.calculateTeamVolume(companyId, position.right)
      }

      return volume
    } catch (error) {
      console.error("[v0] Error calculating team volume:", error)
      return 0
    }
  },
}

// ==================== WALLET SERVICES ====================
export const walletService = {
  async getOrCreate(companyId: string, userId: string): Promise<Wallet> {
    const firestore = ensureDb()
    const docRef = doc(firestore, "companies", companyId, "users", userId, "wallet", "main")
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return docSnap.data() as Wallet
    }

    const newWallet: Wallet = {
      userId,
      companyId,
      availableBalance: 0,
      lockedBalance: 0,
      totalWithdrawn: 0,
      totalEarned: 0,
      lastUpdated: new Date(),
    }

    await setDoc(docRef, newWallet)
    return newWallet
  },

  async getBalance(companyId: string, userId: string) {
    const wallet = await this.getOrCreate(companyId, userId)
    return {
      available: wallet.availableBalance,
      locked: wallet.lockedBalance,
      total: wallet.availableBalance + wallet.lockedBalance,
      withdrawn: wallet.totalWithdrawn,
      earned: wallet.totalEarned,
    }
  },

  async addIncome(companyId: string, userId: string, amount: number) {
    const firestore = ensureDb()
    const docRef = doc(firestore, "companies", companyId, "users", userId, "wallet", "main")
    await updateDoc(docRef, {
      availableBalance: increment(amount),
      totalEarned: increment(amount),
      lastUpdated: Timestamp.now(),
    })
  },

  async deductBalance(companyId: string, userId: string, amount: number) {
    const firestore = ensureDb()
    const docRef = doc(firestore, "companies", companyId, "users", userId, "wallet", "main")
    await updateDoc(docRef, {
      availableBalance: increment(-amount),
      lastUpdated: Timestamp.now(),
    })
  },

  async recordWithdrawal(companyId: string, userId: string, amount: number) {
    const firestore = ensureDb()
    const docRef = doc(firestore, "companies", companyId, "users", userId, "wallet", "main")
    await updateDoc(docRef, {
      availableBalance: increment(-amount),
      totalWithdrawn: increment(amount),
      lastUpdated: Timestamp.now(),
    })
  },
}

// ==================== INCOME TRANSACTION SERVICES ====================
export const incomeTransactionService = {
  async create(companyId: string, transaction: Omit<IncomeTransaction, "id" | "createdAt">) {
    const firestore = ensureDb()
    const docRef = doc(collection(firestore, "companies", companyId, "incomeTransactions"))
    await setDoc(docRef, {
      ...transaction,
      createdAt: Timestamp.now(),
    })
    return docRef.id
  },

  async getByUser(companyId: string, userId: string, limitCount = 100) {
    const firestore = ensureDb()
    const q = query(
      collection(firestore, "companies", companyId, "incomeTransactions"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as IncomeTransaction)
  },

  async getByType(companyId: string, incomeType: string, limitCount = 100) {
    const firestore = ensureDb()
    const q = query(
      collection(firestore, "companies", companyId, "incomeTransactions"),
      where("incomeType", "==", incomeType),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as IncomeTransaction)
  },

  async getTotalByType(companyId: string, userId: string, incomeType: string) {
    const transactions = await this.getByUser(companyId, userId, 1000)
    return transactions
      .filter((t) => t.incomeType === incomeType && t.status === "credited")
      .reduce((sum, t) => sum + t.amount, 0)
  },
}

// ==================== WITHDRAWAL SERVICES ====================
export const withdrawalService = {
  async create(companyId: string, withdrawal: Omit<Withdrawal, "id" | "requestedAt">) {
    const firestore = ensureDb()
    const docRef = doc(collection(firestore, "companies", companyId, "withdrawals"))
    await setDoc(docRef, {
      ...withdrawal,
      requestedAt: Timestamp.now(),
    })
    return docRef.id
  },

  async getById(companyId: string, withdrawalId: string) {
    const firestore = ensureDb()
    const docRef = doc(firestore, "companies", companyId, "withdrawals", withdrawalId)
    const docSnap = await getDoc(docRef)
    return docSnap.exists() ? (docSnap.data() as Withdrawal) : null
  },

  async update(companyId: string, withdrawalId: string, data: Partial<Withdrawal>) {
    const firestore = ensureDb()
    const docRef = doc(firestore, "companies", companyId, "withdrawals", withdrawalId)
    await updateDoc(docRef, data)
  },

  async listByUser(companyId: string, userId: string) {
    const firestore = ensureDb()
    const q = query(
      collection(firestore, "companies", companyId, "withdrawals"),
      where("userId", "==", userId),
      orderBy("requestedAt", "desc"),
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Withdrawal)
  },

  async listByStatus(companyId: string, status: string) {
    const firestore = ensureDb()
    const q = query(
      collection(firestore, "companies", companyId, "withdrawals"),
      where("status", "==", status),
      orderBy("requestedAt", "desc"),
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Withdrawal)
  },

  async getSettings(companyId: string): Promise<WithdrawalSettings | null> {
    const firestore = ensureDb()
    const docRef = doc(firestore, "companies", companyId, "settings", "withdrawal")
    const docSnap = await getDoc(docRef)
    return docSnap.exists() ? (docSnap.data() as WithdrawalSettings) : null
  },
}

// ==================== MLM CONFIG SERVICES ====================
export const mlmConfigService = {
  async get(companyId: string): Promise<MLMConfig | null> {
    const firestore = ensureDb()
    const docRef = doc(firestore, "companies", companyId, "mlmConfig", "main")
    const docSnap = await getDoc(docRef)
    return docSnap.exists() ? (docSnap.data() as MLMConfig) : null
  },

  async create(companyId: string, config: Omit<MLMConfig, "companyId">) {
    const firestore = ensureDb()
    const docRef = doc(firestore, "companies", companyId, "mlmConfig", "main")
    await setDoc(docRef, { ...config, companyId })
  },

  async update(companyId: string, data: Partial<MLMConfig>) {
    const firestore = ensureDb()
    const docRef = doc(firestore, "companies", companyId, "mlmConfig", "main")
    await updateDoc(docRef, data)
  },
}

// ==================== AUDIT LOG SERVICES ====================
export const auditLogService = {
  async log(companyId: string, log: Omit<AuditLog, "id" | "timestamp">) {
    const firestore = ensureDb()
    const docRef = doc(collection(firestore, "companies", companyId, "auditLogs"))
    await setDoc(docRef, {
      ...log,
      timestamp: Timestamp.now(),
    })
  },

  async listByAdmin(companyId: string, adminId: string, limitCount = 100) {
    const firestore = ensureDb()
    const q = query(
      collection(firestore, "companies", companyId, "auditLogs"),
      where("adminId", "==", adminId),
      orderBy("timestamp", "desc"),
      limit(limitCount),
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AuditLog)
  },

  async listAll(companyId: string, limitCount = 100) {
    const firestore = ensureDb()
    const q = query(
      collection(firestore, "companies", companyId, "auditLogs"),
      orderBy("timestamp", "desc"),
      limit(limitCount),
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AuditLog)
  },
}

// ==================== BATCH OPERATIONS ====================
export async function batchUpdateWallets(
  companyId: string,
  updates: Array<{ userId: string; amount: number; type: "add" | "deduct" }>,
) {
  const firestore = ensureDb()
  const batchWrite = writeBatch(firestore)

  for (const update of updates) {
    const docRef = doc(firestore, "companies", companyId, "users", update.userId, "wallet", "main")
    const increment_val = update.type === "add" ? update.amount : -update.amount
    batchWrite.update(docRef, {
      availableBalance: increment(increment_val),
      lastUpdated: Timestamp.now(),
    })
  }

  await batchWrite.commit()
}

export async function batchCreateTransactions(
  companyId: string,
  transactions: Array<Omit<IncomeTransaction, "id" | "createdAt">>,
) {
  const firestore = ensureDb()
  const batchWrite = writeBatch(firestore)

  for (const transaction of transactions) {
    const docRef = doc(collection(firestore, "companies", companyId, "incomeTransactions"))
    batchWrite.set(docRef, {
      ...transaction,
      createdAt: Timestamp.now(),
    })
  }

  await batchWrite.commit()
}
