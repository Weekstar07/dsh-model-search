/**
 * dsh-model-search — 模型选择器搜索增强插件
 *
 * 在模型选择器下拉列表中嵌入搜索框，实时过滤模型。
 *
 * 实现方式：
 * 1. 使用 MutationObserver 监听 DOM，检测模型选择器下拉面板
 * 2. 在面板顶部插入搜索框，绑定过滤逻辑
 * 3. 使用面板 MutationObserver 监听 React 重新渲染，自动重新应用过滤
 */

// ── 样式注入 ────────────────────────────────────────────────────────────────

const STYLE_ID = 'dsh-model-search-styles'

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = [
    '.dsh-model-search-wrap{',
    '  padding:6px 10px 2px; position:sticky; top:0; z-index:10;',
    '  background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-base,#2a2a2a));',
    '}',
    '.dsh-model-search-input{',
    '  width:100%; box-sizing:border-box;',
    '  padding:5px 28px 5px 8px;',
    '  border:1px solid var(--dsw-alias-border-l1,#444); border-radius:6px;',
    '  font-size:12px; outline:none;',
    '  background:var(--dsw-alias-bg-base,#2a2a2a);',
    '  color:var(--dsw-alias-label-primary,#eee);',
    '  transition:border-color .15s;',
    '}',
    '.dsh-model-search-input:focus{',
    '  border-color:var(--dsw-alias-state-business-primary,#4a9eff);',
    '}',
    '.dsh-model-search-input::placeholder{',
    '  color:var(--dsw-alias-label-tertiary,#888);',
    '}',
    '.dsh-model-search-clear{',
    '  position:absolute; right:13px; top:50%;',
    '  transform:translateY(-50%);',
    '  width:16px; height:16px; border-radius:50%; border:none;',
    '  background:var(--dsw-alias-label-tertiary,#888);',
    '  color:var(--dsw-alias-bg-base,#2a2a2a);',
    '  font-size:10px; line-height:16px; text-align:center;',
    '  cursor:pointer; display:none; padding:0;',
    '}',
    '.dsh-model-search-clear.visible{display:block}',
    '.dsh-model-search-hide{display:none!important}',
  ].join('')
  document.head.appendChild(style)
}

// ── 工具函数 ────────────────────────────────────────────────────────────────

/** 获取面板中所有行级元素（分组标题和模型项），递归查找嵌套容器 */
function getRows(panel: HTMLElement): HTMLElement[] {
  const direct: HTMLElement[] = []
  for (let i = 0; i < panel.children.length; i++) {
    const el = panel.children[i] as HTMLElement
    if (el.nodeType !== 1) continue
    const text = el.textContent?.trim() || ''
    if (!text) continue
    if (el.classList.contains('dsh-model-search-wrap')) continue
    direct.push(el)
  }
  // 如果直接子元素太少（≤3），或者它们自己就包含多个子元素，说明是容器，递归查找
  if (direct.length <= 3) {
    for (let i = 0; i < panel.children.length; i++) {
      const el = panel.children[i] as HTMLElement
      if (el.nodeType !== 1) continue
      if (el.classList.contains('dsh-model-search-wrap')) continue
      if (el.children && el.children.length > 1) {
        const inner = getRows(el)
        if (inner.length > 2) return inner
      }
    }
  }
  return direct
}

