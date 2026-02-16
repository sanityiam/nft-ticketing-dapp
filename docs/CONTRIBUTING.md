// Team Workflow

// Branching
- Default branch: `main`
- Work happens on feature branches:
  - `feat/<short-name>` (new features)
  - `fix/<short-name>` (bug fixes)
  - `docs/<short-name>` (documentation)

// Issues → PRs rul
- Every feature/bugfix must start as a GitHub Issue.
- Every Issue must be implemented via a Pull Request (PR).
- PR title must include the Issue number: `feat: ... (#12)`
- PR description must explain:
  - What changed
  - How to test
  - Any limitations / TODO

// Code citations
- If code is adapted from external sources,
  we MUST add a comment and record it in `CODE_SOURCES.md`.

Example:
```solidity
// Adapted from OpenZeppelin ERC721 example:
// Source: <link>
// Changes: added eventId mapping + used flag
