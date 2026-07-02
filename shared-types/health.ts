export interface PingResponse {
  ok: boolean;
  service: string;
  env: string;
  /** D1 / KV 绑定是否就绪。未绑定时前端会强制跳转初始化错误页。 */
  bindings: {
    db: boolean;
    kv: boolean;
  };
}