/** 判断一行是否为分组标题 */
function isGroupHeader(el: HTMLElement): boolean {
  const text = el.textContent?.trim() || ''
  if (text.length > 30) return false
  // 通过标签/类名判断
  if (el.matches(
    'strong, h1, h2, h3, h4, h5, h6, ' +
    '[class*="group"], [class*="header"], [class*="provider"], [class*="label"], ' +
    '[class*="category"], [class*="section"], [class*="title"]'
  )) return true
  // 模型名通常包含特殊字符，分组标题没有
  if (/[/#]/.test(text)) return false
  // 按内容匹配已知 provider
  if (/^(DeepSeek|ds300|OpenAI|Anthropic|Google|Meta|Mistral|Qwen|通义|百炼|智谱|GLM|Kimi|月之暗面|零一|Yi|Baichuan|MiniMax|Step|讯飞|腾讯|字节|豆包|Moonshot|Codex)/i.test(text)) return true
  return false
}

/** 判断一行是否为模型项 */
function isModelItem(el: HTMLElement): boolean {
  const text = el.textContent?.trim() || ''
  if (!text || text.length < 2) return false
  // 模型名特征
  if (/[-./]/.test(text) || /[vV]\d/.test(text)) return true
  if (/^(deepseek|qwen|kimi|glm|gpt|claude|gemini|llama|mixtral|command|dbrx|yi|baichuan|minimax|step|ernie|doubao|spark)/i.test(text)) return true
  return false
}

/** 查找模型选择器下拉面板 */
function findModelPanel(): HTMLElement | null {
  // 尝试精确选择器
  const selectors = [
    '[class*="model-selector"][class*="menu"]',
    '[class*="model-selector"][class*="popup"]',
    '[class*="model-selector"][class*="dropdown"]',
    '[class*="modelSelector"][class*="menu"]',
    '[class*="model-picker"]',
    '[class*="modelPicker"]',
  ]
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel)
      if (el) return el as HTMLElement
    } catch { /* ignore */ }
  }
  // 兜底：遍历所有可见弹出层，检查是否包含模型列表
  const candidates = document.querySelectorAll(
    '[role="listbox"], [role="menu"], ' +
    '[class*="popup"], [class*="dropdown"], [class*="menu"], ' +
    '[class*="select-options"], [class*="selectOptions"]'
  )
  for (const el of candidates) {
    const htmEl = el as HTMLElement
    if (!htmEl.isConnected) continue
    // 检查是否可见（position:fixed 的元素 offsetParent 为 null，但可能是可见的）
    const style = window.getComputedStyle(htmEl)
    if (style.display === 'none' || style.visibility === 'hidden') continue
    const rows = getRows(htmEl)
    if (rows.length < 2) continue
    const hasHeader = rows.some(isGroupHeader)
    const hasModel = rows.some(isModelItem)
    if (hasHeader && hasModel) return htmEl
  }
  // 最终兜底：查找包含已知模型名的弹出层
  const modelNames = ['DeepSeek-V4-Flash', 'DeepSeek-V4-Pro', 'deepseek-v4-pro']
  for (const el of candidates) {
    const htmEl = el as HTMLElement
    if (!htmEl.isConnected) continue
    const style = window.getComputedStyle(htmEl)
    if (style.display === 'none' || style.visibility === 'hidden') continue
    const text = htmEl.textContent || ''
    for (const name of modelNames) {
      if (text.includes(name)) return htmEl
    }
  }
  return null
}

// ── 搜索框 ────────────────────────────────────────────────────────────────

function createSearchBox(onSearch: (query: string) => void) {
  const wrap = document.createElement('div')
  wrap.className = 'dsh-model-search-wrap'

  const input = document.createElement('input')
  input.className = 'dsh-model-search-input'
  input.type = 'text'
  input.placeholder = '搜索模型...'
  input.spellcheck = false
  input.autocomplete = 'off'

  const clear = document.createElement('button')
  clear.className = 'dsh-model-search-clear'
  clear.textContent = '×'
  clear.type = 'button'
  clear.setAttribute('aria-label', '清除搜索')

  input.addEventListener('input', () => {
    const q = input.value.trim()
    clear.classList.toggle('visible', q.length > 0)
    onSearch(q)
  })

  input.addEventListener('keydown', (e) => {
    e.stopPropagation() // 防止影响 DSH 键盘导航
  })

  clear.addEventListener('click', () => {
    input.value = ''
    clear.classList.remove('visible')
    onSearch('')
    input.focus()
  })

  // 阻止点击事件冒泡到面板，防止面板关闭
  wrap.addEventListener('mousedown', (e) => e.stopPropagation())
  wrap.addEventListener('click', (e) => e.stopPropagation())

  wrap.appendChild(input)
  wrap.appendChild(clear)
  return { wrap, input, clear }
}

// ── 过滤逻辑 ──────────────────────────────────────────────────────────────

let currentQuery = ''

