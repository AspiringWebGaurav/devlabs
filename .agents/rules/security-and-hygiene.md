# DevLabs Rule: Security, Quality & Git Hygiene

This rule governs security enforcement, code quality standards, secret management, and git practices within the **DevLabs** repository.

---

## 1. Security & Secret Protection

### Public Repository Safety
DevLabs is permanently public. Security must be proactively enforced at all times.

- **Forbidden Commits**:
  - API Keys, Access Tokens, Bearer Tokens.
  - Passwords, OAuth secrets, database URIs containing credentials.
  - Private SSH keys, TLS certificates, `.pfx`/`.pem` files.
  - Production or staging secrets of any kind.

- **Environment Variable Standard**:
  - Store local configuration in `.env` (which must be ignored in `.gitignore`).
  - Provide `.env.example` containing only safe, fake placeholders (e.g. `API_KEY=your_api_key_here`).
  - Never put real API keys inside example configs, test files, or comments.

- **Secret Leak Discovery Protocol**:
  - If a secret is accidentally detected, **STOP** immediately.
  - Do not proceed with the current task until the secret is revoked and purged from git history.
  - Notify the user immediately with remediation steps.

---

## 2. Code Quality & Defensive Engineering

- **No Silent Error Swallowing**:
  - Never wrap code in empty `try/catch` blocks or ignore errors unless explicitly documented and handled.
  - Log errors with helpful context and return structured error states.

- **No Dummy Fallbacks for Broken Contracts**:
  - If an API or service fails, return a clear error state rather than masking it with fake data (e.g., returning `0` or `""` silently).

- **No Code Deletion To Force Tests To Pass**:
  - Never comment out, bypass, or delete failing tests or assertions to fake build success.

- **Strict Type Verification**:
  - Verify object properties before dereferencing (`foo?.bar` or `if (foo && foo.bar)`).
  - Avoid `any` types in TypeScript or un-typed `dict` structures in Python when schemas are known.

---

## 3. Git Hygiene & Commits

- **Conventional Commit Standard**:
  Use clear, descriptive conventional commit messages:
  - `feat: <description>` for new features or prototypes.
  - `fix: <description>` for bug fixes.
  - `docs: <description>` for documentation updates.
  - `chore: <description>` for setup, config, or maintenance.
  - `refactor: <description>` for code structural improvements.
  - `test: <description>` for adding or updating tests.

- **Atomic Commits**:
  - Keep commits focused on a single change set.
  - Do not mix unrelated refactorings or cosmetic edits with functional changes.

- **No Automatic Pushing**:
  - Local commits are created as approved.
  - **NEVER** automatically push commits to remote repositories (`origin main`) without explicit user instruction.
