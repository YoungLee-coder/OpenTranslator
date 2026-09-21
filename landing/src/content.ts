/** Landing copy + product-demo metadata. Keep in sync with public/llms*.txt. */
import type { TranslateFixture, WriteFixture } from "./fixtures/types";
import { demoCatalogs, type DashboardContent } from "./demo-content";

export type Locale = "zh-CN" | "en";

/** Top-level surfaces of the in-window product demo. */
export type DemoView = "translate" | "write" | "dashboard";

/** Dashboard tabs, in the order the real app renders them. */
export type DashboardTabId =
  | "overview"
  | "providers"
  | "settings"
  | "public"
  | "experts"
  | "users";

export type DemoRoute =
  | { view: "translate" }
  | { view: "write" }
  | { view: "dashboard"; tab: DashboardTabId };

/** Route → caption key; dashboard tabs each carry their own caption. */
export type CaptionKey = "translate" | "write" | DashboardTabId;

/** The subset of routes the landing page's quick-jump tabs point at. */
export type QuickTabKey = "translate" | "write" | "overview" | "providers";

export type GalleryCaption = {
  title: string;
  line: string;
};

export type Content = {
  meta: {
    title: string;
    description: string;
  };
  site: {
    productName: string;
    version: string;
    headline: string;
    tagline: string;
    repoUrl: string;
    releasesUrl: string;
    readmeUrl: string;
    deployUrl: string;
    licenseUrl: string;
    issuesUrl: string;
    readmeMdUrl: string;
  };
  a11y: {
    skipToContent: string;
  };
  nav: {
    ariaLabel: string;
    features: string;
    principles: string;
    followCta: string;
  };
  hero: {
    readmeCta: string;
    repoCta: string;
    meta: string;
    cloneHint: string;
    cloneCommand: string;
    copyLabel: string;
    copiedLabel: string;
  };
  gallery: {
    sectionTitle: string;
    tabsAria: string;
    windowTitle: string;
    windowBadge: string;
    chips: readonly { key: string; label: string }[];
    quickTabs: readonly { key: QuickTabKey; label: string }[];
    captions: Record<CaptionKey, GalleryCaption>;
  };
  featuresSection: {
    sectionTitle: string;
  };
  features: readonly {
    name: string;
    description: string;
  }[];
  principlesSection: {
    sectionTitle: string;
    lead: string;
    sign: string;
  };
  principles: readonly {
    title: string;
    description: string;
  }[];
  pricingSection: {
    sectionTitle: string;
    sectionLede: string;
    repoCta: string;
  };
  pricing: {
    price: string;
    benefits: readonly string[];
    comparisonHtml: string;
    trial: string;
    terms: string;
  };
  faqSection: {
    sectionTitle: string;
    tailBefore: string;
    tailLink: string;
    tailAfter: string;
  };
  faq: readonly { q: string; a: string }[];
  footer: {
    ethos: string;
    credit: string;
    links: {
      github: string;
      readme: string;
      releases: string;
      license: string;
      contact: string;
      switchEn: string;
      switchZh: string;
    };
  };
  product: {
    themeLabel: string;
    swapLabel: string;
    /** Accessible names for the demo's form controls. */
    ui: {
      sourceLangLabel: string;
      targetLangLabel: string;
      expertLabel: string;
      modelLabel: string;
      savedLabel: string;
    };
    nav: {
      translate: string;
      write: string;
      dashboard: string;
    };
    translate: TranslateFixture & {
      action: string;
      pageTitle: string;
      languages: readonly string[];
      targetLanguages: readonly string[];
    };
    write: WriteFixture & { action: string; pageTitle: string };
    dashboard: DashboardContent;
  };
};

import rootPkg from "../../package.json";

const sharedUrls = {
  productName: "OpenTranslator",
  version: `v${rootPkg.version}`,
  repoUrl: "https://github.com/YoungLee-coder/OpenTranslator",
  releasesUrl: "https://github.com/YoungLee-coder/OpenTranslator/releases",
  licenseUrl:
    "https://github.com/YoungLee-coder/OpenTranslator/blob/main/LICENSE",
  issuesUrl: "https://github.com/YoungLee-coder/OpenTranslator/issues",
  readmeMdUrl:
    "https://github.com/YoungLee-coder/OpenTranslator/blob/main/README.md",
} as const;

