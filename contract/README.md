# Contract testing

`SealContract.py` pins its runtime via `# { "Depends": "py-genlayer:1jb45..." }`.
`request_acceptance_verdict` calls `gl.eq_principle.prompt_non_comparative`
with a `nondet_verdict()` callback that must actually invoke the LLM
(`gl.nondet.exec_prompt(prompt_text)`), not just return the prompt string -
returning the prompt directly would make every validator "agree" on the raw
prompt text rather than on a judged verdict, and the JSON parsing further
down would always fail.

Before calling the LLM, `nondet_verdict()` also fetches each evidence URL
itself via `gl.nondet.web.render(url, mode="text")` (capped at the first 5
URLs, 2000 chars each) and appends the fetched content to the prompt. Each
validator does this fetch independently as part of its own non-deterministic
execution - the equivalence principle then reconciles any disagreement
across validators the same way it does for the LLM verdict itself.

The contract source must stay pure ASCII. The toolchain hex-encodes the raw
file bytes with a strict ASCII codec before it can even fetch the contract's
schema, so a stray em/en-dash in a comment or assert message breaks
deployment with an opaque `Failed to get schema from all clients` error, not
an encoding error pointing at the actual character.

## Verifying the verdict path

Requires **Python 3.12+** (`genlayer-test` does not support 3.11).

```bash
python -m venv .venv && source .venv/Scripts/activate  # or .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
gltest --network studionet tests/test_verdict.py
```

`gltest` (from `genlayer-test`, matching the pinned SDK) deploys the
contract to GenLayer StudioNet and runs the full create -> accept -> deliver
-> verdict flow, so `gl.nondet.exec_prompt` and `gl.nondet.web.render` are
exercised end-to-end against real validators and a real LLM rather than just
type-checked. `gltest.config.yaml` points the contract loader at this
directory (the contract file isn't under the framework's default
`contracts/` subfolder).

There's no local devnet available without Docker, which this environment
doesn't have; `--network studionet` runs against GenLayer's hosted public
network instead using an ephemeral test account funded by the network.

Confirmed passing (2026-07-12): `1 passed in 107.33s`.

## Seeding demo data on the live contract

`scripts/seed_demo_data.py` generates fresh throwaway StudioNet keypairs at
runtime (never written to disk), funds them via the network faucet
(`client.fund_account`), and populates the deployed contract
(`NEXT_PUBLIC_CONTRACT_ADDRESS` / `SEAL_CONTRACT_ADDRESS` env var) with demo
seals - one carried through to a real LLM verdict, one left as an open
funded listing.

```bash
pip install -r requirements.txt
python scripts/seed_demo_data.py
```

Verdict transactions can need multiple validator consensus rounds, so that
step waits up to 5 minutes; the other writes are near-instant. Save the
printed private keys if you want to reuse those accounts - they aren't
persisted anywhere.
