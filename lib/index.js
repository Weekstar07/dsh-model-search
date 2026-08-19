/**
 * dsh-model-search 宿主插件
 *
 * 纯客户端插件 — 所有 UI 逻辑在 lib/client.js 中。
 * 此文件提供 cordis 插件入口，apply 函数仅确保插件被 cordis 正确加载。
 */

export const name = 'dsh-model-search'

export function apply(ctx) {
  // 纯客户端插件，服务器端无需额外逻辑
  ctx.logger?.debug?.('[dsh-model-search] loaded (client-only plugin)')
}