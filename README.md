# OpenConduit Marketplace Registry

The community registry for [OpenConduit](https://github.com/OpenConduit/openconduit-client) — personas, routing profiles, prompt templates, and themes.

## Structure

Each asset is a single `.yaml` file in its category folder. One file = one entry = one PR.

```
registry/
  personas/       system prompt profiles
  prompts/        prompt templates with {{variables}}
  profiles/       intelligent routing configurations
  themes/         UI colour themes
  providers/      AI provider configurations
  mcp/            MCP tool servers
```

A CI build step compiles all `.yaml` files in each folder into an `index.json` consumed by the app. You never edit `index.json` directly.

## Contributing

1. Fork this repo
2. Create a new `.yaml` file in the relevant `registry/` subfolder
3. Follow the schema for that asset type (see below)
4. Open a PR — CI will validate the schema automatically
5. Maintainer review + merge → live in the registry immediately

### Persona

```yaml
id: my-persona-id          # kebab-case, unique
name: My Persona
type: persona
author: your-github-handle
verified: false
description: One-line description shown in the marketplace card.
content:
  name: My Persona
  color: "#6366f1"         # hex colour for the avatar
  systemPrompt: |
    Your full system prompt here.
    Multi-line is fine.
```

### Prompt Template

```yaml
id: my-template
name: My Template
type: prompt-template
author: your-github-handle
verified: false
description: One-line description.
content:
  template: |
    Your prompt with {{variable}} placeholders.
  variables:
    - name: variable
      label: Variable Label
      type: text          # text | textarea | select | number
      default: optional
```

### Routing Profile

```yaml
id: my-profile
name: My Profile
type: routing-profile
author: your-github-handle
verified: false
description: One-line description.
content:
  tiers:
    fast: model-id
    balanced: model-id
    powerful: model-id
  taskOverrides:          # optional per-task overrides
    code: balanced
```

### Theme

```yaml
id: my-theme
name: My Theme
type: theme
author: your-github-handle
verified: false
description: One-line description.
content:
  colors:
    --color-primary: "#hex"
    --color-surface: "#hex"
    --color-background: "#hex"
    --color-muted: "#hex"
    --color-text: "#hex"
    --color-border: "#hex"
```

## Verified badge

The `verified: true` flag is set by maintainers after review. Community submissions should use `verified: false`.