const zhCN: Content = {
  meta: {
    title: "OpenTranslator · 自托管 AI 翻译器",
    description:
      "OpenTranslator 是 DeepL 风格的自托管 AI 翻译器：多供应商、SSE 流式、Cloudflare Workers 单 Worker 部署。",
  },
  site: {
    ...sharedUrls,
    headline: "DeepL 的手感，钥匙在你手里。",
    tagline:
      "把你自己的大模型接到 DeepL 手感的翻译页上。多供应商、SSE 流式，一次部署到 Cloudflare 边缘。",
    readmeUrl:
      "https://github.com/YoungLee-coder/OpenTranslator#-%E7%89%B9%E6%80%A7",
    deployUrl:
      "https://github.com/YoungLee-coder/OpenTranslator#-%E9%83%A8%E7%BD%B2",
  },
  a11y: {
    skipToContent: "跳到正文",
  },
  nav: {
    ariaLabel: "主导航",
    features: "能力",
    principles: "原则",
    followCta: "打开仓库",
  },
  hero: {
    readmeCta: "阅读 README",
    repoCta: "打开 GitHub",
    meta: "GPL-3.0 开源 · 自托管 · Cloudflare Workers",
    cloneHint: "用 Git 也行：",
    cloneCommand: "git clone https://github.com/YoungLee-coder/OpenTranslator",
    copyLabel: "复制 git clone 命令",
    copiedLabel: "已复制",
  },
  gallery: {
    sectionTitle: "工作台",
    tabsAria: "选择界面",
    windowTitle: "OpenTranslator",
    windowBadge: "已固定",
    chips: [
      { key: "SSE", label: "流式翻译" },
      { key: "D1", label: "密钥加密" },
    ],
    quickTabs: [
      { key: "translate", label: "翻译" },
      { key: "write", label: "写作" },
      { key: "overview", label: "用量" },
      { key: "providers", label: "供应商" },
    ],
    captions: {
      translate: { title: "翻译页", line: "左右对照，字随流至" },
      write: { title: "AI 写作", line: "润色改写，双栏同屏" },
      overview: { title: "用量概览", line: "请求与字符一目了然" },
      providers: { title: "供应商", line: "一家一家接上" },
      settings: { title: "站点设置", line: "缓存、限流与推理开关" },
      public: { title: "公开访问", line: "挑几个模型对外开放" },
      experts: { title: "AI 专家", line: "按场景换一套译法" },
      users: { title: "多用户管理", line: "分账号、分权限、看用量" },
    },
  },
  featuresSection: {
    sectionTitle: "它能做什么",
  },
  features: [
    {
      name: "多供应商切换",
      description:
        "OpenAI、Claude、Gemini、DeepSeek 等内置。Dashboard 填 Key 即可换模型。",
    },
    {
      name: "流式翻译",
      description: "译文经 SSE 逐字渲染，长文也不再闷在加载圈里。",
    },
    {
      name: "插件化扩展",
      description: "供应商走注册表，功能模块走 DB 开关，核心路由保持不动。",
    },
    {
      name: "边缘单 Worker",
      description: "Vite SPA 与 Hono API 打进同一个 Cloudflare Worker，一次部署。",
    },
    {
      name: "密钥加密落库",
      description: "API Key 加密写入 D1，也可一键关掉公开访问。",
    },
  ],
  principlesSection: {
    sectionTitle: "为什么做它",
    lead:
      "现成的翻译 SaaS 好用，但模型、密钥、数据都不在你手里。<mark>OpenTranslator</mark> 想留住 DeepL 那种手感，把钥匙交还给部署它的人。",
    sign: "—— OpenTranslator",
  },
  principles: [
    {
      title: "密钥不以明文落盘",
      description:
        "ENCRYPTION_KEY 加密后再进 D1；丢了密钥等于供应商配置作废，所以务必备份。",
    },
    {
      title: "一次部署覆盖前后端",
      description:
        "静态资源走 ASSETS 绑定，API 走同一 Worker。开发期 Vite 代理 /api，上线后同源。",
    },
    {
      title: "扩展不碰核心路由",
      description:
        "新供应商、新功能模块只进注册表与 schema。index.ts 的挂载顺序保持稳定。",
    },
    {
      title: "公开与私有可切换",
      description:
        "站点开关关掉公开访问；限流区分访客与登录用户，按 IP 滑动窗口。",
    },
    {
      title: "事实写在仓库里",
      description:
        "安装步骤、绑定名、初始化接口都以 README 为准。落地页不另造一套说法。",
    },
  ],
  pricingSection: {
    sectionTitle: "开源即全部",
    sectionLede: "没有套餐分层。克隆仓库，接上你的 Key，自己部署。",
    repoCta: "打开仓库",
  },
  pricing: {
    price: "GPL-3.0 · 免费开源",
    benefits: [
      "完整源码与自托管权限",
      "九种 adapter 开箱可用",
      "Dashboard 管理用量与站点开关",
      "术语库与 AI 专家可按需启用",
      "派生项目须以同等协议开源",
    ],
    comparisonHtml:
      "<s>DeepL Pro · 按月订阅</s> · <s>ChatGPT Plus · 按月订阅</s> · 本项目免费开源",
    trial: "克隆仓库即可本地跑通；部署只需 Cloudflare 账号。",
    terms:
      "你自备模型 API Key 与 Cloudflare 账号。Workers 按量计费，与本项目授权无关。",
  },
  faqSection: {
    sectionTitle: "常见问题",
    tailBefore: "部署细节以",
    tailLink: "README 部署章节",
    tailAfter: "为准。",
  },
  faq: [
    {
      q: "和 DeepL、LibreTranslate 有什么不同？",
      a: "DeepL 是托管 SaaS；LibreTranslate 多绑自有引擎。OpenTranslator 是 DeepL 手感的自托管前端，背后接你自己的大模型供应商，跑在 Cloudflare 边缘。",
    },
    {
      q: "免费吗？要付费吗？",
      a: "软件本身免费，GPL-3.0 开源。你只需支付所用模型的 API 费用，以及 Cloudflare Workers 的按量费用。",
    },
    {
      q: "必须自己准备 API Key 吗？",
      a: "是。部署后在 Dashboard 新增供应商并填入 Key，勾选公开默认后，首页即可翻译。",
    },
    {
      q: "译文和密钥会发到哪里？",
      a: "请求发往你配置的供应商端点；API Key 加密存你自己的 D1。本项目不运营中转服务。",
    },
    {
      q: "如何部署到 Cloudflare？",
      a: "pnpm build 后 wrangler deploy，或用 Cloudflare Git 连接。部署后打开站点，在初始化页建表并设定管理员账号。",
    },
    {
      q: "许可证有什么要求？",
      a: "GPL-3.0。派生项目必须以同等协议开源。详见仓库 LICENSE。",
    },
    {
      q: "支持哪些模型与厂商？",
      a: "内置 OpenAI、Claude、Gemini、DeepSeek、AIHubMix、OpenRouter、Cloudflare、DeepL，以及自定义（多格式）。OpenAI 类型可通过 Base URL 对接兼容端点；同一厂商若同时提供多种协议，用自定义类型添加多条 API 地址。新厂商可按注册表加 adapter。",
    },
  ],
  footer: {
    ethos: "字在边缘流转，钥在你手。",
    credit: "OpenTranslator · GPL-3.0 · © 2026",
    links: {
      github: "GitHub",
      readme: "README",
      releases: "版本记录",
      license: "许可证",
      contact: "Issues",
      switchEn: "English",
      switchZh: "中文",
    },
  },
  product: {
    themeLabel: "切换主题",
    swapLabel: "交换语言",
    ui: {
      sourceLangLabel: "源语言",
      targetLangLabel: "目标语言",
      expertLabel: "AI 专家",
      modelLabel: "模型",
      savedLabel: "已保存",
    },
    nav: {
      translate: "翻译",
      write: "写作",
      dashboard: "控制台",
    },
    translate: {
      pageTitle: "AI 翻译",
      action: "翻译",
      sourceLang: "自动检测",
      targetLang: "English",
      expert: "通用",
      model: "默认",
      experts: ["通用", "技术", "文学", "商务"],
      models: ["默认", "GPT-4.1 mini", "Claude Sonnet", "DeepSeek"],
      languages: [
        "自动检测",
        "简体中文",
        "繁體中文（台灣）",
        "English",
        "日本語",
        "한국어",
        "Français",
        "Deutsch",
        "Español",
        "Русский",
      ],
      targetLanguages: [
        "简体中文",
        "繁體中文（台灣）",
        "繁體中文（香港）",
        "English",
        "日本語",
        "한국어",
        "Français",
        "Deutsch",
        "Español",
        "Italiano",
        "Português",
        "Русский",
        "العربية",
        "Tiếng Việt",
        "ไทย",
      ],
      sourceText:
        "边缘网络上的自托管翻译器，密钥加密落库，译文经 SSE 逐字渲染。",
      targetText:
        "A self-hosted translator on the edge: keys encrypted at rest, output streamed token by token via SSE.",
      sourceMeta: "33 字符",
      targetMeta: "复制",
      streaming: true,
    },
    write: {
      pageTitle: "AI 写作",
      action: "改进",
      modes: [
        { id: "polish", label: "润色", active: true },
        { id: "style", label: "风格" },
        { id: "tone", label: "正式度" },
        { id: "shorten", label: "精简" },
      ],
      modeResults: {
        polish: "该功能帮助用户迅速润色文稿，使表达更清晰、更有节奏。",
        style: "这项能力让用户快速打磨文稿，语气更稳、层次更清楚。",
        tone: "本功能协助用户提升文稿正式度，措辞更严谨、结构更分明。",
        shorten: "帮用户更快润色文稿，表达更清楚。",
      },
      model: "默认",
      models: ["默认", "GPT-4.1 mini", "Claude Sonnet"],
      sourceText: "这个功能可以让用户很快把文章改得更好看一点。",
      resultText: "该功能帮助用户迅速润色文稿，使表达更清晰、更有节奏。",
      sourceMeta: "22 字符",
      resultMetaLeft: "替换原文",
      resultMetaRight: "复制",
      streaming: true,
    },
    dashboard: demoCatalogs["zh-CN"].dashboard,
  },
};

