// User Roles
export type UserRole = 'super_admin' | 'company_admin' | 'user';

// Company Whitelabel Settings
export interface CompanySettings {
  id: string;
  name: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  domain?: string;
  currency: string;
  currencySymbol: string;
  language: string;
  timezone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// User Model
export interface User {
  id: string;
  companyId: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  sponsorId?: string;
  placementId?: string;
  placementSide?: 'left' | 'right';
  isActive: boolean;
  isKycVerified: boolean;
  kycDocuments?: string[];
  packageId?: string;
  packageBV?: number;
  rankId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Binary Tree Structure
export interface BinaryNode {
  userId: string;
  leftLeg: BinaryNode | null;
  rightLeg: BinaryNode | null;
  leftVolume: number;
  rightVolume: number;
  totalVolume: number;
  leftCount: number;
  rightCount: number;
  totalCount: number;
}

// Binary Tree Data
export interface BinaryTreeData {
  userId: string;
  companyId: string;
  leftLegId?: string;
  rightLegId?: string;
  leftVolume: number;
  rightVolume: number;
  totalVolume: number;
  leftCount: number;
  rightCount: number;
  totalCount: number;
  lastUpdated: Date;
}

// MLM Configuration
export interface MLMConfig {
  companyId: string;
  
  // Spillover Settings
  spilloverMode: 'auto' | 'manual';
  
  // Direct/Sponsor Income
  directIncome: {
    enabled: boolean;
    type: 'fixed' | 'percentage';
    value: number;
    basedOnPackage: boolean;
    creditTiming: 'instant' | 'delayed';
    delayHours?: number;
  };
  
  // Binary Matching Income
  binaryMatching: {
    enabled: boolean;
    pairRatio: string; // "1:1", "2:1", etc.
    pairIncome: number;
    cappingPeriod: 'daily' | 'weekly' | 'monthly';
    cappingAmount?: number;
    carryForward: boolean;
    flushOut: boolean;
    weakLegLogic: 'left' | 'right' | 'smaller';
  };
  
  // Repurchase Income
  repurchaseIncome: {
    enabled: boolean;
    repurchaseBV: number;
    incomePercentage: number;
    eligibleLevels: number[];
    monthlyQualification: boolean;
  };
  
  // Sponsor Matching Income
  sponsorMatching: {
    enabled: boolean;
    levels: Array<{
      level: number;
      percentage: number;
      qualification: {
        teamVolume?: number;
        pairs?: number;
        directs?: number;
      };
    }>;
    autoDisableIfInactive: boolean;
    inactiveDays?: number;
  };
  
  // Rank System
  ranks: Array<{
    id: string;
    name: string;
    level: number;
    qualification: {
      teamVolume: number;
      pairs: number;
      directs: number;
      leftVolume?: number;
      rightVolume?: number;
    };
    rewards: {
      cash?: number;
      products?: string[];
      achievements?: string[];
    };
    autoAssign: boolean;
  }>;
  
  updatedAt: Date;
  updatedBy: string;
}

// Income Types
export type IncomeType = 
  | 'direct' 
  | 'binary_matching' 
  | 'repurchase' 
  | 'sponsor_matching' 
  | 'rank_reward';

// Income Transaction
export interface IncomeTransaction {
  id: string;
  companyId: string;
  userId: string;
  incomeType: IncomeType;
  amount: number;
  currency: string;
  description: string;
  relatedUserId?: string; // For sponsor matching
  pairCount?: number; // For binary matching
  status: 'pending' | 'credited' | 'cancelled';
  creditedAt?: Date;
  createdAt: Date;
}

// Wallet
export interface Wallet {
  userId: string;
  companyId: string;
  totalEarnings: number;
  availableBalance: number;
  lockedBalance: number;
  withdrawnBalance: number;
  currency: string;
  isFrozen: boolean;
  lastUpdated: Date;
}

// Withdrawal
export interface Withdrawal {
  id: string;
  companyId: string;
  userId: string;
  amount: number;
  currency: string;
  charges: number;
  tds: number;
  adminFee: number;
  netAmount: number;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'on_hold';
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    accountHolderName: string;
  };
  upiDetails?: {
    upiId: string;
  };
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: string;
  rejectionReason?: string;
  remarks?: string;
}

// Withdrawal Configuration
export interface WithdrawalConfig {
  companyId: string;
  minimumWithdrawal: number;
  charges: {
    type: 'fixed' | 'percentage';
    value: number;
  };
  tds: {
    enabled: boolean;
    percentage: number;
    threshold?: number;
  };
  adminFee: {
    enabled: boolean;
    type: 'fixed' | 'percentage';
    value: number;
  };
  payoutCycle: 'daily' | 'weekly' | 'monthly' | 'manual';
  autoPayout: boolean;
  allowedMethods: ('bank' | 'upi')[];
}

// Announcement
export interface Announcement {
  id: string;
  companyId: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  targetAudience: 'all' | 'company_admin' | 'user';
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  expiresAt?: Date;
}

// Audit Log
export interface AuditLog {
  id: string;
  companyId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Analytics
export interface CompanyAnalytics {
  companyId: string;
  date: Date;
  totalUsers: number;
  activeUsers: number;
  newRegistrations: number;
  totalIncome: number;
  totalWithdrawals: number;
  totalPairs: number;
  totalVolume: number;
  incomeByType: Record<IncomeType, number>;
}

// Package
export interface Package {
  id: string;
  companyId: string;
  name: string;
  price: number;
  bv: number; // Business Volume
  isActive: boolean;
  createdAt: Date;
}
