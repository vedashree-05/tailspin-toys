---
description: 'Cross-cutting comments, documentation, and TypeScript standards'
applyTo: '**/*.{ts,astro}'
---

# Coding Standards

## Comments and documentation

- Comment intent, constraints, and non-obvious decisions — explain **why**, not
  what the code already says.
- Do not add comments that merely paraphrase a statement, repeat a type name, or
  narrate straightforward control flow.
- Treat stale comments as bugs. Update or remove a comment whenever the related
  behavior changes.
- Prefer a short comment immediately above the decision or constraint it
  explains. Use a longer explanation only when the context cannot be made clear
  in the code or its naming.

### Data-layer APIs

Every exported function in `db/` and `src/lib/` must have a TSDoc/JSDoc comment
that:

- states the function's purpose and any important ordering, determinism, or
  build-time behavior;
- documents each parameter with `@param`, including the injectable `db`
  argument used by data-access helpers; and
- documents the result with `@returns`, including `null` or other meaningful
  empty-result behavior.

Keep the comment next to the exported declaration. Do not use documentation
comments to replace explicit TypeScript types.

### Astro component APIs

Reusable `.astro` components must document their `Props` interface. Describe
what each prop controls, whether it is optional, and any meaningful
constraints. Page-only frontmatter types do not need a separate component API
comment unless they are reused.

## TypeScript formatting

- Use two spaces for indentation, single quotes for strings, and semicolons.
- Use trailing commas in multiline objects, arrays, imports, exports, and
  parameter lists.
- Keep braces and spaces consistent with the surrounding code; format
  conditionals and functions with readable whitespace.
- Use explicit parameter and return types for exported functions and data-layer
  helpers.
- Prefer `import type` for imports used only as types.
- Keep formatting changes focused and do not reformat unrelated files.

ESLint enforces the mechanical formatting rules that can be checked reliably.
The documentation and review standards above remain part of code review.
