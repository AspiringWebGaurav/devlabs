# DevLabs Security Policy

Security is a primary requirement for **DevLabs** (`https://devlabs.eu.cc`). As a public development environment, all code, configurations, and documentation must remain safe, secure, and free of secrets at all times.

---

## 1. Zero Secrets Policy

- **Strict Mandate**: No production credentials, private keys, access tokens, database passwords, or confidential client details may EVER be committed to this repository.
- **Environment Files**: Real environment variables must be kept in `.env` files which are strictly excluded from version control via `.gitignore`.
- **Placeholders in Examples**: All `.env.example` or sample configuration files must use obvious, fake placeholders (e.g. `API_KEY=your_api_key_here`). Never use real keys in example files.

---

## 2. Reporting Security Vulnerabilities

If you discover a security vulnerability or an accidentally exposed credential within this repository:

1. **Do NOT open a public issue.**
2. Report the details directly to the repository maintainers via private communication channels or via email to security@devlabs.eu.cc.
3. Include relevant details:
   - Affected project or file path.
   - Nature of the vulnerability or credential type.
   - Steps to reproduce or verify.

The maintainers will respond promptly to investigate, revoke exposed credentials, and apply necessary patches.

---

## 3. Security Auditing & Verification

Before submitting pull requests or committing code:
- Verify that no credentials or private data exist in diffs.
- Ensure input validation, sanitization, and proper access controls are implemented for all experimental endpoints.
- Check third-party dependencies for known vulnerabilities before introduction.
