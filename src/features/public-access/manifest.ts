import type { FeatureManifest } from "@opentranslator/shared-types";

/**
 * 公开访问模块。其 enabled 状态与站点设置 site_public 合一：
 * 启用即对外开放翻译，停用则匿名访客被拒（见 translate/handler.ts 的门禁）。
 * admin-features 路由在 toggle 本模块时会同步写入 site_public。
 */
export const publicAccessManifest: FeatureManifest = {
  key: "public-access",
  name: "公开访问",
  description: "匿名访客的公开翻译入口；启用后可在专属选项卡配置限流与默认供应商",
  enabled: true,
  adminRoute: "/dashboard/public-access",
};
