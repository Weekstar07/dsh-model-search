# dsh-model-search

DSH 网页插件：可搜索的模型选择器 — 在下拉列表中实时过滤模型名称。

## 功能

- 🔍 **搜索框** 嵌入模型选择器下拉菜单顶部
- ⚡ **实时过滤** — 输入即搜，不区分大小写
- 📋 **排序结果** — 匹配的模型在每个 Provider 分组内排到最前面
- 🏷️ **分组感知** — 组内所有模型被过滤掉时，分组标题自动隐藏
- ✨ **无闪烁** — 优化避免不必要的 DOM 操作
- 🌗 **主题适配** — 跟随 DSH 暗色/亮色主题

## 安装

```bash
# 添加到 DSH web profile
dsh plugin --profile web add dsh-model-search
```

或手动添加到 `~/.dsh/profiles/web/package.json`：
```json
{
  "dependencies": {
    "dsh-model-search": "latest"
  },
  "dsh": {
    "profile": {
      "bundles": ["dsh-model-search"]
    }
  }
}
```
## 兼容性

适用于当前 DSH 版本。如果 DSH 升级后插件失效，请检查更新版本或提交 Issue。

## 使用

1. 打开模型选择器下拉菜单（点击输入框右下角的模型名称）
2. 在顶部的搜索框中输入文字
3. 匹配的模型会显示并排到该 Provider 分组的最前面
4. 点击 × 清除搜索

## 开发

```bash
# 克隆并安装依赖
pnpm install

# 构建
pnpm build

# 本地安装测试
dsh plugin --profile web add file:/path/to/dsh-model-search
```

## 许可证

MIT
