# DevLabs Rule: Edge-to-Edge Navigation & Layout Mandate

This rule specifies mandatory UI layout boundaries and full-width edge-to-edge standards for all web interfaces built within the **DevLabs** repository.

---

## 1. Edge-to-Edge Header & Footer Directive

- **Full Width (`w-full`) Standard**: All primary top navigation bars (`<header>`) and bottom page footers (`<footer>`) must span the complete horizontal width of the viewport from far left to far right.
- **Forbidden Constraints on Navigation**: Never wrap `<header>` or `<footer>` inner containers in restrictive max-width classes (such as `max-w-7xl`, `max-w-5xl`, etc.) that create empty gaps on wide displays.
- **Padding Standards**: Keep horizontal padding tight (`px-4 sm:px-6`) directly on the full-width `w-full` flex container to ensure pure edge-to-edge alignment without large far-left/far-right gaps on wide displays.

---

## 2. Content Container Scoping

- Main body sections (`<main>`, hero sections, content grids) may continue to use appropriate max-width bounds (e.g. `max-w-7xl mx-auto`) for readability.
- Header bars and footer dividers must remain visual edge-to-edge elements spanning 100% viewport width.
