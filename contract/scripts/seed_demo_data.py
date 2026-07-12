"""
Generates fresh throwaway StudioNet keypairs, funds them via the network
faucet, and uses them to populate the deployed SealContract with demo data
(a completed seal with an LLM verdict, and an open funded seal).

Private keys are generated at runtime and never written to disk - copy them
from the printed output if you want to reuse an account, otherwise they are
gone once this process exits.

Run with:
    pip install -r requirements.txt
    python scripts/seed_demo_data.py
"""

import json
import os

import genlayer_py
from genlayer_py import studionet

CONTRACT_ADDRESS = os.environ.get(
    "SEAL_CONTRACT_ADDRESS", "0x6269D0584b30c2eAed97FE2727fA540850949a67"
)
FUND_AMOUNT = 10**19  # 10 GEN, in wei-equivalent base units


def new_funded_account(funder_client, label):
    private_key = genlayer_py.generate_private_key()
    account = genlayer_py.create_account(private_key)
    funder_client.fund_account(address=account.address, amount=FUND_AMOUNT)
    print(f"{label}: address={account.address} private_key={private_key.hex()}")
    return account


def client_for(account):
    return genlayer_py.create_client(chain=studionet, account=account)


def main():
    bootstrap_account = genlayer_py.create_account(genlayer_py.generate_private_key())
    bootstrap_client = client_for(bootstrap_account)
    bootstrap_client.fund_account(address=bootstrap_account.address, amount=FUND_AMOUNT)

    buyer = new_funded_account(bootstrap_client, "buyer")
    contributor_a = new_funded_account(bootstrap_client, "contributor_a")
    contributor_b = new_funded_account(bootstrap_client, "contributor_b")

    buyer_client = client_for(buyer)
    contributor_a_client = client_for(contributor_a)
    contributor_b_client = client_for(contributor_b)

    # --- Seal 1: full lifecycle, ends in an LLM verdict -------------------
    seal_1_id = _create_seal(
        buyer_client,
        title="Landing page hero copy",
        category="writing",
        deliverable_description="Three headline + subhead variants for the product landing page hero.",
        acceptance_criteria="Must include exactly 3 variants, each with a headline under 10 words and a one-sentence subhead.",
        required_evidence="A doc or text listing the 3 variants.",
        deadline=9999999999,
        revision_limit=2,
        visibility_mode="public",
        contributor_address=contributor_a.address,
        bond_required=False,
        bond_amount=0,
        value=int(2e18),
    )

    _accept_seal(contributor_a_client, seal_1_id)
    _submit_delivery(
        contributor_a_client,
        seal_1_id,
        delivery_summary="Delivered 3 hero copy variants covering speed, trust, and simplicity angles.",
        evidence_urls=["https://example.com/"],
        self_assessed_completion_bps=10000,
        contributor_notes="Focused on benefit-led headlines per the brief.",
    )
    _request_verdict(buyer_client, seal_1_id, buyer_notes="Please confirm these meet the brief.")

    # --- Seal 2: left open (funded, unaccepted) as demo inventory --------
    seal_2_id = _create_seal(
        buyer_client,
        title="Onboarding email sequence",
        category="writing",
        deliverable_description="A 3-email onboarding sequence for new signups.",
        acceptance_criteria="3 emails, each under 200 words, with a clear single CTA.",
        required_evidence="Text of all 3 emails.",
        deadline=9999999999,
        revision_limit=1,
        visibility_mode="public",
        contributor_address="",
        bond_required=True,
        bond_amount=int(0.1e18),
        value=int(1.5e18),
    )

    print(json.dumps({
        "contract_address": CONTRACT_ADDRESS,
        "buyer": buyer.address,
        "contributor_a": contributor_a.address,
        "contributor_b": contributor_b.address,
        "seal_1_id": seal_1_id,
        "seal_2_id": seal_2_id,
    }, indent=2))


def _create_seal(client, **kw):
    args = [
        kw["title"], kw["category"], kw["deliverable_description"],
        kw["acceptance_criteria"], kw["required_evidence"], kw["deadline"],
        kw["revision_limit"], kw["visibility_mode"], kw["contributor_address"],
        kw["bond_required"], kw["bond_amount"],
    ]
    tx = client.write_contract(
        address=CONTRACT_ADDRESS,
        function_name="create_seal",
        args=args,
        value=kw["value"],
    )
    client.wait_for_transaction_receipt(transaction_hash=tx)
    # seal_id is assigned as the post-increment seal_count, so the freshly
    # created seal's id is always the current total count.
    count = client.read_contract(
        address=CONTRACT_ADDRESS, function_name="get_seal_count", args=[]
    )
    return str(count)


def _accept_seal(client, seal_id):
    tx = client.write_contract(
        address=CONTRACT_ADDRESS, function_name="accept_seal", args=[seal_id], value=0
    )
    client.wait_for_transaction_receipt(transaction_hash=tx)


def _submit_delivery(client, seal_id, delivery_summary, evidence_urls,
                      self_assessed_completion_bps, contributor_notes):
    tx = client.write_contract(
        address=CONTRACT_ADDRESS,
        function_name="submit_delivery",
        args=[
            seal_id, delivery_summary, json.dumps(evidence_urls), "",
            self_assessed_completion_bps, contributor_notes,
        ],
        value=0,
    )
    client.wait_for_transaction_receipt(transaction_hash=tx)


def _request_verdict(client, seal_id, buyer_notes):
    tx = client.write_contract(
        address=CONTRACT_ADDRESS,
        function_name="request_acceptance_verdict",
        args=[seal_id, buyer_notes],
        value=0,
    )
    # Verdicts can need multiple validator rounds to reach consensus, so
    # give this a much larger budget than the other (near-instant) writes.
    client.wait_for_transaction_receipt(transaction_hash=tx, interval=5000, retries=60)


if __name__ == "__main__":
    main()
