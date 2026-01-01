// MLM Configuration
export interface MLMConfig {
  companyId: string;
  spilloverMode: 'auto' | 'manual';
  directIncome: {
    enabled: boolean;
    type: 'fixed' | 'percentage';
    value: number;
    basedOnPackage: boolean;
    creditTiming: 'instant' | 'delayed';
    delayHours?: number;
  };
  binaryMatching: {
    enabled: boolean;
    pairRatio: string;
    pairIncome: number;
    cappingPeriod: 'daily' | 'weekly' | 'monthly';
    cappingAmount?: number;
    carryForward: boolean;
    flushOut: boolean;
    weakLegLogic: 'left' | 'right' | 'smaller';
  };
  repurchaseIncome: {
    enabled: boolean;
    repurchaseBV: number;
    incomePercentage: number;
    eligibleLevels: number[];
    monthlyQualification: boolean;
  };
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
  updatedAt: any;
  updatedBy: string;
}
