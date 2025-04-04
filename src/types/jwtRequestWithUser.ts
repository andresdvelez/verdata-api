export interface RequestWithUser extends Request {
  user: {
    id: string;
    companyId: string;
    featureUsageExceeded: boolean;
    featureAllocation: number;
    featureUsage: number;
    featureUsagePeriod: string;
    featureUsageResetAt: Date;
    flag: string;
    flagId: string;
    reason: string;
    ruleId: string;
    ruleType: string;
    value: boolean;
    exp: number;
  };
}
