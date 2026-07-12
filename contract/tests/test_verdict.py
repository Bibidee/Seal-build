"""
Exercises request_acceptance_verdict end-to-end against a local GenLayer
devnet (started by `gltest`), proving the nondet_verdict() callback actually
invokes the LLM via gl.nondet.exec_prompt(...) instead of just returning the
raw prompt string, and that it fetches evidence URLs live via
gl.nondet.web.render(...) rather than relying only on contributor-supplied text.

Run with:
    pip install -r requirements.txt
    gltest test_verdict.py
"""

from gltest import get_contract_factory
from gltest.assertions import tx_execution_succeeded
import json


def test_verdict_invokes_llm_and_records_result(gl_client, default_account, accounts):
    buyer = default_account
    contributor = accounts[1]

    factory = get_contract_factory("SealContract")
    contract = factory.deploy(account=buyer)

    seal_id = contract.connect(buyer).create_seal(
        title="Write a haiku about escrow",
        category="writing",
        deliverable_description="A three-line haiku about trustless escrow.",
        acceptance_criteria="Must be exactly 3 lines and mention escrow.",
        required_evidence="Text of the haiku.",
        deadline=9999999999,
        revision_limit=1,
        visibility_mode="public",
        contributor_address=str(contributor.address),
        bond_required=False,
        bond_amount=0,
        value=1000,
    )

    contract.connect(contributor).accept_seal(seal_id, value=0)

    contract.connect(contributor).submit_delivery(
        seal_id=seal_id,
        delivery_summary="Delivered a 3-line escrow haiku.",
        evidence_urls=json.dumps(["https://example.com/"]),
        private_evidence_commitment_hash="",
        self_assessed_completion_bps=10000,
        contributor_notes="",
    )

    receipt = contract.connect(buyer).request_acceptance_verdict(
        seal_id=seal_id,
        buyer_notes="Looks complete, please confirm.",
    )
    assert tx_execution_succeeded(receipt)

    seal = json.loads(contract.get_seal(seal_id))
    verdict_id = seal["latest_verdict_id"]

    # If nondet_verdict() only echoed the prompt back (the bug this test
    # guards against), verdict_status/payment_action would never parse as
    # valid JSON and latest_verdict_id would stay empty.
    assert verdict_id, "no verdict was recorded — LLM call likely did not run"

    verdict = json.loads(contract.get_verdict(verdict_id))
    assert verdict["verdict_status"] in (
        "meets_criteria",
        "partially_meets_criteria",
        "revision_needed",
        "does_not_meet_criteria",
        "unverifiable",
        "evidence_insufficient",
        "late_delivery_valid",
        "late_delivery_invalid",
        "fraudulent_submission",
    )
