"""
Populates the deployed SealContract with 10 seals driven all the way to a
verdict, strictly sequentially: each verdict transaction is confirmed
finalized (the seal leaves "under_review") before the next seal's
transactions are ever submitted. Nothing is queued in parallel.

Private keys are generated fresh at runtime per seal and never written to
disk - copy them from the printed output if you want to reuse an account.

Run with:
    pip install -r requirements.txt
    python scripts/seed_ten_verdicts.py
"""

import json
import os
import sys
import time

import genlayer_py
from genlayer_py import studionet

CONTRACT_ADDRESS = os.environ.get(
    "SEAL_CONTRACT_ADDRESS", "0x6269D0584b30c2eAed97FE2727fA540850949a67"
)
FUND_AMOUNT = 10**19  # 10 GEN, in wei-equivalent base units
NUM_SEALS = 10
VERDICT_POLL_INTERVAL_S = 10
VERDICT_MAX_WAIT_S = 1800  # 30 minutes per verdict, hard ceiling

# Alternate the evidence URL so validators see a mix of real vs. placeholder
# content, which produces a mix of verdict outcomes across the 10 runs.
EVIDENCE_URLS = [
    "https://example.com/",
    "https://docs.genlayer.com/",
]


def client_for(account):
    return genlayer_py.create_client(chain=studionet, account=account)


def new_funded_account(funder_client, label):
    private_key = genlayer_py.generate_private_key()
    account = genlayer_py.create_account(private_key)
    funder_client.fund_account(address=account.address, amount=FUND_AMOUNT)
    print(f"  {label}: address={account.address} private_key={private_key.hex()}", flush=True)
    return account


def _create_seal(client, **kw):
    args = [
        kw["title"], kw["category"], kw["deliverable_description"],
        kw["acceptance_criteria"], kw["required_evidence"], kw["deadline"],
        kw["revision_limit"], kw["visibility_mode"], kw["contributor_address"],
        kw["bond_required"], kw["bond_amount"],
    ]
    tx = client.write_contract(
        address=CONTRACT_ADDRESS, function_name="create_seal", args=args, value=kw["value"],
    )
    client.wait_for_transaction_receipt(transaction_hash=tx, interval=3000, retries=30)
    count = client.read_contract(address=CONTRACT_ADDRESS, function_name="get_seal_count", args=[])
    return str(count)


def _accept_seal(client, seal_id):
    tx = client.write_contract(
        address=CONTRACT_ADDRESS, function_name="accept_seal", args=[seal_id], value=0,
    )
    client.wait_for_transaction_receipt(transaction_hash=tx, interval=3000, retries=30)


def _submit_delivery(client, seal_id, delivery_summary, evidence_urls,
                      self_assessed_completion_bps, contributor_notes):
    tx = client.write_contract(
        address=CONTRACT_ADDRESS,
        function_name="submit_delivery",
        args=[seal_id, delivery_summary, json.dumps(evidence_urls), "",
              self_assessed_completion_bps, contributor_notes],
        value=0,
    )
    client.wait_for_transaction_receipt(transaction_hash=tx, interval=3000, retries=30)


def _submit_verdict_request(client, seal_id, buyer_notes):
    return client.write_contract(
        address=CONTRACT_ADDRESS,
        function_name="request_acceptance_verdict",
        args=[seal_id, buyer_notes],
        value=0,
    )


def _wait_for_verdict_finalized(read_client, seal_id, tx_hash):
    """
    Blocks until the seal's verdict has actually finalized on-chain (the
    seal leaves "under_review"), regardless of how many validator
    consensus rounds / rotations it takes. Never returns early.
    """
    deadline = time.time() + VERDICT_MAX_WAIT_S

    while time.time() < deadline:
        try:
            read_client.wait_for_transaction_receipt(
                transaction_hash=tx_hash, interval=5000, retries=6,
            )
        except Exception as e:
            print(f"    ...still committing ({e.__class__.__name__}), polling seal state", flush=True)

        seal = json.loads(
            read_client.read_contract(address=CONTRACT_ADDRESS, function_name="get_seal", args=[seal_id])
        )
        if seal["status"] != "under_review":
            return seal
        time.sleep(VERDICT_POLL_INTERVAL_S)

    raise TimeoutError(f"Seal {seal_id} verdict did not finalize within {VERDICT_MAX_WAIT_S}s")


def main():
    bootstrap_account = genlayer_py.create_account(genlayer_py.generate_private_key())
    bootstrap_client = client_for(bootstrap_account)
    bootstrap_client.fund_account(address=bootstrap_account.address, amount=FUND_AMOUNT)

    results = []

    for i in range(1, NUM_SEALS + 1):
        print(f"\n=== Seal {i}/{NUM_SEALS} ===", flush=True)

        buyer = new_funded_account(bootstrap_client, "buyer")
        contributor = new_funded_account(bootstrap_client, "contributor")
        buyer_client = client_for(buyer)
        contributor_client = client_for(contributor)

        seal_id = _create_seal(
            buyer_client,
            title=f"Demo work item #{i}",
            category="writing",
            deliverable_description="Three headline + subhead variants for a landing page hero.",
            acceptance_criteria="Must include exactly 3 variants, each with a headline under 10 words and a one-sentence subhead.",
            required_evidence="A doc or text listing the 3 variants.",
            deadline=9999999999,
            revision_limit=2,
            visibility_mode="public",
            contributor_address=contributor.address,
            bond_required=False,
            bond_amount=0,
            value=int(1e18),
        )
        print(f"  created seal_id={seal_id}", flush=True)

        _accept_seal(contributor_client, seal_id)
        print("  accepted", flush=True)

        _submit_delivery(
            contributor_client,
            seal_id,
            delivery_summary=f"Delivered 3 hero copy variants for demo #{i}.",
            evidence_urls=[EVIDENCE_URLS[i % len(EVIDENCE_URLS)]],
            self_assessed_completion_bps=10000,
            contributor_notes="Focused on benefit-led headlines per the brief.",
        )
        print("  delivery submitted", flush=True)

        tx = _submit_verdict_request(buyer_client, seal_id, buyer_notes="Please confirm these meet the brief.")
        print(f"  verdict requested (tx={tx}), waiting for finalization...", flush=True)

        seal = _wait_for_verdict_finalized(buyer_client, seal_id, tx)
        verdict_id = seal.get("latest_verdict_id", "")
        verdict = json.loads(
            buyer_client.read_contract(address=CONTRACT_ADDRESS, function_name="get_verdict", args=[verdict_id])
        ) if verdict_id else {}

        result = {
            "seal_id": seal_id,
            "seal_status": seal["status"],
            "verdict_status": verdict.get("verdict_status"),
            "payment_action": verdict.get("payment_action"),
            "buyer": buyer.address,
            "contributor": contributor.address,
        }
        results.append(result)
        print(f"  FINALIZED: {json.dumps(result)}", flush=True)

    print("\n=== Summary ===", flush=True)
    print(json.dumps(results, indent=2), flush=True)


if __name__ == "__main__":
    main()
