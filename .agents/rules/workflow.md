# DevLabs Rule: Engineering Workflow & Component Lifecycle

This rule specifies the operational guidelines for executing the 9-stage development lifecycle and managing component/feature changes within the **DevLabs** repository.

---

## 1. The 9-Stage Operational Workflow

### Stage 1: Understand
- Read the codebase before forming implementation hypotheses.
- Locate all relevant entry points, configurations, schemas, and tests related to the request.
- Check existing workspace rules and project documentation.

### Stage 2: Clarify
- Identify vague or broad prompt directives (e.g., "add auth", "add export", "make it faster").
- Deconstruct requirements into specific behavioral questions:
  - **Inputs & Outputs**: What data flows in and out?
  - **Permissions**: Who can perform this action?
  - **Scope**: Is this local to a single view or global?
  - **Persistability**: Is state temporary, local, or synchronized?
  - **Error Handling**: How should failures be presented to the user?
- Ask the user in chat when choices materially affect the user experience or architecture.

### Stage 3: Explore
- Search for pre-existing utility functions, libraries, or patterns in the repository before building new ones.
- Evaluate implementation alternatives (e.g., lightweight vs framework-heavy, client vs server).
- Assess compatibility with existing modules.

### Stage 4: Propose
- For non-trivial changes, write an implementation plan.
- Explicitly list:
  - Affected components and file paths.
  - Dependencies to be added (if any, with strict justification).
  - Data model or interface changes.
  - Verification strategy.

### Stage 5: Confirm
- Present the proposal to the user.
- Highlight open questions or design choices clearly using alert callouts.
- **Do not proceed to implementation on major changes without user confirmation.**

### Stage 6: Implement
- Write clean, well-formatted, self-documenting code.
- Enforce strict typing where applicable (TypeScript, Python type hints, Go/Rust static types).
- Keep changes minimal and laser-focused on the approved task.

### Stage 7: Verify
- Execute applicable build, lint, format, typecheck, and test scripts.
- Perform runtime verification (e.g., visual UI inspection, server response testing).
- Log and inspect execution outputs to ensure zero regressions.

### Stage 8: Review
- Perform senior-level self-review:
  - Are there edge cases unhandled (null, empty array, network drop, timeout)?
  - Are variable names clear and expressive?
  - Are there duplicate code blocks that should be unified?
  - Is security or performance compromised?

### Stage 9: Document
- Update documentation if new public interfaces, workflows, or setup steps were created.
- Ensure `README.md` and inline docstrings accurately reflect the new system state.

---

## 2. High-Impact Change Thresholds

The following changes **ALWAYS** require formal proposal and user confirmation before implementation:
- Introducing a new framework, major library, or external service.
- Modifying authentication, authorization, or security-sensitive paths.
- Altering shared data models, database schemas, or core API contracts.
- Changing state synchronization, caching, or storage mechanisms.
- Destructive operations (deleting components, refactoring core architecture).
- Introducing breaking UI/UX layout alterations.

---

## 3. Low-Impact / Mechanical Changes

Mechanical, unambiguous, or bug-fix changes (fixing a typo, fixing a broken import, updating line alignment) do not require lengthy proposals. Use senior engineering judgment to maintain momentum while keeping commits clean and verified.