const en: Content = {
  meta: {
    title: "OpenTranslator · Self-hosted AI translator",
    description:
      "OpenTranslator is a DeepL-style self-hosted AI translator: multi-provider, SSE streaming, single Cloudflare Worker deploy.",
  },
  site: {
    ...sharedUrls,
    headline: "DeepL feel. Keys stay yours.",
    tagline:
      "Plug your own models into a DeepL-feel translation page. Multi-provider, SSE streaming, one Cloudflare Worker deploy.",
    readmeUrl: "https://github.com/YoungLee-coder/OpenTranslator#readme",
    deployUrl: "https://github.com/YoungLee-coder/OpenTranslator#readme",
  },
  a11y: {
    skipToContent: "Skip to content",
  },
  nav: {
    ariaLabel: "Primary",
    features: "Features",
    principles: "Why",
    followCta: "GitHub",
  },
  hero: {
    readmeCta: "Read the README",
    repoCta: "Open on GitHub",
    meta: "GPL-3.0 · Self-hosted · Cloudflare Workers",
    cloneHint: "Or clone it:",
    cloneCommand: "git clone https://github.com/YoungLee-coder/OpenTranslator",
    copyLabel: "Copy the git clone command",
    copiedLabel: "Copied",
  },
  gallery: {
    sectionTitle: "Workbench",
    tabsAria: "Choose a screen",
    windowTitle: "OpenTranslator",
    windowBadge: "Pinned",
    chips: [
      { key: "SSE", label: "Streaming" },
      { key: "D1", label: "Encrypted keys" },
    ],
    quickTabs: [
      { key: "translate", label: "Translate" },
      { key: "write", label: "Write" },
      { key: "overview", label: "Usage" },
      { key: "providers", label: "Providers" },
    ],
    captions: {
      translate: { title: "Translate", line: "Side by side, tokens as they arrive" },
      write: { title: "AI Write", line: "Polish and rewrite, dual panes" },
      overview: { title: "Usage overview", line: "Requests and characters at a glance" },
      providers: { title: "Providers", line: "Wire them up one by one" },
      settings: { title: "Site settings", line: "Cache, rate limits, reasoning" },
      public: { title: "Public access", line: "Open a few models to guests" },
      experts: { title: "AI experts", line: "A different voice per scenario" },
      users: { title: "Users", line: "Accounts, permissions, usage" },
    },
  },
  featuresSection: {
    sectionTitle: "What it can do",
  },
  features: [
    {
      name: "Multi-provider switching",
      description:
        "OpenAI, Claude, Gemini, DeepSeek, and more. Add a key in the Dashboard to switch models.",
    },
    {
      name: "Streaming translation",
      description:
        "Translations render token by token over SSE. Long text never sits behind a spinner.",
    },
    {
      name: "Plugin-style extension",
      description:
        "Providers go through a registry; feature modules use DB toggles. Core routes stay put.",
    },
    {
      name: "Single edge Worker",
      description:
        "Vite SPA and Hono API ship in one Cloudflare Worker. One deploy, same origin.",
    },
    {
      name: "Encrypted keys at rest",
      description:
        "Provider API keys are encrypted before D1. Flip a switch for a private deploy.",
    },
  ],
  principlesSection: {
    sectionTitle: "Why it exists",
    lead:
      "Hosted translators are convenient, but the models, keys, and data are not yours. <mark>OpenTranslator</mark> keeps the DeepL feel while handing the keys back to whoever deploys it.",
    sign: "- OpenTranslator",
  },
  principles: [
    {
      title: "Keys never land in plaintext",
      description:
        "Encrypted with ENCRYPTION_KEY before D1. Lose the key and provider config is gone - back it up.",
    },
    {
      title: "One deploy covers both ends",
      description:
        "Static assets via the ASSETS binding; API on the same Worker. Vite proxies /api in dev; same origin in production.",
    },
    {
      title: "Extensions leave core routes alone",
      description:
        "New providers and feature modules enter the registry and schema only. Mount order in index.ts stays stable.",
    },
    {
      title: "Public and private are switchable",
      description:
        "Site switch turns off public access; rate limits split guests and signed-in users with an IP sliding window.",
    },
    {
      title: "Facts live in the repo",
      description:
        "Install steps, binding names, and init APIs follow the README. The landing page does not invent a second story.",
    },
  ],
  pricingSection: {
    sectionTitle: "Open source is the whole product",
    sectionLede: "No tiered plans. Clone the repo, add your keys, deploy yourself.",
    repoCta: "Open repository",
  },
  pricing: {
    price: "GPL-3.0 · Free & open source",
    benefits: [
      "Full source and self-host rights",
      "Nine adapters out of the box",
      "Dashboard for usage and site switches",
      "Glossary and AI experts when you need them",
      "Derivatives must stay under the same license",
    ],
    comparisonHtml:
      "<s>DeepL Pro · monthly</s> · <s>ChatGPT Plus · monthly</s> · this project is free & open source",
    trial:
      "Clone the repo to run locally; deploy needs only a Cloudflare account.",
    terms:
      "You bring model API keys and a Cloudflare account. Workers usage is billed separately from this license.",
  },
  faqSection: {
    sectionTitle: "FAQ",
    tailBefore: "Deployment details follow the",
    tailLink: "README deploy section",
    tailAfter: ".",
  },
  faq: [
    {
      q: "How is this different from DeepL or LibreTranslate?",
      a: "DeepL is hosted SaaS; LibreTranslate often binds to its own engine. OpenTranslator is a DeepL-feel self-hosted front end on your LLM providers, running at the Cloudflare edge.",
    },
    {
      q: "Is it free? Do I need to pay?",
      a: "The software is free under GPL-3.0. You pay only for the model APIs you use and Cloudflare Workers usage.",
    },
    {
      q: "Do I have to bring my own API keys?",
      a: "Yes. After deploy, add a provider in the Dashboard, enter a key, mark it public default, and the home page can translate.",
    },
    {
      q: "Where do translations and keys go?",
      a: "Requests go to the provider endpoints you configure; API keys are encrypted in your own D1. This project does not run a relay service.",
    },
    {
      q: "How do I deploy to Cloudflare?",
      a: "pnpm build then wrangler deploy, or connect Cloudflare Git. After deploy, open the site: the setup page creates tables and the admin account.",
    },
    {
      q: "What does the license require?",
      a: "GPL-3.0. Derivative projects must stay open under the same terms. See LICENSE in the repo.",
    },
    {
      q: "Which models and vendors are supported?",
      a: "Built-in: OpenAI, Claude, Gemini, DeepSeek, AIHubMix, OpenRouter, Cloudflare, DeepL, and Custom (multi-format). Use the OpenAI type with a custom Base URL for compatible endpoints; if a vendor exposes several API formats, use the Custom type to add multiple addresses. New vendors can be added via the registry.",
    },
  ],
  footer: {
    ethos: "Words move at the edge. Keys stay in your hands.",
    credit: "OpenTranslator · GPL-3.0 · © 2026",
    links: {
      github: "GitHub",
      readme: "README",
      releases: "Releases",
      license: "License",
      contact: "Issues",
      switchEn: "English",
      switchZh: "中文",
    },
  },
  product: {
    themeLabel: "Toggle theme",
    swapLabel: "Swap languages",
    ui: {
      sourceLangLabel: "Source language",
      targetLangLabel: "Target language",
      expertLabel: "AI expert",
      modelLabel: "Model",
      savedLabel: "Saved",
    },
    nav: {
      translate: "Translate",
      write: "Write",
      dashboard: "Dashboard",
    },
    translate: {
      pageTitle: "AI Translate",
      action: "Translate",
      sourceLang: "Detect language",
      targetLang: "中文",
      expert: "General",
      model: "Default",
      experts: ["General", "Technical", "Literary", "Business"],
      models: ["Default", "GPT-4.1 mini", "Claude Sonnet", "DeepSeek"],
      languages: [
        "Detect language",
        "English",
        "简体中文",
        "繁體中文（台灣）",
        "日本語",
        "한국어",
        "Français",
        "Deutsch",
        "Español",
        "Русский",
      ],
      targetLanguages: [
        "English",
        "简体中文",
        "繁體中文（台灣）",
        "繁體中文（香港）",
        "日本語",
        "한국어",
        "Français",
        "Deutsch",
        "Español",
        "Italiano",
        "Português",
        "Русский",
        "العربية",
        "Tiếng Việt",
        "ไทย",
      ],
      sourceText:
        "A self-hosted translator on the edge: keys encrypted at rest, output streamed token by token via SSE.",
      targetText:
        "边缘网络上的自托管翻译器，密钥加密落库，译文经 SSE 逐字渲染。",
      sourceMeta: "101 chars",
      targetMeta: "Copy",
      streaming: true,
    },
    write: {
      pageTitle: "AI Write",
      action: "Improve",
      modes: [
        { id: "polish", label: "Polish", active: true },
        { id: "style", label: "Style" },
        { id: "tone", label: "Tone" },
        { id: "shorten", label: "Shorten" },
      ],
      modeResults: {
        polish:
          "This feature helps users polish drafts quickly: clearer wording, tighter rhythm.",
        style:
          "This feature lets users refine drafts fast: steadier voice, sharper structure.",
        tone:
          "This feature helps users raise formality: more precise wording, clearer structure.",
        shorten: "Helps users polish drafts faster and write more clearly.",
      },
      model: "Default",
      models: ["Default", "GPT-4.1 mini", "Claude Sonnet"],
      sourceText:
        "This feature lets users quickly make their writing look a bit better.",
      resultText:
        "This feature helps users polish drafts quickly: clearer wording, tighter rhythm.",
      sourceMeta: "69 chars",
      resultMetaLeft: "Replace source",
      resultMetaRight: "Copy",
      streaming: true,
    },
    dashboard: demoCatalogs.en.dashboard,
  },
};

export const catalogs: Record<Locale, Content> = {
  "zh-CN": zhCN,
  en,
};

export const LOCALES: readonly Locale[] = ["zh-CN", "en"];
