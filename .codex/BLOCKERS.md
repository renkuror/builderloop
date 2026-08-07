# BuilderLoop Blockers

## Current

- Playwright browser smoke is blocked on this host: the pinned Chromium headless-shell executable is missing from `/home/user/.cache/ms-playwright`, and the package installer exits without populating it. The production bundle, JavaScript CI, and source-level frontend checks pass; no browser result is represented as green.
- No Devnet protocol blocker remains. Both programs, the real demo lifecycle, public evidence verification, and localnet regression pass.
- Production Vercel promotion remains an owner-side merge/deploy action; the live public site still serves the pre-merge build.

## Historical resolution

- The former Windows toolchain blocker was resolved in Ubuntu/WSL2. Solana/validator 4.1.1 and Anchor 0.32.1 now build and execute the local integration suite.
- AVM 1.1.2 is not used to select Anchor; the pinned user-local Cargo-installed `anchor` binary is verified directly.
