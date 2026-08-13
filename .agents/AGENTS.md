# DevLabs Governance Directive for AI Agents & Developers

This document defines the mandatory engineering workflow, decision-making framework, security standards, and behavioral rules for all AI agents and human contributors working within the **DevLabs** repository (`https://devlabs.eu.cc`).

---

## 1. Repository Purpose & Visibility

**DevLabs** is a public development laboratory for experimental software, prototypes, proof-of-concepts (PoCs), beta-stage projects, technical experiments, testing, and evolving software ideas.

### Public Transparency Standard
This repository is intentionally public. Clients, collaborators, teammates, code reviewers, and recruiters will observe development work, project evolution, architectural decisions, commit hygiene, and implementation quality. Every line of code, documentation update, and commit message must reflect senior engineering discipline.

---

## 2. Fundamental Philosophy & Core Rules

### Core Principle
> **Never assume what the user wants simply because a request sounds obvious. The user's request is the source of truth.**

Before making implementation decisions, you must understand:
1. What the user is actually trying to achieve.
2. Why they want it.
3. What behavior they expect.
4. What constraints exist.
5. What parts are already defined vs. unclear.
6. What tradeoffs matter to them.
7. What they explicitly do **NOT** want.

### Key Behavioral Rules
- **Understand Before Editing**: Read relevant repository files, architecture, existing code, documentation, and configuration before making changes.
- **Inspect Before Assuming**: Verify actual code, file paths, and runtime state. Never invent file paths, variable names, or schemas.
- **Clarify Ambiguity**: Ask questions when missing information materially affects the solution. Do not invent product requirements merely because they appear technically convenient.
- **Propose Before Consequential Changes**: Present a clear implementation plan before modifying core architecture, adding dependencies, changing APIs, or creating major components.
- **Obtain User Confirmation**: Wait for explicit user confirmation on ambiguous behavior, major UX decisions, or destructive changes. Silence is NOT approval.
- **Keep Changes Scoped**: Implement only what was requested and approved. Do not opportunistically refactor unrelated code or introduce unneeded abstractions.
- **Empirical Verification**: Never claim a task is complete, a bug is fixed, or tests pass without running verification tools and analyzing real runtime evidence. Never hide errors.

---

## 3. Mandatory Development Lifecycle

All engineering work must follow this 9-stage lifecycle:

```
┌────────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Understand │───>│ Clarify │───>│ Explore │───>│ Propose │───>│ Confirm │
└────────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
                                                                    │
                                                                    ▼
┌──────────┐    ┌────────┐    ┌────────┐    ┌───────────┐
│ Document │<───│ Review │<───│ Verify │<───│ Implement │
└──────────┘    └────────┘    └────────┘    └───────────┘
```

1. **Understand**: Read existing files, configurations, and project history to determine what exists and how the request fits in.
2. **Clarify**: Identify missing requirements, edge cases, UX expectations, and architectural questions. Ask the user when answers materially impact implementation.
3. **Explore**: Investigate existing implementation patterns. Prefer extending existing architecture over introducing replacements.
4. **Propose**: Present a clear implementation plan detailing intended behavior, affected areas, decisions required, and risks/tradeoffs.
5. **Confirm**: Obtain explicit user confirmation for material architectural, behavioral, or scope decisions before proceeding.
6. **Implement**: Write scoped, clean, production-grade code adhering to repository conventions.
7. **Verify**: Run automated checks (linting, type checks, unit/integration tests, build checks, runtime checks) to prove correctness empirically.
8. **Review**: Self-review as a senior engineer for regressions, edge cases, security flaws, performance bottlenecks, and UX inconsistencies.
9. **Document**: Update documentation where the implementation creates durable, meaningful knowledge for future contributors.

---

## 4. Proposal Discipline

Proposals must be clear and understandable to the user without requiring them to inspect raw code. When proposing a change:

1. **User Requirement**: What the user requested.
2. **Current State**: What the repository currently does.
3. **Proposed Solution**: What changes are recommended and why.
4. **Impact & Tradeoffs**: Affected components, dependencies, risks, and alternatives.
5. **User Confirmation Items**: Specific design/behavioral choices requiring user approval.

Never hide architectural choices inside code edits.

---

## 5. Security & Public Hygiene Mandates

- **Zero Secret Exposure**: NEVER commit API keys, passwords, bearer tokens, private certificates, database credentials, or private configuration files.
- **Environment Isolation**: Always use `.env.example` with fake placeholders for environment template variables.
- **Default Proprietary / All Rights Reserved**: Public repository visibility does not constitute an open-source license. Preserve license absence unless an open-source license is explicitly requested by the repository owner.
- **No Masking Failures**: Never swallow exceptions silently, use dummy fallbacks to hide broken code, or comment out failing assertions.

---

## 6. Project Structure Standards for DevLabs

When new experiments, PoCs, or prototypes are added to DevLabs, they must follow a clean, modular root directory structure:

```
devlabs/
├── .agents/                 # Workspace agent governance and workflow rules
│   ├── AGENTS.md            # Primary agent directive
│   └── rules/               # Specific rule modules (workflow, security, etc.)
├── docs/                    # Architecture guides, workflow documentation
├── projects/                # (Future) Modular experiments & projects
├── .gitattributes           # Git attributes and line ending rules
├── .gitignore               # Multi-technology git ignore file
├── README.md                # Primary repository entry point
└── SECURITY.md              # Public security policy
```

*Note: Future sub-projects inside `projects/` or top-level modules should maintain their own isolated documentation (`README.md`), configuration, and test suites while adhering to this overarching governance directive.*
