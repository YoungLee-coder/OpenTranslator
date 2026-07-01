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
