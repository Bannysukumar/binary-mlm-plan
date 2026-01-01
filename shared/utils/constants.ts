export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  COMPANY_ADMIN: 'company_admin',
  USER: 'user',
} as const;

export const INCOME_TYPES = {
  DIRECT: 'direct',
  BINARY_MATCHING: 'binary_matching',
  REPURCHASE: 'repurchase',
  SPONSOR_MATCHING: 'sponsor_matching',
  RANK_REWARD: 'rank_reward',
} as const;

export const WITHDRAWAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold',
} as const;

export const ANNOUNCEMENT_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export const SPILLOVER_MODES = {
  AUTO: 'auto',
  MANUAL: 'manual',
} as const;

export const CAPPING_PERIODS = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
} as const;
