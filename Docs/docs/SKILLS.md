# Antigravity Skills Reference

This file records skills that were explicitly available in the project's existing skill guidance found in the user's project context.

## UI/Frontend skills

### `ui-ux-pro-max`
Use for UI/UX reasoning, design-system checks, industry patterns, accessibility, and avoiding common UI anti-patterns.

### `ui-styling`
Use for component styling and accessible UI patterns, including shadcn/ui and Tailwind-oriented work.

### `design-system`
Use for design-token architecture and consistent primitive → semantic → component styling.

### `full-output-enforcement`
Use when complete code output is required; do not leave placeholder truncations such as `// ... rest of code`.

## Minimalism / implementation discipline

### `ponytail`
Use for YAGNI-oriented implementation: reuse existing code, prefer standard/native capabilities, avoid unnecessary dependencies and over-engineering.

Useful documented commands include:
- `/ponytail-review`
- `/ponytail-audit`
- `/ponytail-debt`
- `/ponytail-gain`
- `/ponytail-help`

## Important limitation

The exact file named `global skills.md` was not present in the supplied `ARGUS SGP.zip`, and the available project context did not expose a file with that exact name. Therefore this file does **not** invent additional ML/backend skill names.

If Antigravity's global skills environment contains `global skills.md`, read that file at runtime and use the applicable skills. If a requested skill is unavailable, do not pretend it exists.
