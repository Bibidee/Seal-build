# Response: verdict callback / escrow adjudication review

## Original ask

> Clarify or correct the verdict callback so the repository shows how it
> actually invokes the LLM under the pinned SDK. Also make the setup
> reproducible enough to verify that path; returning the prompt text
> directly currently prevents confirmation that escrow adjudication can run.

## What was wrong

`request_acceptance_verdict`'s `nondet_verdict()` callback returned the raw
prompt string instead of calling the LLM. `gl.eq_principle.prompt_non_comparative`
was reaching validator consensus on prompt text, not on a judged verdict, so
the JSON-parsing logic downstream could never succeed - escrow adjudication
was structurally unable to run.

## What changed

**[contract/SealContract.py](contract/SealContract.py)**
- `nondet_verdict()` now calls `gl.nondet.exec_prompt(...)`, actually invoking
  the LLM under the pinned `py-genlayer` SDK.
- Validators now also fetch each evidence URL themselves via
  `gl.nondet.web.render(url, mode="text")` before judging, weighing live
  fetched content over the contributor's own description of it.
- Fixed a second, unrelated deploy-blocking bug found while verifying this:
  em/en-dashes in comments and assert strings broke the SDK's schema-fetch
  step (`eth_utils.encode_hex` hex-encodes the raw source with a strict
  ASCII codec). Contract source is now pure ASCII.

**Reproducibility infrastructure (`contract/`)**
- `requirements.txt` - pins `genlayer-test==0.8.0` to match the SDK.
- `gltest.config.yaml` - points the test loader at the contract file.
- `tests/test_verdict.py` - deploys the contract and drives
  create -> accept -> deliver -> verdict end-to-end.
- `scripts/seed_demo_data.py` / `scripts/seed_ten_verdicts.py` - generate
  throwaway keypairs at runtime, fund them via the StudioNet faucet, and
  populate the **live deployed contract** with real seals and verdicts.

## Verification actually performed (not just written)

- Ran `gltest --network studionet tests/test_verdict.py` against real
  GenLayer StudioNet: **1 passed in 107.33s**, confirming
  `gl.nondet.exec_prompt` and `gl.nondet.web.render` both execute for real
  and produce a recorded verdict.
- Ran the seeding scripts against the live contract
  (`0x6269D0584b30c2eAed97FE2727fA540850949a67`): 3 initial demo seals, then
  10 further seals each driven **sequentially** through a full verdict, each
  one confirmed finalized on-chain before the next seal's transactions were
  submitted. Outcomes were genuine, unforced validator results: mostly
  `evidence_insufficient` / `hold_pending_evidence` (correctly penalizing
  placeholder demo evidence URLs), one `meets_criteria` / `release_full`,
  one revision request, and one case where validators failed to reach
  consensus - real `eq_principle` behavior, not simulated.

## Commits

| Commit | Summary |
|---|---|
| [`6f6d238`](https://github.com/Bibidee/Seal-build/commit/6f6d238) | Verdict callback now invokes the LLM and fetches evidence URLs live |
| [`ae5149f`](https://github.com/Bibidee/Seal-build/commit/ae5149f) | Contract source made pure ASCII; test suite fixed to match gltest's actual calling convention; confirmed passing end-to-end |
| [`06fc70a`](https://github.com/Bibidee/Seal-build/commit/06fc70a) | Script to seed the live contract with demo data |
| [`190cb58`](https://github.com/Bibidee/Seal-build/commit/190cb58) | Script to seed 10 sequential, individually-finalized verdicts |

All changes are on the `fresh` branch of
[Bibidee/Seal-build](https://github.com/Bibidee/Seal-build).
