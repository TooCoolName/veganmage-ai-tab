---
trigger: always_on
glob: "**/*.{ts,svelte}"
description: "Code style guidelines based on ESLint rules, Valibot guards, and Svelte 5 runes ($)."
---

# Code Style Guidelines

This document outlines the coding standards and best practices for this project, derived from the active ESLint configuration and project-specific patterns.

## Promises and Asynchronous Operations

- **Reject with Error Objects**: Always use `Error` objects (or subclasses) when rejecting a Promise.
  ```typescript
  // Bad
  Promise.reject("Something went wrong");
  // Good
  Promise.reject(new Error("Something went wrong"));
  ```
- **Handle All Promises**: Avoid "floating" promises. Every asynchronous operation must be awaited or have a `.catch()` handler.
- **Proper Promise Usage**: Ensure promises are used only where intended. Avoid using them in synchronous contexts like `if` conditions or as non-awaited callbacks in `setTimeout`.

## Type Safety and TypeScript Patterns

- **Strictly No `any`**: The use of the `any` type is forbidden. Use `unknown` or specific types/interfaces.
- **No Type Assertions**: Manual type assertions (e.g., `const x = y as Type;`) are not allowed. Build your logic to rely on proper type flow and inference.
- **Runtime Validation (Valibot)**: Use `valibot` guards/schemas to validate unknown data (e.g., API responses, storage) instead of type assertions.
  ```typescript
  // Good (using src/schema/guards.ts pattern)
  const result = v.safeParse(Schema, data);
  if (result.success) { /* result.output is typed */ }
  ```
- **Explicit Parameter Types**: All function parameters must have explicit type annotations.
  - *Exception*: Arrow function parameters, variable declarations, and member variables may rely on inference.
- **Safe Returns**: Avoid returning values that compromise type safety (e.g., returning an `any` value when a specific type is expected).
- **No `void` Operator**: Do not use the `void` operator.

## Modern Syntax and Svelte 5

- **Nullish Coalescing (`??`)**: Use `??` instead of `||` when you want to provide a default value only for `null` or `undefined`.
- **Optional Chaining (`?.`)**: Use `?.` for safe property/method access on objects that might be null or undefined.
- **Svelte 5 Runes ($)**: Use Svelte 5 runes (`$state`, `$derived`, `$props`, `$effect`, etc.) for reactivity and component logic. Avoid legacy Svelte 4 syntax (e.g., `export let`, `$:`) in new components.

## Clean Code and Project Structure

- **Unused Variables**: Variables that are declared but not used must be prefixed with an underscore (e.g., `_data`).
- **Restricted Globals**: Avoid direct usage of global objects like `chrome` unless specifically permitted in the current context.
- **Alias-Based Imports**: Relative parent imports (`../*`) are not allowed. Always use project aliases (e.g., `@/...`) for importing from parent or sibling directories.
- **Minimal ESLint Annotations**: Avoid using `eslint-disable` or other ESLint-related comments. They should only be used as a last resort in specific UI components (like shadcn).

---
*Note: These rules are enforced via ESLint and manual code review. Build errors or warnings will occur if these guidelines are not followed.*
