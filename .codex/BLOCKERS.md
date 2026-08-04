# BuilderLoop Blockers

## 2026-08-05

- WSL platform installation completed but requires a Windows restart before a Linux distribution can be installed.
- `wsl --list --online` could not reach the Microsoft distribution catalog in this session (`Wsl/WININET_E_CANNOT_CONNECT`).
- Solana CLI and Anchor CLI remain unavailable until WSL is operational and their official installer runs.
- `npm.ps1` is blocked by PowerShell execution policy; use `pnpm` or `npm.cmd`.
- 2026-08-05 recovery: `cargo search anchor-cli --limit 1` proved registry access is available, but `cargo install --version 0.32.1 anchor-cli --locked` did not complete within the 60-second bounded attempt. It was safely terminated. Anchor and Solana local-validator tests are therefore not executable in this Windows session.
