# dsh-model-search

DSH web plugin: searchable model selector — real-time filter models by name in the dropdown.

## Features

- 🔍 **Search box** embedded at the top of the model selector dropdown
- ⚡ **Real-time filtering** — filter as you type, case-insensitive
- 📋 **Sorted results** — matched models move to the top within each provider group
- 🏷️ **Group-aware** — group titles auto-hide when all models in that group are filtered out
- ✨ **No flickering** — optimized to avoid unnecessary DOM operations
- 🌗 **Theme compatible** — respects DSH dark/light theme variables

## Installation

```bash
# Add to your DSH web profile
dsh plugin --profile web add dsh-model-search
```

Or manually add to `~/.dsh/profiles/web/package.json`:
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

## Compatibility

Works with the current DSH version. If the plugin stops working after a DSH update, please check for a newer version or open an issue.
## Usage

1. Open the model selector dropdown (click the model name in the chat input area)
2. Type in the search box at the top
3. Matched models are shown and moved to the top of their provider group
4. Click × to clear the search

## Development

```bash
# Clone and install dependencies
pnpm install

# Build
pnpm build

# Install locally for testing
dsh plugin --profile web add file:/path/to/dsh-model-search
```

## License

MIT
