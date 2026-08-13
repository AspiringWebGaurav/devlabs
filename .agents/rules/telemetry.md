# DevLabs Rule: Platform Telemetry & Analytics

This rule governs the standard for **Vercel Web Analytics** and **Vercel Speed Insights** across projects in the **DevLabs** repository.

---

## 1. Platform Configuration Status

- **Web Analytics**: Enabled at the Vercel project settings level.
- **Speed Insights**: Enabled at the Vercel project settings level.

---

## 2. Mandatory Agent Directive

1. **Active Feature Assumption**: Vercel Web Analytics and Vercel Speed Insights are permanently active on the deployment environment (`devlabs.eu.cc`).
2. **Framework Integration Standards**:
   - **Static HTML / Vanilla JS**: Ensure script initializers target `/_vercel/insights/script.js` and `/_vercel/speed-insights/script.js` when client-side script tag integration is required.
   - **React / Next.js / Vue / Vite Projects**: Use official Vercel package integrations (`@vercel/analytics` and `@vercel/speed-insights`) when initializing web application routes.
3. **Deployment Hygiene**: Do not introduce custom tracking blocks or script overrides that interfere with Vercel's native edge telemetry collection routes.
