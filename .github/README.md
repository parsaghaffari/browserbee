# CI/CD Pipeline

This directory contains the GitHub Actions workflows for the BrowserBee project.

## Current Workflows

### CI Pipeline (`ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop` branches

**What it does:**
1. **Multi-Node Testing**: Tests on Node.js 18 and 20
2. **Code Quality**: Runs ESLint to catch style and potential issues
3. **Type Safety**: Validates TypeScript compilation
4. **Test Suite**: Runs all 548 tests across 18 test suites
5. **Build Verification**: Ensures the extension builds successfully
6. **Artifact Storage**: Saves build artifacts for 7 days (Node 20 only)

**Quality Gates:**
- ✅ All ESLint checks must pass
- ✅ TypeScript must compile without errors
- ✅ All tests must pass (548 tests)
- ✅ Extension must build successfully

**Expected Runtime:** ~3-5 minutes per job

## Status Badges

Add these to your main README.md:

```markdown
[![CI](https://github.com/parsaghaffari/browserbee/actions/workflows/ci.yml/badge.svg)](https://github.com/parsaghaffari/browserbee/actions/workflows/ci.yml)
```

## Future Enhancements

Potential additions for the CI/CD pipeline:
- Test coverage reporting
- Security vulnerability scanning
- Performance benchmarking
- Automated dependency updates
- Release automation
- Chrome Web Store deployment
