# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

## Reporting a Vulnerability

We take the security of Typed Policy seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Reporting Process

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: **m.ihsan.vp@gmail.com**

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the following information in your report:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### Preferred Languages

We prefer all communications to be in English.

### Security Update Policy

Once a security report is received:

1. We will acknowledge receipt of the vulnerability report within 48 hours
2. We will investigate and validate the reported vulnerability
3. We will work on a fix and coordinate a release timeline
4. We will notify you when the fix is ready for release
5. We will publicly disclose the vulnerability after the fix has been released

### Security Best Practices

When using Typed Policy:

- Always validate your policy context at runtime
- Never expose sensitive user data in policy evaluations
- Use environment variables for sensitive configuration
- Keep your dependencies up to date
- Review the AST before compilation in production environments
