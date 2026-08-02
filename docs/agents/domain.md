# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root if it exists. It points to the `CONTEXT.md` files relevant to each app or package.
- **Relevant context docs** under `apps/*/CONTEXT.md` or `packages/*/CONTEXT.md`, as directed by the map.
- **`docs/adr/`** for system-wide decisions.
- **Relevant context ADRs** under `apps/*/docs/adr/` or `packages/*/docs/adr/`.

If any of these files don't exist, **proceed silently**. Don't flag their absence or suggest creating them upfront. The `/domain-modeling` skill creates them lazily when terms or decisions are actually resolved.

## File structure

This repository uses a multi-context layout:

```text
/
├── CONTEXT-MAP.md
├── docs/adr/                         ← system-wide decisions
├── apps/
│   └── <app>/
│       ├── CONTEXT.md
│       └── docs/adr/                 ← app-context decisions
└── packages/
    └── <package>/
        ├── CONTEXT.md
        └── docs/adr/                 ← package-context decisions
```

Only create a context document for a genuine domain boundary. Purely technical packages, such as shared configuration, do not need their own `CONTEXT.md` unless they acquire domain meaning.

## Use the glossary's vocabulary

When output names a domain concept, use the term as defined in the relevant `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If a needed concept isn't in the glossary yet, either reconsider whether the project uses that language or note the gap for `/domain-modeling`.

## Flag ADR conflicts

If output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
