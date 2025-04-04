export interface JwtPayload {
  featureUsageExceeded: boolean;
  companyId: string;
  featureAllocation: number;
  featureUsage: number;
  featureUsagePeriod: string;
  featureUsageResetAt: Date;
  flag: string;
  flagId: string;
  reason: string;
  ruleId: string;
  ruleType: string;
  userId: string;
  value: boolean;
  exp: number;
}
