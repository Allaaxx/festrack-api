# Agent Guidelines

This repository separates **Application-Specific Rules & Skills** (under `.agents/`) from **AI Hero Agent Workflow & Domain Docs** (under `docs/`).

## 1. Application Architecture & Skills (`.agents/`)

All application-specific guidelines, layer rules, coding conventions, and specialized engineering skills belong to the application domain and reside in `.agents/`:

- **Application Rules & Conventions**: See [`.agents/AGENT_RULES.md`](.agents/AGENT_RULES.md) for Clean Architecture guidelines, Bun runtime, Elysia framework, Drizzle ORM, Better Auth, and testing conventions.
- **Application Skills**:
    - `routes`: See [`.agents/skills/routes/SKILL.md`](.agents/skills/routes/SKILL.md) for route definitions, validation macros, and HTTP responses.
    - `use-cases`: See [`.agents/skills/use-cases/SKILL.md`](.agents/skills/use-cases/SKILL.md) for use cases, business validation, and error propagation.
    - `repositories`: See [`.agents/skills/repositories/SKILL.md`](.agents/skills/repositories/SKILL.md) for Drizzle ORM database operations and query abstractions.

---

## 2. AI Hero Agent Workflow & Domain Documentation (`docs/`)

Engineering workflow specifications, issue tracking, and architectural decisions reside under `docs/`:

### Agent skills

#### Issue tracker

Issues and specs live in GitHub Issues. See `docs/agents/issue-tracker.md`.

#### Triage labels

Canonical five-role triage labels are used. See `docs/agents/triage-labels.md`.

#### Domain docs

Single-context repository with root `GLOSSARY.md` and `docs/adr/`. See `docs/agents/domain.md`.
