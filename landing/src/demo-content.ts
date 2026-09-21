/**
 * Copy for the landing page's interactive product demo.
 *
 * Kept out of `content.ts` (which holds the marketing copy) because the demo
 * mirrors the real Dashboard screen by screen. Data is fixture-only — the demo
 * never calls the API. Source of truth for the fields: `web/src/routes/dashboard/`
 * and `web/src/locales/*.ts`.
 */
import type { DashboardTabId } from "./content";

export type ProviderTypeId =
  | "openai"
  | "claude"
  | "gemini"
  | "deepseek"
  | "aihubmix"
  | "openrouter"
  | "cloudflare"
  | "deepl"
  | "custom";

export type PermissionId =
  | "translate"
  | "write"
  | "providers"
  | "settings"
  | "usage";

export type DemoProviderRow = {
  id: string;
  name: string;
  type: ProviderTypeId;
  models: readonly string[];
  enabled: boolean;
  isDefault?: boolean;
};

export type DemoPublicModelRow = {
  id: string;
  provider: string;
  model: string;
  open: boolean;
  isDefault: boolean;
};

export type DemoUserRow = {
  id: string;
  name: string;
  role: "admin" | "user";
  enabled: boolean;
  permissions: readonly PermissionId[];
};

export type DemoExpertRow = {
  id: string;
  name: string;
  description: string;
};

export type DemoModuleRow = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
};

export type DashboardContent = {
  pageTitle: string;
  tabs: readonly { id: DashboardTabId; label: string }[];
  overview: {
    cardTitle: string;
    totalRequestsValue: string;
    totalRequestsLabel: string;
    totalCharsValue: string;
    totalCharsLabel: string;
    providerCol: string;
    requestsCol: string;
    charsCol: string;
    rows: readonly {
      provider: string;
      type: ProviderTypeId;
      requests: string;
      chars: string;
    }[];
  };
  profile: {
    cardTitle: string;
    avatarHint: string;
    uploadAvatar: string;
    removeAvatar: string;
    usernameLabel: string;
    usernameValue: string;
    currentPasswordLabel: string;
    newPasswordLabel: string;
    newPasswordPlaceholder: string;
    save: string;
  };
  providers: {
    cardTitle: string;
    addLabel: string;
    defaultModelLabel: string;
    editLabel: string;
    deleteLabel: string;
    nameCol: string;
    typeCol: string;
    modelCol: string;
    statusCol: string;
    actionsCol: string;
    addTitle: string;
    editTitle: string;
    formName: string;
    formKey: string;
    formModel: string;
    formModelHint: string;
    formEnabled: string;
    save: string;
    cancel: string;
    empty: string;
    types: Record<ProviderTypeId, string>;
    rows: readonly DemoProviderRow[];
  };
  settings: {
    cardTitle: string;
    save: string;
    authedRateLimit: { label: string; description: string };
    translationCache: { label: string; description: string };
    cacheTtl: { label: string; description: string };
    organizeFormat: { label: string; description: string };
    disableReasoning: { label: string; description: string };
  };
  modules: {
    cardTitle: string;
    moduleCol: string;
    descCol: string;
    statusCol: string;
    enabled: string;
    disabled: string;
    rows: readonly DemoModuleRow[];
  };
  publicAccess: {
    cardTitle: string;
    description: string;
    modelsTitle: string;
    providerCol: string;
    modelCol: string;
    openCol: string;
    defaultCol: string;
    defaultBadge: string;
    setDefault: string;
    hint: string;
    anonRateLimit: string;
    anonRateLimitDesc: string;
    save: string;
    rows: readonly DemoPublicModelRow[];
  };
  experts: {
    cardTitle: string;
    description: string;
    defaultLabel: string;
    generalDefault: string;
    save: string;
    rows: readonly DemoExpertRow[];
  };
  users: {
    cardTitle: string;
    description: string;
    addLabel: string;
    usernameCol: string;
    roleCol: string;
    statusCol: string;
    permCol: string;
    actionsCol: string;
    enabled: string;
    disabled: string;
    roleAdmin: string;
    roleUser: string;
    allPermissions: string;
    noPermissions: string;
    deleteLabel: string;
    addTitle: string;
    passwordLabel: string;
    passwordHint: string;
    permissionsTitle: string;
    save: string;
    cancel: string;
    empty: string;
    permissions: Record<PermissionId, string>;
    rows: readonly DemoUserRow[];
  };
};

