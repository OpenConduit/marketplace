# OpenConduit Marketplace Registry

The community registry for [OpenConduit](https://github.com/OpenConduit/openconduit-client) — personas, routing profiles, prompt templates, and themes.

## Registry files

| File | Asset type |
|---|---|
| `registry/personas/index.json` | System prompt profiles |
| `registry/prompts/index.json` | Prompt templates with variables |
| `registry/profiles/index.json` | Intelligent routing profiles |
| `registry/themes/index.json` | UI colour themes |
| `registry/providers/index.json` | AI provider configurations |
| `registry/mcp/index.json` | MCP tool servers |

## Contributing

1. Fork this repo
2. Add your entry to the relevant `registry/*/index.json`
3. Open a PR — CI will validate the schema
4. Maintainers review and merge → live immediately

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for entry schemas and guidelines.
