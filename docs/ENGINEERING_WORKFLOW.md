# DevLabs Engineering Workflow Guide

This document presents the engineering standard for all software development within **DevLabs** (`https://devlabs.eu.cc`). It establishes how developers and AI agents collaborate, gather requirements, plan changes, execute implementations, verify code quality, and maintain public transparency.

---

## 1. Core Principles

### Principle 1: The User's Intent is the Source of Truth
Never make assumptions about product intent or user behavior simply because a technical approach seems obvious or convenient. If a requirement is missing, ambiguous, or underspecified, clarify it with the user first.

### Principle 2: Empirical Verification over Assumptions
No change is complete until it has been empirically verified using automated tests, build tools, typecheckers, linters, or runtime execution. Never report a task as complete based on code edits alone.

### Principle 3: Transparency in Decision-Making
DevLabs is public. Architecture decisions, tradeoffs, risks, and edge cases must be documented in proposals, commits, and project documentation.

---

## 2. Detailed Lifecycle Stages

### Stage 1: Understand
Before touching code or proposing solutions:
- Inspect existing directory structures, configuration files, and documentation.
- Understand the existing technology stack and dependencies.
- Identify what code will be affected by the requested change.

### Stage 2: Clarify
- Deconstruct ambiguous directives (e.g., "add search", "support file uploads").
- Identify edge cases, permissions, data lifecycle, UX expectations, and performance bounds.
- Formulate specific questions for the user rather than guessing intent.

### Stage 3: Explore
- Evaluate technical options and patterns already present in the codebase.
- Compare trade-offs (e.g., adding a dependency vs. lightweight native implementation).
- Ensure alignment with repository standards.

### Stage 4: Propose
- For any consequential change (new project, new API, data model update, new framework, major UI change), draft a formal proposal.
- A proposal must contain:
  1. **Goal Summary**: What the user requested and why.
  2. **Affected Files/Components**: Specific paths to be created or modified.
  3. **Technical Rationale**: Why this implementation approach was chosen.
  4. **Risks & Tradeoffs**: Potential side effects, complexity, or performance impacts.
  5. **Verification Plan**: Commands and tests to prove correctness.
  6. **User Review Items**: Questions or choices requiring user approval.

### Stage 5: Confirm
- Present the plan to the user.
- Wait for explicit user confirmation before proceeding with implementation.

### Stage 6: Implement
- Execute code changes cleanly and incrementally.
- Write expressive, self-documenting code with proper types/docstrings.
- Restrict edits strictly to the approved scope.

### Stage 7: Verify
- Run code formatters, linters, typecheckers, and build tools.
- Execute unit and integration tests.
- Verify runtime behavior and UI layouts where applicable.
- Confirm zero errors or regressions.

### Stage 8: Review
- Perform a thorough self-review as a senior engineer:
  - Check for security vulnerabilities or unintended logging of sensitive data.
  - Inspect error handling and edge case resilience.
  - Verify naming consistency and code readability.

### Stage 9: Document
- Update repository/project documentation (`README.md`, API specs, docstrings).
- Ensure documentation reflects the exact implementation.

---

## 3. Git & Commit Guidelines

- **Message Format**: Use Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).
- **Atomic Commits**: Each commit should represent a coherent, working logical change.
- **Local Commits Only**: Do not automatically push commits to remote repositories without explicit user instruction.