export type DemoContent = {
  dashboard: DashboardContent;
};

const providerTypesZh: Record<ProviderTypeId, string> = {
  openai: "OpenAI",
  claude: "Claude",
  gemini: "Gemini",
  deepseek: "DeepSeek",
  aihubmix: "AIHubMix",
  openrouter: "OpenRouter",
  cloudflare: "Cloudflare",
  deepl: "DeepL",
  custom: "自定义",
};

const providerTypesEn: Record<ProviderTypeId, string> = {
  ...providerTypesZh,
  custom: "Custom",
};

const expertsZh: readonly DemoExpertRow[] = [
  {
    id: "tech",
    name: "科技类翻译大师",
    description: "专为科技领域设计，提供更准确、专业的科技领域翻译。",
  },
  {
    id: "financial",
    name: "金融翻译顾问",
    description: "特别为金融领域优化，适合用来翻译财经、金融类文章。",
  },
  {
    id: "medical",
    name: "医学翻译大师",
    description: "适合用来翻译医学相关的网站、论文、报告等内容。",
  },
  {
    id: "legal",
    name: "法律行业译者",
    description: "专为法律行业优化，适合翻译法律相关的网站、论文、报告。",
  },
  {
    id: "paper",
    name: "学术论文翻译师",
    description: "专为学术论文翻译而设计，忠实传达原文学术语调与术语。",
  },
  {
    id: "github",
    name: "GitHub 翻译增强器",
    description: "专为仓库、issue 与评论优化，准确传达技术术语与代码片段。",
  },
  {
    id: "game",
    name: "游戏译者",
    description: "专为游戏行业设计，确保翻译准确且能与玩家产生共鸣。",
  },
  {
    id: "fiction",
    name: "小说译者",
    description: "提升小说类翻译的叙事与情感深度，保留原文精髓。",
  },
  {
    id: "ecommerce",
    name: "电商翻译大师",
    description: "专为电商领域打造，翻译精准且贴合在线购物者语境。",
  },
  {
    id: "reddit",
    name: "Reddit 翻译增强器",
    description: "专为帖子与评论优化，准确传达社区俚语与互联网行话。",
  },
  {
    id: "music",
    name: "音乐专家",
    description: "专为音乐领域翻译设计，准确处理音乐相关文章。",
  },
  {
    id: "design",
    name: "设计师",
    description: "专注艺术设计类文章，增强清晰度并保留原文审美。",
  },
];

const expertsEn: readonly DemoExpertRow[] = [
  {
    id: "tech",
    name: "Technology Expert",
    description:
      "Crafted prompts make translations in the technology field more accurate and professional.",
  },
  {
    id: "financial",
    name: "Financial Expert",
    description:
      "Tuned for finance: business and financial articles read more accurately and professionally.",
  },
  {
    id: "medical",
    name: "Medical Expert",
    description:
      "Suited to medical websites, papers, and reports, keeping terminology precise.",
  },
  {
    id: "legal",
    name: "Legal Expert",
    description:
      "Tuned for legal work: websites, papers, and reports keep their terms of art.",
  },
  {
    id: "paper",
    name: "Academic Paper Expert",
    description:
      "Built for scholarly translation, staying faithful to academic tone and terminology.",
  },
  {
    id: "github",
    name: "GitHub Translation Enhancer",
    description:
      "Optimized for repositories, issues, and comments: terms, code snippets, and platform language.",
  },
  {
    id: "game",
    name: "Gaming Expert",
    description:
      "Crafted for the games industry so translations land with players.",
  },
  {
    id: "fiction",
    name: "Fiction Expert",
    description:
      "Enriches narrative and emotional depth, keeping the original's essence.",
  },
  {
    id: "ecommerce",
    name: "E-commerce Expert",
    description:
      "Built for e-commerce: accurate copy that resonates with online shoppers.",
  },
  {
    id: "reddit",
    name: "Reddit Translation Enhancer",
    description:
      "Optimized for posts and comments: community slang and internet jargon included.",
  },
  {
    id: "music",
    name: "Music Expert",
    description:
      "Designed for music writing, handling music articles accurately.",
  },
  {
    id: "design",
    name: "Designer",
    description:
      "Focused on art and design writing: clearer, with the original's aesthetic intact.",
  },
];

