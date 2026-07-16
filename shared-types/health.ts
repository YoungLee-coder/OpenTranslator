export interface PingResponse {
  ok: boolean;
  service: string;
  env: string;
  /** D1 / KV 绑定是否就绪。未绑定时前端会强制跳转初始化错误页。 */
  bindings: {
    db: boolean;
    kv: boolean;
  };
  /** bindings 齐全且 _migrations 已存在时为 true；绑定缺失时恒为 false。 */
  dbReady: boolean;
  /** dbReady 且仍有未执行迁移时为 true。 */
  needsMigration: boolean;
  /** dbReady 且至少有一名管理员时为 true。 */
  adminReady: boolean;
}
