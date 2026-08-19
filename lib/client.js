/**
 * dsh-model-search v1.0.1
 * Model selector search enhancement for DeepSeek Harness
 */
window.__ModuleLoader__.load({
  id: 'dsh-model-search',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

    // ── 样式 ──────────────────────────────────────────────────────────────────

    const STYLE_ID = 'dsh-model-search-styles';

    function injectStyles() {
      if (document.getElementById(STYLE_ID)) return;
      var style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = [
        '.dsh-model-search-wrap{padding:6px 10px 2px;position:sticky;top:0;z-index:10;background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-base,#2a2a2a));}',
        '.dsh-model-search-input{width:100%;box-sizing:border-box;padding:5px 28px 5px 8px;border:1px solid var(--dsw-alias-border-l1,#444);border-radius:6px;font-size:12px;outline:none;background:var(--dsw-alias-bg-base,#2a2a2a);color:var(--dsw-alias-label-primary,#eee);transition:border-color .15s;}',
        '.dsh-model-search-input:focus{border-color:var(--dsw-alias-state-business-primary,#4a9eff);}',
        '.dsh-model-search-input::placeholder{color:var(--dsw-alias-label-tertiary,#888);}',
        '.dsh-model-search-clear{position:absolute;right:13px;top:50%;transform:translateY(-50%);width:16px;height:16px;border-radius:50%;border:none;background:var(--dsw-alias-label-tertiary,#888);color:var(--dsw-alias-bg-base,#2a2a2a);font-size:10px;line-height:16px;text-align:center;cursor:pointer;display:none;padding:0;}',
        '.dsh-model-search-clear.visible{display:block}',
      ].join('');
      document.head.appendChild(style);
    }

    // ── DOM 选择器（基于实际 DSH 结构）──────────────────────────────────────

    var SEL = {
      // 面板：包含 groups 容器的菜单
      panel: '[class*="_menu"]',
      // 列表容器（groups + scrollable）
      groups: '[class*="_groups"]',
      // 分组（section）
      group: 'section[class*="_group"]',
      // 分组标题
      groupTitle: 'div[class*="_groupTitle"]',
      // 模型选项
      option: 'button[class*="_option"]',
      // 选中模型
      selected: 'button[class*="_selected"]',
    };

    /** 查找模型选择器下拉面板 */
    function findModelPanel() {
      var panels = document.querySelectorAll(SEL.panel);
      for (var i = 0; i < panels.length; i++) {
        var p = panels[i];
        if (!p.isConnected) continue;
        var style = window.getComputedStyle(p);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        // 检查是否包含 groups 容器
        if (p.querySelector(SEL.groups)) return p;
      }
      return null;
    }

    /** 获取所有模型选项和分组标题 */
    function getRows(panel) {
      var options = Array.from(panel.querySelectorAll(SEL.option));
      var titles = Array.from(panel.querySelectorAll(SEL.groupTitle));
      // 按 DOM 顺序合并
      var all = panel.querySelectorAll(SEL.option + ', ' + SEL.groupTitle);
      return Array.from(all);
    }

    // ── 搜索框 ────────────────────────────────────────────────────────────────

    function createSearchBox(onSearch) {
      var wrap = document.createElement('div');
      wrap.className = 'dsh-model-search-wrap';

      var input = document.createElement('input');
      input.className = 'dsh-model-search-input';
      input.type = 'text';
      input.placeholder = '\u641C\u7D22\u6A21\u578B...';
      input.spellcheck = false;
      input.autocomplete = 'off';

      var clear = document.createElement('button');
      clear.className = 'dsh-model-search-clear';
      clear.textContent = '\u00D7';
      clear.type = 'button';
      clear.setAttribute('aria-label', '\u6E05\u9664\u641C\u7D22');

      input.addEventListener('input', function() {
        var q = input.value.trim();
        clear.classList.toggle('visible', q.length > 0);
        onSearch(q);
      });
      input.addEventListener('keydown', function(e) { e.stopPropagation(); });
      clear.addEventListener('click', function() {
        input.value = '';
        clear.classList.remove('visible');
        onSearch('');
        input.focus();
      });
      wrap.addEventListener('mousedown', function(e) { e.stopPropagation(); });
      wrap.addEventListener('click', function(e) { e.stopPropagation(); });

      wrap.appendChild(input);
      wrap.appendChild(clear);
      return { wrap: wrap, input: input, clear: clear };
    }

    // ── 过滤逻辑 ──────────────────────────────────────────────────────────────

    var currentQuery = '';

    function hideEl(el) {
      // 只在元素当前可见时才隐藏，避免触发不必要的 MutationObserver
      if (el.style.getPropertyValue('display') !== 'none') {
        el.style.setProperty('display', 'none', 'important');
      }
    }
    function showEl(el) {
      // 只在元素当前隐藏时才显示，避免触发不必要的 MutationObserver
      if (el.style.getPropertyValue('display') === 'none') {
        el.style.removeProperty('display');
      }
    }

    function applyFilter(panel, query) {
      currentQuery = query;
      var rows = getRows(panel);

      if (!query) {
        for (var i = 0; i < rows.length; i++) showEl(rows[i]);
        return;
      }

      var q = query.toLowerCase();
      var matched = [];

      // 第一遍：标记匹配/不匹配
      for (var i = 0; i < rows.length; i++) {
        var el = rows[i];
        var text = el.textContent.toLowerCase();
        var isTitle = el.matches(SEL.groupTitle);

        if (isTitle) {
          showEl(el);
          el._isTitle = true;
          continue;
        }

        if (text.indexOf(q) !== -1) {
          showEl(el);
          el._matched = true;
          matched.push(el);
        } else {
          hideEl(el);
          el._matched = false;
        }
      }

      // 第二遍：处理分组标题
      for (var i = 0; i < rows.length; i++) {
        var el = rows[i];
        if (!el._isTitle) continue;
        delete el._isTitle;

        // 找到该标题所在 group 中的所有 option
        var group = el.closest(SEL.group);
        if (!group) { showEl(el); continue; }

        var options = group.querySelectorAll(SEL.option);
        var anyVisible = false;
        for (var j = 0; j < options.length; j++) {
          if (options[j].style.getPropertyValue('display') !== 'none') {
            anyVisible = true;
            break;
          }
        }
        if (anyVisible) showEl(el);
        else hideEl(el);
      }

      // 第三遍：在每个 group 内部，将匹配项移到该 group 最前面（仅当需要时移动）
      if (matched.length === 0) return;

      var groups = panel.querySelectorAll(SEL.group);
      for (var g = 0; g < groups.length; g++) {
        var group = groups[g];
        var opts = Array.from(group.querySelectorAll(SEL.option));
        if (opts.length < 2) continue;
        // 找到该 group 中匹配的选项（按原顺序）
        var groupMatched = [];
        for (var o = 0; o < opts.length; o++) {
          if (opts[o]._matched) groupMatched.push(opts[o]);
        }
        if (groupMatched.length === 0 || groupMatched.length === opts.length) continue;
        // 检查第一个匹配项是否已经在最前面，且所有匹配项是否连续排列在最前面
        var firstOpt = opts[0];
        var alreadyOrdered = true;
        for (var m = 0; m < groupMatched.length; m++) {
          if (groupMatched[m] !== opts[m]) {
            alreadyOrdered = false;
            break;
          }
        }
        if (alreadyOrdered) continue;
        // 反向遍历，移到该 group 最前面
        for (var m = groupMatched.length - 1; m >= 0; m--) {
          var opt = groupMatched[m];
          if (opt !== firstOpt) {
            group.insertBefore(opt, firstOpt);
          }
        }
      }

      // 清理标记
      for (var i = 0; i < rows.length; i++) {
        delete rows[i]._matched;
        delete rows[i]._isTitle;
      }
    }

    // ── 观察器 ──────────────────────────────────────────────────────────────

    var activePanel = null;
    var searchInput = null;
    var clearBtn = null;
    var panelObserver = null;
    var searchWrap = null;
    var debounceTimer = null;

    function setupModelSearch(panel) {
      if (panel.querySelector('.dsh-model-search-wrap')) return;

      var tools = createSearchBox(function(query) {
        applyFilter(panel, query);
      });
      searchWrap = tools.wrap;
      searchInput = tools.input;
      clearBtn = tools.clear;

      // 插入到面板最前面（在 groups 容器之前）
      panel.insertBefore(tools.wrap, panel.firstChild);
      setTimeout(function() { tools.input.focus(); }, 100);

      activePanel = panel;

      if (panelObserver) panelObserver.disconnect();
      panelObserver = new MutationObserver(function() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function() {
          debounceTimer = null;
          if (!panel.contains(tools.wrap) && panel.isConnected) {
            panel.insertBefore(tools.wrap, panel.firstChild);
          }
          if (currentQuery) {
            applyFilter(panel, currentQuery);
          }
        }, 50);
      });
      panelObserver.observe(panel, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
    }

    function cleanup() {
      if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
      if (panelObserver) {
        panelObserver.disconnect();
        panelObserver = null;
      }
      activePanel = null;
      searchInput = null;
      clearBtn = null;
      searchWrap = null;
      currentQuery = '';
    }

    // ── 主入口 ──────────────────────────────────────────────────────────────

    var bodyObserver = null;

    function startObserving() {
      if (bodyObserver) return;
      injectStyles();

      bodyObserver = new MutationObserver(function() {
        var panel = findModelPanel();
        if (panel && panel !== activePanel) {
          setupModelSearch(panel);
        } else if (!panel && activePanel) {
          cleanup();
        }
      });

      bodyObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributeFilter: ['class', 'style'],
      });
    }

    function stopObserving() {
      if (bodyObserver) {
        bodyObserver.disconnect();
        bodyObserver = null;
      }
      cleanup();
    }

    // ── DSH 插件导出 ────────────────────────────────────────────────────────

    var inject = ['slots', 'locale'];

    function apply(ctx) {
      startObserving();
      ctx.effect(function() {
        return function() {
          stopObserving();
        };
      }, 'dsh-model-search: cleanup');
    }

    module.exports = { inject: inject, apply: apply };
    return module.exports;
  }
});