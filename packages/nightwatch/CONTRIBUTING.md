# Contributing to NightWatch

First off, thanks for taking the time to contribute! ❤️

All types of contributions are encouraged and valued. Please make sure to read the relevant section before making your contribution.

## 📋 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [I Have a Question](#-i-have-a-question)
- [I Want To Contribute](#-i-want-to-contribute)
- [Reporting Bugs](#-reporting-bugs)
- [Suggesting Enhancements](#-suggesting-enhancements)
- [Your First Code Contribution](#-your-first-code-contribution)
- [Pull Request Guidelines](#-pull-request-guidelines)
- [Development Setup](#-development-setup)
- [Code Style](#-code-style)
- [Testing](#-testing)
- [Commit Messages](#-commit-messages)
- [License](#-license)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## ❓ I Have a Question

Before you ask a question, please check the following:

- [Documentation](README.md)
- [Existing Issues](https://github.com/yourusername/nightwatch/issues) to see if someone else has already asked the same question

If you still have a question, please [open an issue](https://github.com/yourusername/nightwatch/issues/new/choose) with the `question` label.

## 💡 I Want To Contribute

### Reporting Bugs

#### Before Submitting a Bug Report

- Make sure the bug is not already reported by searching [existing issues](https://github.com/yourusername/nightwatch/issues).
- Check if the bug still exists in the latest version.

#### How to Report a Bug

1. Open a new issue with a clear and descriptive title.
2. Describe the exact steps to reproduce the issue.
3. Provide the expected behavior and the actual behavior.
4. Include any error messages, screenshots, or logs.
5. Specify your environment (OS, Node.js version, Bun version, etc.).

### Suggesting Enhancements

1. Open a new issue with the `enhancement` label.
2. Describe the feature you'd like to see and why it's important.
3. Include any relevant examples or use cases.

## 🛠 Your First Code Contribution

### Development Setup

1. Fork the repository.
2. Clone your fork:
   ```bash
   git clone https://github.com/yourusername/nightwatch.git
   cd nightwatch
   ```
3. Install dependencies:
   ```bash
   bun install
   ```
4. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
5. Make your changes and commit them:
   ```bash
   git commit -m "feat: add your feature"
   ```
6. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
7. Open a Pull Request.

### Code Style

- Use TypeScript with strict mode enabled.
- Follow the existing code style.
- Use meaningful variable and function names.
- Add JSDoc comments for public APIs.
- Keep functions small and focused.

### Testing

- Write tests for new features and bug fixes.
- Run tests before submitting a PR:
  ```bash
  bun test
  bun test --coverage
  ```
- Ensure all tests pass and coverage remains high.

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

## 🔄 Pull Request Guidelines

1. Update the README.md with details of changes if needed.
2. Ensure tests pass and add new tests as needed.
3. Keep the PR focused on a single change.
4. Write a clear PR description with the problem and solution.
5. Reference any related issues.
6. Request reviews from maintainers.

## 📝 License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Thank you for your contribution! 🎉

[![Bun](https://img.shields.io/badge/Powered%20by-Bun-333333?logo=bun&style=flat-square)](https://bun.sh/)
