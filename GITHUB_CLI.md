# GitHub CLI Commands for Typed Policy

This document shows useful GitHub CLI (gh) commands for managing the Typed Policy repository.

## Setup

```bash
# Login to GitHub (if not already logged in)
gh auth login

# Set the repository
gh repo set-remote toglelabs/typed-policy
```

## Daily Development Workflow

### View Repository Status

```bash
# View repository details
gh repo view toglelabs/typed-policy

# Open repository in browser
gh repo view --web

# List open issues
gh issue list

# List open PRs
gh pr list
```

### Working with Issues

```bash
# Create a new issue
gh issue create --title "[BUG] Something is broken" --body "Description here"

# Create from template
gh issue create --template bug_report.md

# View specific issue
gh issue view 123

# Close an issue
gh issue close 123

# Add comment to issue
gh issue comment 123 --body "This is fixed in v0.2.0"
```

### Working with Pull Requests

```bash
# Create a PR from current branch
gh pr create --title "feat: add new operator" --body "Implements #123"

# Create draft PR
gh pr create --draft --title "WIP: new feature"

# View PR status
gh pr status

# View specific PR
gh pr view 456

# Checkout a PR locally
gh pr checkout 456

# Merge a PR
gh pr merge 456 --squash

# Merge with custom message
gh pr merge 456 --squash --subject "feat(core): add in operator"
```

### Working with Releases

```bash
# Create a release (triggers CI publish)
gh release create v0.1.0 --title "v0.1.0" --notes "First stable release"

# Create draft release
gh release create v0.2.0-alpha --draft --prerelease

# List releases
gh release list

# View release
gh release view v0.1.0

# Upload assets to release
gh release upload v0.1.0 ./dist/typed-policy.tar.gz
```

### Workflow & Actions

```bash
# View recent workflow runs
gh run list

# View specific workflow run
gh run view 123456789

# Watch running workflow
gh run watch 123456789

# Re-run failed jobs
gh run rerun 123456789 --failed

# View workflow logs
gh run view 123456789 --log
```

### Secrets Management

```bash
# List secrets
gh secret list

# Set NPM_TOKEN for automated publishing
gh secret set NPM_TOKEN --body "your-npm-token-here"

# Set from file
gh secret set NPM_TOKEN < ./npm-token.txt
```

### Repository Settings

```bash
# Enable/disable features
gh repo edit --enable-issues=true --enable-wiki=false

# Set default branch
gh repo edit --default-branch main

# View settings
gh repo view --json defaultBranchRef,description,homepageUrl
```

## Typical Release Workflow

```bash
# 1. Ensure all tests pass
pnpm test
pnpm typecheck
pnpm build

# 2. Create release commit
git add .
git commit -m "chore(release): prepare v0.1.0"
git push

# 3. Create and push tag (triggers CI publish)
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0

# 4. Create GitHub release with notes
gh release create v0.1.0 \
  --title "v0.1.0 - Initial Release" \
  --notes-file CHANGELOG.md \
  --latest
```

## Conventional Commit Types Reference

When making commits, use these prefixes:

- `feat(scope):` - New features
- `fix(scope):` - Bug fixes
- `docs(scope):` - Documentation only
- `style(scope):` - Code style (formatting, no logic change)
- `refactor(scope):` - Code refactoring
- `test(scope):` - Adding/updating tests
- `chore(scope):` - Build process, dependencies, etc.
- `ci(scope):` - CI/CD changes
- `perf(scope):` - Performance improvements

## Aliases (Add to ~/.bashrc or ~/.zshrc)

```bash
# Quick commands for this project
alias tp-status='gh issue list && gh pr list'
alias tp-release='gh release create'
alias tp-pr='gh pr create --fill'
alias tp-merge='gh pr merge --squash'
```
