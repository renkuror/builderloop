# BuilderLoop Mechanical Manga Design System

## Design purpose

BuilderLoop is a proof instrument, not a rewards arcade. Its visual language combines a warm technical paper surface, ink-drawn mechanical detail, manga-style proof panels, and a small set of physical-feeling controls. The design should make the ordered protocol legible before it makes the page decorative.

The governing rule is absolute:

```text
interactive control = mechanical keycap
static information = manga technical panel
```

## Visual foundations

| Element | Direction |
| --- | --- |
| Surface | Warm off-white paper, bright paper for raised content, restrained muted-paper fields. |
| Ink | Near-black type, line work, grids, and dividers; no glossy dark-dashboard treatment. |
| Accent | Coral for BuilderLoop emphasis and primary actions; mint only for verified success; amber for pending/time locks; red for rejection; blue-violet only for informational metadata. |
| Illustration | Original SVG/CSS line art: keyboard mechanics, grids, technical marks, limited halftone or hatching. Never use copyrighted keyboard photography. |
| Typography | Strong editorial headline, clear sans-serif product copy, monospace only for IDs, hashes, slots, timestamps, signatures, and raw proof. |

Suggested tokens:

```css
--paper: #f3f1ea;
--paper-bright: #faf9f5;
--paper-muted: #e4e1d8;
--ink: #090a0c;
--ink-soft: #202226;
--gray-900: #191b20;
--gray-700: #44474f;
--gray-500: #7a7d84;
--gray-300: #b7b6b0;
--line: rgba(9, 10, 12, 0.18);
--line-strong: rgba(9, 10, 12, 0.78);
--coral: #ff5a4f;
--mint: #20dfa9;
--amber: #f4b942;
--danger: #ec4055;
--info: #697cff;
```

## Components

### Mechanical keycap

Use a keycap only for an action: route navigation, **OPEN JUDGE DEMO**, **VIEW EVIDENCE**, **CONNECT LOCAL WALLET**, copy, scenario selection, Return Rail stage selection, and **PLAY FIXTURE CLAIM**. It needs a visible focus treatment, a distinct pressed state, and a semantic `<button>` or `<a>` underneath the styling.

Do not use keycap styling for cards, metric blocks, static statuses, architecture nodes, table cells, section headings, or decorative labels. A convincing 3D border on a non-control is a false affordance.

### Technical panel

Use flat manga technical panels for account details, trust disclosures, evidence, frozen configuration, and architecture. Panels may have clipped corners, thin ink outlines, panel codes such as `BL_04`, grid alignment, and restrained hatching. They do not depress, animate like buttons, or imply that clicking them submits an action.

### Return Rail

The Return Rail is the signature interactive component:

```text
01 MODULE → 02 RETURN GATE → 03 SHIP → 04 REWARD
```

Each stage is a real keycap because selecting it focuses or opens the proof drawer. The drawer must state the selected stage, status, a human-readable explanation, and raw evidence/error detail. Useful state vocabulary is `completed`, `pending`, `locked`, `rejected`, `ready`, `shipped`, `claimable`, and `claimed`.

The visual hierarchy matters more than animation: the reader should recognize the ordered gate at a glance. In an early-Ship fixture, the rail stops at **RETURN GATE**, presents `LOCKED`, and keeps the rejection detail available.

### Network/data provenance labels

Labels are evidence claims, not decorative badges:

| Label | Allowed meaning |
| --- | --- |
| **DEMO FIXTURE — NOT LIVE** | Prepared read-only state. It must never be mistaken for a wallet signature, transfer, or public network event. |
| **LIVE LOCAL VALIDATOR** | Optional connected path against the repository's local validator and genuine local account addresses. |
| `LIVE DEVNET` | Used only after the real Devnet deployment and directly verifiable Devnet accounts/transactions recorded in the release evidence exist. |

## Route patterns

| Route | Dominant composition |
| --- | --- |
| `/` | Editorial hero, original keyboard line art, two high-priority CTAs, Return Rail preview, comparison, trust disclosure. |
| `/demo/` | Prepared scenario selector, proof inventory, Return Rail, and no-wallet explanation. |
| `/campaign/` | Dense but calm frozen-config panel; copy affordances only on copy controls. |
| `/progress/` | Current stage, exact blocker, time/period explanation, source proof, optional local panel. |
| `/reward/` | Fixed amount, recipient/mint constraints, duplicate protection, fixture-playback control, optional local panel. |
| `/architecture/` | Blueprint-style static nodes and a clear CohortBuild → BuilderLoop CPI lane. |
| `/evidence/` | Repository, IDs, tests, documentation links, and a conspicuous localnet-only disclosure. |

## Motion, sound, and accessibility

- Motion should clarify focus or state; respect `prefers-reduced-motion` and never make motion necessary for comprehension.
- Keyboard sounds are optional, off only by user choice, and must never autoplay. A single pointer/keyboard activation produces at most one sound.
- Every keycap supports keyboard activation and retains a visible focus indicator.
- Use semantic regions, descriptive labels, meaningful output/live regions, sufficient contrast, tap-sized controls, and screen-reader-hidden decorative art.
- On mobile, collapse to one column, crop keyboard art intentionally, make the Return Rail vertical or horizontally scrollable without page overflow, and preserve proof-drawer readability.

## Truthful state presentation

Success color is reserved for a verified account state. For a real transaction, the interface must not show success before this sequence completes:

```text
idle → awaiting wallet signature → submitted → confirming → finalized
→ refetching accounts → verified from account state
```

Fixture playback is not that sequence. It must retain **DEMO FIXTURE — NOT LIVE**, avoid Explorer links and fabricated signatures, and describe its outcomes as prepared scenarios. The historical fixture materials in this document are not the current public Devnet evidence; see [PUBLIC_RELEASE_AUDIT.md](../PUBLIC_RELEASE_AUDIT.md).
