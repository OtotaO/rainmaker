# NightWatch - Autonomous Overnight Development

[![Bun](https://img.shields.io/badge/Runtime-Bun-333333?logo=bun&style=flat-square)](https://bun.sh/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white&style=flat-square)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Test Coverage](https://img.shields.io/badge/coverage-80%25-brightgreen?style=flat-square)](https://github.com/yourusername/nightwatch/actions)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)

NightWatch is a powerful CLI tool designed to automate overnight development tasks using the speed of Bun and type safety of TypeScript. It features multiple exploration strategies, performance benchmarking, and AI-assisted development capabilities.

## ✨ Features

- **Bun-Powered**: Built with and for [Bun](https://bun.sh/) - the fast all-in-one JavaScript runtime
- **TypeScript First**: Full type safety and excellent IDE support
- **Robust Error Handling**: Comprehensive error types and handling
- **Structured Logging**: Configurable logging with different levels
- **Test Ready**: Built-in testing with Bun's test runner

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (v1.0.0 or later)

### Installation

```bash
# Install globally
bun add -g nightwatch-cli

# Verify installation
nightwatch --version
```

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/nightwatch.git
cd nightwatch

# Install dependencies
bun install

# Build the project
bun run build

# Run tests
bun test
```

## 📖 Usage

### Basic Commands

```bash
# Run with a git repository and task description
nightwatch https://github.com/username/repo.git "Implement feature X"

# Specify a timeout in minutes
nightwatch https://github.com/username/repo.git "Fix bug" --timeout 60

# Enable debug logging
nightwatch https://github.com/username/repo.git "Add tests" --debug
```

## 🧪 Testing

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Generate coverage report
bun test --coverage
```

## 🛠 Development

### Project Structure

```
src/
├── cli.ts              # CLI entry point
├── config/            # Configuration management
├── errors/            # Custom error types
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
    ├── env.ts         # Environment variable handling
    ├── logger.ts      # Logging utilities
    └── process-manager.ts # Process management
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