const zh: DemoContent = {
  dashboard: {
    pageTitle: "控制台",
    tabs: [
      { id: "overview", label: "概览" },
      { id: "providers", label: "供应商" },
      { id: "settings", label: "设置" },
      { id: "public", label: "公开访问" },
      { id: "experts", label: "AI 专家" },
      { id: "users", label: "多用户管理" },
    ],
    overview: {
      cardTitle: "用量概览",
      totalRequestsValue: "12,480",
      totalRequestsLabel: "总请求数",
      totalCharsValue: "1,284,300",
      totalCharsLabel: "总字符数",
      providerCol: "供应商",
      requestsCol: "请求数",
      charsCol: "字符数",
      rows: [
        { provider: "OpenAI", type: "openai", requests: "8,240", chars: "964,120" },
        { provider: "Claude", type: "claude", requests: "2,730", chars: "218,450" },
        { provider: "DeepSeek", type: "deepseek", requests: "1,510", chars: "101,730" },
      ],
    },
    profile: {
      cardTitle: "用户信息",
      avatarHint: "JPEG / PNG / WebP / GIF，最大 512 KB",
      uploadAvatar: "上传头像",
      removeAvatar: "移除头像",
      usernameLabel: "用户名",
      usernameValue: "younglee",
      currentPasswordLabel: "当前密码",
      newPasswordLabel: "新密码（可选）",
      newPasswordPlaceholder: "留空则不修改",
      save: "保存修改",
    },
    providers: {
      cardTitle: "供应商",
      addLabel: "新增",
      defaultModelLabel: "站点默认模型",
      editLabel: "编辑",
      deleteLabel: "删除",
      nameCol: "名称",
      typeCol: "类型",
      modelCol: "模型",
      statusCol: "状态",
      actionsCol: "操作",
      addTitle: "新增供应商",
      editTitle: "编辑供应商",
      formName: "显示名称",
      formKey: "API Key",
      formModel: "模型",
      formModelHint: "一行一个，首项为默认",
      formEnabled: "启用",
      save: "保存",
      cancel: "取消",
      empty: "还没有供应商，添加一个即可开始翻译。",
      types: providerTypesZh,
      rows: [
        {
          id: "p-openai",
          name: "My OpenAI",
          type: "openai",
          models: ["gpt-4.1-mini", "gpt-4.1"],
          enabled: true,
          isDefault: true,
        },
        {
          id: "p-claude",
          name: "Claude 官方",
          type: "claude",
          models: ["claude-sonnet-4-5", "claude-opus-4-1"],
          enabled: true,
        },
        {
          id: "p-deepseek",
          name: "DeepSeek",
          type: "deepseek",
          models: ["deepseek-chat", "deepseek-reasoner"],
          enabled: true,
        },
        {
          id: "p-deepl",
          name: "DeepL Pro",
          type: "deepl",
          models: ["prefer_quality_optimized"],
          enabled: false,
        },
      ],
    },
    settings: {
      cardTitle: "站点设置",
      save: "保存设置",
      authedRateLimit: {
        label: "登录用户限流（次/分钟）",
        description: "登录管理员每分钟最大请求数。",
      },
      translationCache: {
        label: "翻译结果缓存",
        description: "相同文本 + 语言对命中 KV 缓存时直接返回，省时省额度。",
      },
      cacheTtl: {
        label: "缓存保留时长（小时）",
        description: "相同结果在 KV 中的存活时间，到期自动清除。",
      },
      organizeFormat: {
        label: "整理格式",
        description: "翻译时根据杂乱原文推断段落与列表结构，输出整洁译文。",
      },
      disableReasoning: {
        label: "关闭模型推理",
        description: "在请求侧关闭思考链 / 推理，降低延迟与用量。",
      },
    },
    modules: {
      cardTitle: "功能模块",
      moduleCol: "模块",
      descCol: "说明",
      statusCol: "状态",
      enabled: "已启用",
      disabled: "已停用",
      rows: [
        {
          id: "public-access",
          name: "公开访问",
          description:
            "匿名访客的公开翻译入口；启用后可配置开放模型、公开默认与限流",
          enabled: true,
        },
        {
          id: "ai-experts",
          name: "AI 专家",
          description: "沉浸式翻译 AI 专家模式：按场景选用专业翻译策略，替代术语库",
          enabled: true,
        },
        {
          id: "multi-user",
          name: "多用户管理",
          description:
            "管理员可创建普通用户、分配权限并启用 / 停用账号；全站仅一名管理员",
          enabled: true,
        },
      ],
    },
    publicAccess: {
      cardTitle: "公开访问",
      description:
        "勾选对匿名访客开放的模型，并指定一个公开默认模型。与站点默认模型相互独立。",
      modelsTitle: "公开模型",
      providerCol: "供应商",
      modelCol: "模型",
      openCol: "开放",
      defaultCol: "公开默认",
      defaultBadge: "默认",
      setDefault: "设为默认",
      hint: "勾选与设默认即时保存。未开放任何模型时，匿名访客将无法翻译。",
      anonRateLimit: "匿名访客限流（次/分钟）",
      anonRateLimitDesc: "匿名访客每分钟最大请求数；超出会触发限流。",
      save: "保存",
      rows: [
        {
          id: "m-gpt-4.1-mini",
          provider: "OpenAI",
          model: "gpt-4.1-mini",
          open: true,
          isDefault: true,
        },
        {
          id: "m-gpt-4.1",
          provider: "OpenAI",
          model: "gpt-4.1",
          open: true,
          isDefault: false,
        },
        {
          id: "m-deepseek-chat",
          provider: "DeepSeek",
          model: "deepseek-chat",
          open: true,
          isDefault: false,
        },
        {
          id: "m-claude-sonnet",
          provider: "Claude",
          model: "claude-sonnet-4-5",
          open: false,
          isDefault: false,
        },
      ],
    },
    experts: {
      cardTitle: "AI 专家",
      description:
        "基于沉浸式翻译 AI 专家的专业翻译策略。启用后，用户可在翻译页选择不同专家以优化特定场景（科技、金融、GitHub 等）。",
      defaultLabel: "站点默认专家",
      generalDefault: "通用（默认提示词）",
      save: "保存配置",
      rows: expertsZh,
    },
    users: {
      cardTitle: "用户管理",
      description:
        "全站仅一名管理员。可创建普通用户、分配权限、查看各账号用量，并启用或停用账号。",
      addLabel: "新增用户",
      usernameCol: "用户名",
      roleCol: "角色",
      statusCol: "状态",
      permCol: "权限",
      actionsCol: "操作",
      enabled: "已启用",
      disabled: "已停用",
      roleAdmin: "管理员",
      roleUser: "普通用户",
      allPermissions: "全部权限",
      noPermissions: "无",
      deleteLabel: "删除",
      addTitle: "新增普通用户",
      passwordLabel: "密码",
      passwordHint: "至少 8 位",
      permissionsTitle: "权限",
      save: "新增用户",
      cancel: "取消",
      empty: "还没有用户。",
      permissions: {
        translate: "翻译",
        write: "写作",
        providers: "供应商",
        settings: "站点设置",
        usage: "用量概览",
      },
      rows: [
        { id: "u-admin", name: "admin", role: "admin", enabled: true, permissions: [] },
        {
          id: "u-alice",
          name: "alice",
          role: "user",
          enabled: true,
          permissions: ["translate", "write"],
        },
        {
          id: "u-bob",
          name: "bob",
          role: "user",
          enabled: false,
          permissions: ["translate", "write", "providers"],
        },
      ],
    },
  },
};

