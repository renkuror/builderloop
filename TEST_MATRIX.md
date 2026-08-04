# BuilderLoop Test Matrix

Implement every P0 test. Implement P1 after core is green.

## A. Deterministic primitives
- [ ] P0 A01 Rust/TS config bytes and hash match
- [ ] P0 A02 every critical field changes hash
- [ ] P0 A03 field order fixed
- [ ] P0 A04 project_id vectors match
- [ ] P0 A05 attestation vectors match
- [ ] P0 A06 zero/negative period fails
- [ ] P0 A07 timestamp multiplication overflow fails
- [ ] P0 A08 period outside range fails
- [ ] P0 A09 invalid elapsed subtraction fails

## B. Campaign
- [ ] P0 B01 valid draft succeeds
- [ ] P0 B02 default authorities/programs fail
- [ ] P0 B03 invalid schedule/gap/elapsed fails
- [ ] P0 B04 freeze produces expected hash
- [ ] P0 B05 post-freeze mutation fails
- [ ] P0 B06 wrong authority operations fail
- [ ] P0 B07 verifier/reward/source identities cannot change
- [ ] P0 B08 pause blocks Module and Ship
- [ ] P0 B09 finalized campaign rejects actions
- [ ] P1 B10 events include status/hash/authority

## C. UserProgress
- [ ] P0 C01 init requires wallet signer
- [ ] P0 C02 PDA bound to campaign-wallet
- [ ] P0 C03 duplicate init fails
- [ ] P0 C04 stage skipping fails
- [ ] P0 C05 another wallet cannot mutate
- [ ] P1 C06 Clock/period values correct

## D. Module attestation
- [ ] P0 D01 valid signature creates Pending
- [ ] P0 D02 Pending does not unlock Module/Ship
- [ ] P0 D03 early finalize fails
- [ ] P0 D04 delayed finalize succeeds
- [ ] P0 D05 cancel Pending succeeds
- [ ] P0 D06 cancelled cannot finalize
- [ ] P0 D07 finalized cannot cancel
- [ ] P0 D08 wrong verifier/epoch/deactivated key fails
- [ ] P0 D09 stale pending epoch cannot finalize
- [ ] P0 D10 expired voucher fails
- [ ] P0 D11 wrong program/campaign/user domain fails
- [ ] P0 D12 modified project/event/metadata fields fail signature
- [ ] P0 D13 duplicate event fails
- [ ] P0 D14 same event cannot credit another wallet
- [ ] P0 D15 malformed Ed25519 offsets fail
- [ ] P0 D16 substituted message fails
- [ ] P1 D17 public artifact recomputes bytes/hash
- [ ] P1 D18 aliases canonicalize to immutable event ID

## E. Native Ship
- [ ] P0 E01 BuildSubmission requires signer
- [ ] P0 E02 zero artifact hash fails
- [ ] P0 E03 Completion created once and stores correct fields
- [ ] P0 E04 source authority signs CPI
- [ ] P0 E05 wrong source program/authority fails
- [ ] P0 E06 wrong discriminator/owner/PDA fails
- [ ] P0 E07 Alice Completion cannot credit Bob
- [ ] P0 E08 wrong challenge/project fails
- [ ] P0 E09 missing user signer fails
- [ ] P0 E10 Ship before finalized Module fails
- [ ] P0 E11 insufficient period/time fails
- [ ] P0 E12 exact boundary succeeds
- [ ] P0 E13 duplicate Ship fails
- [ ] P0 E14 valid CPI advances atomically
- [ ] P1 E15 failure leaves both programs unchanged

## F. Reward
- [ ] P0 F01 only frozen reward authority creates
- [ ] P0 F02 exact config hash snapshot
- [ ] P0 F03 wrong config/mint/vault/authority/token program fails
- [ ] P0 F04 zero amount/capacity fails
- [ ] P0 F05 activation before/without adequate funding fails
- [ ] P0 F06 valid funding/activation succeeds
- [ ] P0 F07 claim outside window fails
- [ ] P0 F08 claim before Shipped fails
- [ ] P0 F09 recipient wrong mint/owner fails
- [ ] P0 F10 user cannot control amount
- [ ] P0 F11 valid claim transfers exact amount
- [ ] P0 F12 duplicate claim fails
- [ ] P0 F13 inventory cannot underflow
- [ ] P0 F14 concurrent final unit safe
- [ ] P0 F15 pause/resume works
- [ ] P0 F16 early withdrawal fails
- [ ] P0 F17 post-deadline withdrawal succeeds
- [ ] P0 F18 non-authority withdrawal fails
- [ ] P0 F19 close before empty fails
- [ ] P0 F20 terminal empty close succeeds
- [ ] P1 F21 rent destination documented/tested

## G. Frontend/CLI
- [ ] P1 G01 frontend typecheck/build
- [ ] P1 G02 Campaign renders frozen config
- [ ] P1 G03 Progress shows exact lock reason/time
- [ ] P1 G04 cluster links correct
- [ ] P1 G05 test/sponsor labels truthful
- [ ] P1 G06 privacy before join
- [ ] P1 G07 CLI vectors match and inspect correctly
- [ ] P1 G08 no fake authoritative progression DB

## H. Release
- [ ] P0 H01 format/lint/build
- [ ] P0 H02 unit suite
- [ ] P0 H03 cross-program integration suite
- [ ] P1 H04 frontend suite
- [ ] P1 H05 no secrets tracked
- [ ] P1 H06 README claims match code
- [ ] P1 H07 local setup reproducible
- [ ] P1 H08 evidence labels real/local/test/blocked
