# Contributing to Mesa

Thank you for your interest in contributing to Mesa! As a developer runtime for building financial workflows on Stellar, we welcome contributions that improve reliability, performance, adapter providers, and documentation.

## How to Contribute

1. **Search Existing Issues**: Before opening a new issue or PR, search our GitHub repository to check if someone else has already reported or solved the issue.
2. **Open an Issue**: If you find a bug or want to propose a feature request, please open a detailed issue describing your findings or ideas.
3. **Fork and Pull Request**:
   - Fork the repository.
   - Create a feature branch: `git checkout -b feature/my-new-feature`.
   - Make your changes and write automated tests where possible.
   - Submit a pull request against the `main` branch.

## Code Style & Formatting

We use standard TypeScript guidelines. Please make sure your code builds successfully and has no lint/compile errors before committing:
```bash
npm run build
```

## Testing

Ensure all tests pass before submitting a pull request:
```bash
npm run test
```
For integration tests against the Stellar Testnet, refer to our [TEST_PLAN.md](TEST_PLAN.md).
