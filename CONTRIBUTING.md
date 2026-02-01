# Contributing to Typed Policy

Thank you for your interest in contributing to Typed Policy! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Code Review](#code-review)
- [Questions?](#questions)

## Development Setup

### Prerequisites

- Node.js 18 or higher
- pnpm 8 or higher (`npm install -g pnpm`)

### Installation

1. Fork and clone the repository:
```bash
git clone https://github.com/toglelabs/typed-policy.git
cd typed-policy
```

2. Install dependencies:
```bash
pnpm install
```

3. Build all packages:
```bash
pnpm build
```

4. Run tests:
```bash
pnpm test
```

### Available Scripts

- `pnpm test` - Run all tests
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm build` - Build all packages
- `pnpm clean` - Clean build artifacts
- `pnpm check` - Run Biome linting and formatting checks
- `pnpm format` - Format code with Biome

## Project Structure

```
typed-policy/
├── packages/
│   ├── core/          # Core types and DSL
│   ├── eval/          # Frontend evaluator
│   └── drizzle/       # Drizzle ORM compiler
├── examples/
│   ├── react/         # React example app
│   └── hono-drizzle/  # Full-stack API example
└── package.json
```

## Branch Naming

Use the following prefixes for branches:

- `feat/` - New features (e.g., `feat/add-in-operator`)
- `fix/` - Bug fixes (e.g., `fix/path-resolution`)
- `docs/` - Documentation changes (e.g., `docs/readme-update`)
- `refactor/` - Code refactoring (e.g., `refactor/ast-traversal`)
- `test/` - Test additions/changes (e.g., `test/coverage-improvement`)
- `chore/` - Maintenance tasks (e.g., `chore/update-deps`)

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style changes (formatting)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Build process or auxiliary tool changes

Examples:
```
feat(core): add support for 'in' operator
fix(eval): handle null values in path resolution
docs(readme): add installation instructions
test(drizzle): add SQL compilation tests
```

## Testing

### Writing Tests

- All new features must include tests
- Tests should be placed in `*.test.ts` files next to the source code
- Use descriptive test names that explain the behavior being tested

### Test Coverage

We aim for 80% code coverage minimum. Run coverage reports with:

```bash
pnpm test --coverage
```

### Test Structure

```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "./my-module";

describe("myFunction", () => {
  it("should return true for valid input", () => {
    expect(myFunction("valid")).toBe(true);
  });

  it("should throw error for invalid input", () => {
    expect(() => myFunction("invalid")).toThrow();
  });
});
```

## Pull Request Process

1. **Create a branch** from `main` using the naming conventions above

2. **Make your changes** following the code style guidelines

3. **Run checks** before submitting:
```bash
pnpm typecheck
pnpm test
pnpm check
```

4. **Update documentation** if needed (README, API docs, examples)

5. **Fill out the PR template** completely

6. **Link related issues** using keywords (e.g., "Fixes #123")

### PR Checklist

- [ ] Tests pass locally
- [ ] Type checking passes
- [ ] Code is formatted with Biome
- [ ] Documentation is updated
- [ ] PR description explains the changes
- [ ] Related issues are linked

## Code Review

All submissions require review. We aim to:

- Respond to PRs within 48 hours
- Provide constructive feedback
- Request changes when needed
- Merge once approved and CI passes

### What We Look For

- **Correctness**: Does it work as intended?
- **Tests**: Are there adequate tests?
- **Documentation**: Is it documented?
- **Style**: Does it follow project conventions?
- **Performance**: Are there obvious performance issues?
- **Compatibility**: Does it break existing functionality?

## Questions?

- **General questions**: Open a [GitHub Discussion](https://github.com/toglelabs/typed-policy/discussions)
- **Bug reports**: Open an [issue](https://github.com/toglelabs/typed-policy/issues)
- **Security issues**: Email m.ihsan.vp@gmail.com (see [SECURITY.md](./SECURITY.md))

Thank you for contributing to Typed Policy!
