export interface UsageByProvider {
  providerId: string;
  requests: number;
  chars: number;
}

export interface UsageSummary {
  totalRequests: number;
  totalChars: number;
  byProvider: UsageByProvider[];
}

/** 单个账号的翻译 + 写作用量汇总。 */
export interface UserUsageTotals {
  requests: number;
  chars: number;
  byProvider: UsageByProvider[];
}

export const EMPTY_USER_USAGE: UserUsageTotals = {
  requests: 0,
  chars: 0,
  byProvider: [],
};
