# Contract testing

`SealContract.py` pins its runtime via `# { "Depends": "py-genlayer:1jb45..." }`.
`request_acceptance_verdict` calls `gl.eq_principle.prompt_non_comparative`
with a `nondet_verdict()` callback that must actually invoke the LLM
(`gl.nondet.exec_prompt(prompt_text)`), not just return the prompt string —
returning the prompt directly would make every validator "agree" on the raw
prompt text rather than on a judged verdict, and the JSON parsing further
down would always fail.

Before calling the LLM, `nondet_verdict()` also fetches each evidence URL
itself via `gl.nondet.web.render(url, mode="text")` (capped at the first 5
URLs, 2000 chars each) and appends the fetched content to the prompt. Each
validator does this fetch independently as part of its own non-deterministic
execution — the equivalence principle then reconciles any disagreement
across validators the same way it does for the LLM verdict itself.

## Verifying the verdict path locally

```bash
pip install -r requirements.txt
gltest tests/test_verdict.py
```

`gltest` (from `genlayer-test`, matching the pinned SDK) spins up a local
GenLayer devnet with validators and an LLM provider, deploys the contract,
and runs the full create → accept → deliver → verdict flow so the
`gl.nondet.exec_prompt` call is actually exercised end-to-end rather than
just type-checked.
