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
  model: string;
  /** Cycle options for the interactive model select. */
  models: readonly string[];
  sourceText: string;
  resultText: string;
  sourceMeta: string;
  resultMetaLeft: string;
  resultMetaRight: string;
  streaming?: boolean;
};