function applyFilter(panel: HTMLElement, query: string) {
  currentQuery = query
  const rows = getRows(panel)

  if (!query) {
    rows.forEach(el => { el.style.display = '' })
    return
  }

  const q = query.toLowerCase()

  // 第一遍：标记匹配/不匹配
  for (const el of rows) {
    const text = el.textContent!.toLowerCase()
    if (isGroupHeader(el)) {
      el.style.display = ''
      ;(el as any)._isHeader = true
      continue
    }
    if (text.includes(q)) {
      el.style.display = ''
      ;(el as any)._matched = true
    } else {
      el.style.display = 'none'
      ;(el as any)._matched = false
    }
  }

  // 第二遍：处理分组标题
  for (let i = 0; i < rows.length; i++) {
    const el = rows[i]
    if (!(el as any)._isHeader) continue
    delete (el as any)._isHeader

    let allHidden = true
    for (let j = i + 1; j < rows.length; j++) {
      const next = rows[j]
      if (isGroupHeader(next)) break
      if (next.style.display !== 'none') {
        allHidden = false
        break
      }
    }
    el.style.display = allHidden ? 'none' : ''
  }

  // 排序：将匹配项移到前面
  const wrap = panel.querySelector('.dsh-model-search-wrap')
  let insertAfter = wrap as HTMLElement | null

  for (const el of rows) {
    if ((el as any)._matched && el.parentNode === panel) {
      if (insertAfter && el.previousElementSibling !== insertAfter) {
        panel.insertBefore(el, insertAfter.nextElementSibling || null)
      } else if (insertAfter && el !== insertAfter.nextElementSibling) {
        panel.insertBefore(el, insertAfter.nextElementSibling)
      }
      insertAfter = el
    }
    delete (el as any)._matched
  }
}

// ── 观察器 ──────────────────────────────────────────────────────────────

let activePanel: HTMLElement | null = null
let searchInput: HTMLInputElement | null = null
let clearBtn: HTMLElement | null = null
let panelObserver: MutationObserver | null = null
let rafId: number | null = null

function setupModelSearch(panel: HTMLElement) {
  if (panel.querySelector('.dsh-model-search-wrap')) return

  const { wrap, input, clear } = createSearchBox((query) => {
    applyFilter(panel, query)
  })

  panel.insertBefore(wrap, panel.firstChild)

  setTimeout(() => input.focus(), 100)

  activePanel = panel

  // 深度观察面板变化，React 重新渲染后重新应用过滤
  if (panelObserver) panelObserver.disconnect()
  panelObserver = new MutationObserver(() => {
    // React 可能重新渲染了列表，延迟后重新应用过滤
    if (rafId) cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(() => {
      rafId = null
      if (!panel.contains(wrap) && panel.isConnected) {
        panel.insertBefore(wrap, panel.firstChild)
      }
      if (currentQuery) {
        applyFilter(panel, currentQuery)
      }
    })
  })
  panelObserver.observe(panel, { childList: true, subtree: true, attributes: false })
}

function cleanup() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null }
  if (panelObserver) {
    panelObserver.disconnect()
    panelObserver = null
  }
  activePanel = null
  searchInput = null
  clearBtn = null
  currentQuery = ''
}

// ── 主入口 ──────────────────────────────────────────────────────────────

let bodyObserver: MutationObserver | null = null

function startObserving() {
  if (bodyObserver) return
  injectStyles()

  bodyObserver = new MutationObserver(() => {
    const panel = findModelPanel()
    if (panel && panel !== activePanel) {
      setupModelSearch(panel)
    } else if (!panel && activePanel) {
      cleanup()
    }
  })

  bodyObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributeFilter: ['class', 'style'],
  })
}

function stopObserving() {
  if (bodyObserver) {
    bodyObserver.disconnect()
    bodyObserver = null
  }
  cleanup()
}

// ── DSH 插件导出 ────────────────────────────────────────────────────────

export const inject = ['slots', 'locale']

export function apply(ctx: any) {
  startObserving()
  ctx.effect(() => () => {
    stopObserving()
  }, 'dsh-model-search: cleanup')
}