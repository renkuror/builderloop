# Frontend TDD Evidence

## Red

Before the UI helper existed, the focused command `pnpm test -- test/frontend-mechanical.test.js` failed with `ERR_MODULE_NOT_FOUND` for `web/ui.js`. That test established the keyboard-control, muted-sound, transaction-state, and responsive-style contract before implementation.

## Green

The completed implementation is covered at two levels:

- `pnpm test` covers the UI helper contract, deterministic fixture routes, semantic KeyButton behavior, sound persistence/no-autoplay, transaction lifecycle order, friendly errors, static accessibility/style safeguards, and the existing protocol tests.
- `pnpm playwright test` covers all seven routes, the early-Ship rejection interaction, keyboard focus and sound control, and the 390px overflow check.

The browser suite is intentionally fixture-first: it never impersonates a wallet signature, token transfer, public transaction, or Devnet result. The optional local claim code marks success only after its Claim PDA and recipient balance are refetched and verified from local account state.

## Coverage note

The repository uses Node's built-in test runner and Playwright without a configured line-coverage reporter. The focused behavior list above is the auditable coverage evidence; no percentage is claimed.
