---
name: Bug report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
assignees: ''
---

## Bug Description

A clear and concise description of what the bug is.

## To Reproduce

Steps to reproduce the behavior:

1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior

A clear and concise description of what you expected to happen.

## Code Example

```typescript
// Provide a minimal code example that reproduces the issue
import { policy, eq } from "@typed-policy/core";

const myPolicy = policy({
  subject: "Test",
  actions: {
    test: eq("user.id", "test")
  }
});
```

## Environment

- OS: [e.g., macOS, Linux, Windows]
- Node.js version: [e.g., 18.12.0]
- TypeScript version: [e.g., 5.0.0]
- Package versions:
  - @typed-policy/core: [e.g., 0.1.0]
  - @typed-policy/eval: [e.g., 0.1.0]
  - @typed-policy/drizzle: [e.g., 0.1.0]

## Additional Context

Add any other context about the problem here, such as:
- Error messages
- Stack traces
- Screenshots
