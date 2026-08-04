# BuilderLoop Blockers

## 2026-08-05

- WSL platform installation completed but requires a Windows restart before a Linux distribution can be installed.
- `wsl --list --online` could not reach the Microsoft distribution catalog in this session (`Wsl/WININET_E_CANNOT_CONNECT`).
- Solana CLI and Anchor CLI remain unavailable until WSL is operational and their official installer runs.
- `npm.ps1` is blocked by PowerShell execution policy; use `pnpm` or `npm.cmd`.
