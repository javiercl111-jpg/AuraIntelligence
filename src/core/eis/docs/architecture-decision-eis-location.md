# Architecture Decision: EIS Location

## Context
The Executive Intelligence System (EIS) represents the shared core for Aura Intelligence.
Standard architectural rules state that all generated code must reside in `src/modules`.

## Decision
We are intentionally placing the Executive Intelligence Core within `src/core/eis/` instead of `src/modules/`.

## Rationale
EIS is not a functional module. It is transversal infrastructure. 
A functional module depends on the core, not the other way around.

## Rule of Dependency
- `src/modules` CAN import from `src/core/eis`.
- `src/core/eis` CANNOT import from `src/modules`.
- `src/core/eis` must be completely independent of UI frameworks (React), BaaS (Firebase), and specific AI implementations.
