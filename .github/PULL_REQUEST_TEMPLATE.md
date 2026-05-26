## What does this PR add or change?

<!-- One line: e.g. "Add persona: Senior DevOps Engineer" or "Add extension: Word Counter" -->

## Type of entry

- [ ] Persona
- [ ] Prompt template
- [ ] Routing profile
- [ ] Theme
- [ ] Provider
- [ ] MCP server
- [ ] Extension

## Checklist (all entries)

- [ ] File is in the correct `registry/<type>/` folder
- [ ] `id` is kebab-case and unique within the type
- [ ] `type` field matches the folder (e.g. `persona`, `prompt-template`, `routing-profile`, `theme`, `extension`)
- [ ] `version` is set to `"1.0.0"`
- [ ] `verified` is set to `false` (maintainers set this after review)
- [ ] `author` is my GitHub handle
- [ ] CI validation passes (`npm run validate`)

## Extension submissions only

If you checked **Extension** above, complete these additional steps before submitting:

- [ ] The `.ocx` is published as an asset on a public GitHub Release (or equivalent permanent URL)
- [ ] `content.downloadUrl` points to that release asset and uses `https://`
- [ ] The source code for the extension is publicly available (link below)
- [ ] The CI **Security scan** job passes (it will download your `.ocx` and scan for dangerous patterns)
- [ ] I understand that a maintainer will review the source code before `verified` is set to `true`

**Source code URL:** <!-- https://github.com/your-org/your-extension -->