const en: DemoContent = {
  dashboard: {
    pageTitle: "Dashboard",
    tabs: [
      { id: "overview", label: "Overview" },
      { id: "providers", label: "Providers" },
      { id: "settings", label: "Settings" },
      { id: "public", label: "Public access" },
      { id: "experts", label: "AI experts" },
      { id: "users", label: "Users" },
    ],
    overview: {
      cardTitle: "Usage overview",
      totalRequestsValue: "12,480",
      totalRequestsLabel: "Total requests",
      totalCharsValue: "1,284,300",
      totalCharsLabel: "Total characters",
      providerCol: "Provider",
      requestsCol: "Requests",
      charsCol: "Characters",
      rows: [
        { provider: "OpenAI", type: "openai", requests: "8,240", chars: "964,120" },
        { provider: "Claude", type: "claude", requests: "2,730", chars: "218,450" },
        { provider: "DeepSeek", type: "deepseek", requests: "1,510", chars: "101,730" },
      ],
    },
    profile: {
      cardTitle: "Profile",
      avatarHint: "JPEG / PNG / WebP / GIF, up to 512 KB",
      uploadAvatar: "Upload avatar",
      removeAvatar: "Remove avatar",
      usernameLabel: "Username",
      usernameValue: "younglee",
      currentPasswordLabel: "Current password",
      newPasswordLabel: "New password (optional)",
      newPasswordPlaceholder: "Leave blank to keep it",
      save: "Save changes",
    },
    providers: {
      cardTitle: "Providers",
      addLabel: "Add",
      defaultModelLabel: "Site default model",
      editLabel: "Edit",
      deleteLabel: "Delete",
      nameCol: "Name",
      typeCol: "Type",
      modelCol: "Model",
      statusCol: "Status",
      actionsCol: "Actions",
      addTitle: "Add provider",
      editTitle: "Edit provider",
      formName: "Display name",
      formKey: "API key",
      formModel: "Models",
      formModelHint: "One per line, the first is the default",
      formEnabled: "Enabled",
      save: "Save",
      cancel: "Cancel",
      empty: "No providers yet. Add one to start translating.",
      types: providerTypesEn,
      rows: [
        {
          id: "p-openai",
          name: "My OpenAI",
          type: "openai",
          models: ["gpt-4.1-mini", "gpt-4.1"],
          enabled: true,
          isDefault: true,
        },
        {
          id: "p-claude",
          name: "Claude",
          type: "claude",
          models: ["claude-sonnet-4-5", "claude-opus-4-1"],
          enabled: true,
        },
        {
          id: "p-deepseek",
          name: "DeepSeek",
          type: "deepseek",
          models: ["deepseek-chat", "deepseek-reasoner"],
          enabled: true,
        },
        {
          id: "p-deepl",
          name: "DeepL Pro",
          type: "deepl",
          models: ["prefer_quality_optimized"],
          enabled: false,
        },
      ],
    },
    settings: {
      cardTitle: "Site settings",
      save: "Save settings",
      authedRateLimit: {
        label: "Signed-in rate limit (req/min)",
        description: "Maximum requests per minute for the signed-in admin.",
      },
      translationCache: {
        label: "Translation cache",
        description:
          "Identical text and language pairs return straight from the KV cache.",
      },
      cacheTtl: {
        label: "Cache retention (hours)",
        description: "How long a cached result lives in KV before it expires.",
      },
      organizeFormat: {
        label: "Organize formatting",
        description:
          "Infers paragraphs and lists from messy source text for a cleaner result.",
      },
      disableReasoning: {
        label: "Disable model reasoning",
        description:
          "Turns off thinking / reasoning on the request side to cut latency and cost.",
      },
    },
    modules: {
      cardTitle: "Feature modules",
      moduleCol: "Module",
      descCol: "Description",
      statusCol: "Status",
      enabled: "Enabled",
      disabled: "Disabled",
      rows: [
        {
          id: "public-access",
          name: "Public access",
          description:
            "The public entry point for anonymous visitors: open models, public default, rate limits",
          enabled: true,
        },
        {
          id: "ai-experts",
          name: "AI experts",
          description:
            "Immersive Translate AI expert modes: scenario-specific translation strategies",
          enabled: true,
        },
        {
          id: "multi-user",
          name: "Users",
          description:
            "Admins can create users, assign permissions, and enable or disable accounts",
          enabled: true,
        },
      ],
    },
    publicAccess: {
      cardTitle: "Public access",
      description:
        "Pick the models open to anonymous visitors and name one public default. Independent from the site default model.",
      modelsTitle: "Public models",
      providerCol: "Provider",
      modelCol: "Model",
      openCol: "Open",
      defaultCol: "Public default",
      defaultBadge: "Default",
      setDefault: "Set default",
      hint: "Toggles and the default save instantly. With nothing open, anonymous visitors cannot translate.",
      anonRateLimit: "Anonymous rate limit (req/min)",
      anonRateLimitDesc:
        "Maximum requests per minute for anonymous visitors; beyond that they are rate limited.",
      save: "Save",
      rows: [
        {
          id: "m-gpt-4.1-mini",
          provider: "OpenAI",
          model: "gpt-4.1-mini",
          open: true,
          isDefault: true,
        },
        {
          id: "m-gpt-4.1",
          provider: "OpenAI",
          model: "gpt-4.1",
          open: true,
          isDefault: false,
        },
        {
          id: "m-deepseek-chat",
          provider: "DeepSeek",
          model: "deepseek-chat",
          open: true,
          isDefault: false,
        },
        {
          id: "m-claude-sonnet",
          provider: "Claude",
          model: "claude-sonnet-4-5",
          open: false,
          isDefault: false,
        },
      ],
    },
    experts: {
      cardTitle: "AI experts",
      description:
        "Professional translation strategies from Immersive Translate AI experts. Once enabled, users pick an expert on the translate page for scenarios like tech, finance, or GitHub.",
      defaultLabel: "Site default expert",
      generalDefault: "General (default prompt)",
      save: "Save settings",
      rows: expertsEn,
    },
    users: {
      cardTitle: "Users",
      description:
        "One admin per site. Create regular users, assign permissions, review usage, and enable or disable accounts.",
      addLabel: "Add user",
      usernameCol: "Username",
      roleCol: "Role",
      statusCol: "Status",
      permCol: "Permissions",
      actionsCol: "Actions",
      enabled: "Enabled",
      disabled: "Disabled",
      roleAdmin: "Admin",
      roleUser: "User",
      allPermissions: "All permissions",
      noPermissions: "None",
      deleteLabel: "Delete",
      addTitle: "Add user",
      passwordLabel: "Password",
      passwordHint: "At least 8 characters",
      permissionsTitle: "Permissions",
      save: "Add user",
      cancel: "Cancel",
      empty: "No users yet.",
      permissions: {
        translate: "Translate",
        write: "Write",
        providers: "Providers",
        settings: "Site settings",
        usage: "Usage",
      },
      rows: [
        { id: "u-admin", name: "admin", role: "admin", enabled: true, permissions: [] },
        {
          id: "u-alice",
          name: "alice",
          role: "user",
          enabled: true,
          permissions: ["translate", "write"],
        },
        {
          id: "u-bob",
          name: "bob",
          role: "user",
          enabled: false,
          permissions: ["translate", "write", "providers"],
        },
      ],
    },
  },
};

export const demoCatalogs: Record<"zh-CN" | "en", DemoContent> = {
  "zh-CN": zh,
  en,
};
