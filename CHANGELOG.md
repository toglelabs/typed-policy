# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2024-02-01

### Added

- **New API**: Separate actor and subject types in `policy<Actor, Subject>()`
- **Function expressions**: Actions can now be functions `({ actor, subject }) => boolean | Expr`
- **Boolean literals**: Actions can use `true` or `false` for static permissions
- **Mixed action types**: Support for DSL, functions, and booleans in the same policy
- **Type-safe context separation**: Clear distinction between actor (requester) and subject (resource)
- **New context types**: `ActorContext`, `SubjectContext`, `EvalContext`, `FullContext`
- **Migration guide**: Complete [MIGRATION_v0.1_to_v0.2.md](MIGRATION_v0.1_to_v0.2.md) with examples

### Changed

- **Breaking**: Policy generic signature changed from `policy<Context>()` to `policy<Actor, Subject>()`
- **Breaking**: Evaluation context structure now uses `{ actor, subject }` instead of flat context
- **Breaking**: SQL compilation options now use `actor` property instead of top-level properties
- Updated all examples to use new v0.2 API
- Enhanced type inference for better error messages
- Updated README.md with new API documentation

### Deprecated

- Single-context policy definition (use separate Actor/Subject types instead)
- Flat context structure in `evaluate()` (use `{ actor, subject }` instead)

### Migration

See [MIGRATION_v0.1_to_v0.2.md](MIGRATION_v0.1_to_v0.2.md) for detailed migration instructions.

Quick migration summary:
1. Split your context into separate `Actor` and `Subject` types
2. Change `policy<Context>()` to `policy<Actor, Subject>()`
3. Wrap evaluation context: `{ actor: {...}, subject: {...} }`
4. Update SQL compilation options to use `actor` property

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

[unreleased]: https://github.com/toglelabs/typed-policy/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/toglelabs/typed-policy/releases/tag/v0.2.0
[0.1.0]: https://github.com/toglelabs/typed-policy/releases/tag/v0.1.0
