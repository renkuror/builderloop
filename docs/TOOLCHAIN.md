# Toolchain

## Operating system

Windows with PowerShell. The supported Solana toolchain route is WSL 2, as documented by Solana for Windows development.

## Installed

| Component | Version | Verification |
|---|---:|---|
| Git | 2.55.0.windows.3 | `git --version` |
| GitHub CLI | 2.95.0 | `gh --version` |
| Rust | 1.96.0 | `rustc --version` |
| Cargo | 1.96.0 | `cargo --version` |
| rustfmt / clippy | installed | `rustup component list --installed` |
| Node.js | 24.14.1 | `node --version` |
| npm | 11.18.0 | `npm.cmd --version` |
| pnpm | 11.9.0 | `pnpm --version` |
| TypeScript | 5.9.3 | `.\\node_modules\\.bin\\tsc.cmd --version` |

## Compatibility decision

The project pins `pnpm@11.9.0` and `typescript@5.9.3`. The planned on-chain stack is Solana CLI `3.0.10` and Anchor CLI `0.32.1`, matching the current Solana installation documentation. Anchor and Solana versions will be pinned in `Anchor.toml`, Rust manifests, and CI once the WSL environment is operational.

## Installation record

- Ran `wsl --install --no-distribution` successfully. Windows must restart before WSL can provide its Linux environment.
- After restart, install Ubuntu with `wsl --install -d Ubuntu`.
- Inside Ubuntu, follow the official Solana installer instructions, then verify `solana --version`, `anchor --version`, and `surfpool --version`.
- The attempted Chocolatey package search could not authenticate to the Chocolatey community feed.
- `wsl --list --online` could not reach the Microsoft distribution catalog in the current session (`Wsl/WININET_E_CANNOT_CONNECT`).

## Required PATH entries

- Windows Rust tools: `%USERPROFILE%\\.cargo\\bin`.
- WSL tools are available inside the Ubuntu shell after installation; do not copy keypairs or credentials between environments.

## Remaining blockers

- Restart Windows to activate WSL components.
- Install an Ubuntu WSL distribution after restart.
- Install the pinned Solana and Anchor tools inside WSL; current shell cannot safely verify them until the distribution is available.
