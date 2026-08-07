# BuilderLoop Blockers

## Current

- Browser-only production smoke is blocked on this host: the escalated Playwright retry reached the runner but all 10 tests failed before assertions because `/home/user/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell` is missing. The initial sandboxed run also returned `EPERM` while binding `127.0.0.1:4173`. Public HTTPS route, bundle, link, Devnet, and source checks pass; no browser result is represented as green.
- No Devnet protocol blocker remains. Both programs, the real demo lifecycle, public evidence verification, and localnet regression pass.
- PR preview deployment is externally blocked by Vercel project permissions (`Skizm-tzz` is not a member of the Vercel project); the existing production alias is independently verified and this is not repository-remediable.

## Historical resolution

- The former Windows toolchain blocker was resolved in Ubuntu/WSL2. Solana/validator 4.1.1 and Anchor 0.32.1 now build and execute the local integration suite.
- AVM 1.1.2 is not used to select Anchor; the pinned user-local Cargo-installed `anchor` binary is verified directly.
