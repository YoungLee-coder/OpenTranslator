export type NavKey = "translate" | "write" | "dashboard";

export type TranslateFixture = {
  sourceLang: string;
  targetLang: string;
  expert: string;
  model: string;
  /** Cycle options for interactive expert / model selects. */
  experts: readonly string[];
  models: readonly string[];
  sourceText: string;
  targetText: string;
  sourceMeta: string;
  targetMeta: string;
  streaming?: boolean;
};

export type WriteFixture = {
  modes: ReadonlyArray<{ id: string; label: string; active?: boolean }>;
  /** Result text keyed by mode id — used when switching write modes. */
  modeResults: Readonly<Record<string, string>>;
  language: string;
  model: string;
  sourceText: string;
  resultText: string;
  sourceMeta: string;
  resultMetaLeft: string;
  resultMetaRight: string;
  streaming?: boolean;
};

export type OverviewFixture = {
  tabs: ReadonlyArray<{ id: string; label: string; active?: boolean }>;
  totalRequests: string;
  totalChars: string;
  rows: ReadonlyArray<{ provider: string; requests: string; chars: string }>;
};

export type ProviderRow = {
  name: string;
  type: string;
  model: string;
  enabled: boolean;
  isDefault?: boolean;
};

export type ProvidersFixture = {
  tabs: ReadonlyArray<{ id: string; label: string; active?: boolean }>;
  rows: ReadonlyArray<ProviderRow>;
};
