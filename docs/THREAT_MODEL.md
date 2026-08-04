# Threat Model

BuilderLoop does not claim Sybil resistance or proof of unique humanity. The local MVP defends only the specified campaign flow:

- frozen eligibility configuration;
- same-wallet Module and Ship progression;
- same-project artifact lineage;
- replay-resistant Module event IDs;
- fixed reward amount and recipient-owned token account checks.

Primary local risks are incorrect serialization, mutable critical configuration, stale verifier receipts, wallet substitution, project substitution, and reward inventory underflow.
