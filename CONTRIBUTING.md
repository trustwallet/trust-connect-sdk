# Contributing

Thanks for taking the time to contribute!

## Prerequisites

- Node.js 20+ (Vitest requires 20, 22, or 24)
- pnpm (see `package.json` for the pinned version)

## Getting Started

Use this flow to test changes in the playground with watch mode:

```sh
pnpm install
pnpm run build
pnpm run dev:all
```

## Pull Requests

- Before opening a PR, please open an issue with:
  - A detailed description of the problem
  - A potential solution or direction

We will discuss the issue and agree on the best solution.
Once we have a clear path forward, you can open a PR.
Please add tests when applicable.

Make sure these pass without any errors:

```sh
pnpm run lint
pnpm run test
pnpm run build
```

## Commit Messages (Semantic Commits)

Use semantic commit prefixes:

- `feat:` new functionality
- `fix:` bug fixes
- `chore:` tooling or maintenance
- `refactor:` code changes without behavior change
- `test:` adding or updating tests

Example:

```text
feat: add useConnection hook for single namespace
```

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.