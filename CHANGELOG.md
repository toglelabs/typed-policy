# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2024-02-01

### Added

- Initial release of Typed Policy
- Core package with type-safe policy DSL
  - Path type system for compile-time safety
  - Policy AST definition (eq, and, or operators)
  - Policy wrapper function
- Eval package for frontend boolean evaluation
  - Runtime expression evaluator
  - Support for path resolution and comparison
- Drizzle package for SQL compilation
  - Compile policies to Drizzle ORM SQL conditions
  - Table mapping and column resolution
- Examples
  - React interactive policy playground
  - Hono + Drizzle full-stack API with row-level security
- Full test suite with 80% coverage threshold
- Biome for linting and formatting
- GitHub Actions CI/CD pipeline

### Features

- Type-safe policy definition with compile-time path validation
- Single policy definition → frontend eval + backend SQL
- Zero runtime dependencies in core package
- Support for complex nested policies (and, or, eq)
- Framework-agnostic design
- Full TypeScript support

[unreleased]: https://github.com/toglelabs/typed-policy/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/toglelabs/typed-policy/releases/tag/v0.1.0
