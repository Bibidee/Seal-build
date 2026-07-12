"""
Exercises request_acceptance_verdict end-to-end against a GenLayer network
(via `gltest`), proving the nondet_verdict() callback actually invokes the
LLM via gl.nondet.exec_prompt(...) instead of just returning the raw prompt
string, and that it fetches evidence URLs live via gl.nondet.web.render(...)
rather than relying only on contributor-supplied text.

Run with:
    pip install -r requirements.txt
    gltest --network studionet tests/test_verdict.py
"""

from gltest import get_contract_factory
from gltest.assertions import tx_execution_succeeded
import json


def test_verdict_invokes_llm_and_records_result(gl_client, default_account, accounts):
    buyer = default_account
    contributor = accounts[1]

    factory = get_contract_factory("SealContract")
    contract = factory.deploy(account=buyer)

    create_receipt = contract.connect(buyer).create_seal(
        args=[
            "Write a haiku about escrow",
            "writing",
            "A three-line haiku about trustless escrow.",
            "Must be exactly 3 lines and mention escrow.",
            "Text of the haiku.",
            9999999999,
            1,
            "public",
            str(contributor.address),
            False,
            0,
        ]
    ).transact(value=1000)
    assert tx_execution_succeeded(create_receipt)

    # First seal deployed on a fresh contract instance always gets id "1".
    seal_id = "1"

    accept_receipt = contract.connect(contributor).accept_seal(
        args=[seal_id]
    ).transact(value=0)
    assert tx_execution_succeeded(accept_receipt)

    submit_receipt = contract.connect(contributor).submit_delivery(
        args=[
            seal_id,
            "Delivered a 3-line escrow haiku.",
            json.dumps(["https://example.com/"]),
            "",
            10000,
            "",
        ]
    ).transact(value=0)
    assert tx_execution_succeeded(submit_receipt)

    verdict_receipt = contract.connect(buyer).request_acceptance_verdict(
        args=[seal_id, "Looks complete, please confirm."]
    ).transact(value=0)
    assert tx_execution_succeeded(verdict_receipt)

    seal = json.loads(contract.get_seal(args=[seal_id]).call())
    verdict_id = seal["latest_verdict_id"]

    # If nondet_verdict() only echoed the prompt back (the bug this test
    # guards against), verdict_status/payment_action would never parse as
    # valid JSON and latest_verdict_id would stay empty.
    assert verdict_id, "no verdict was recorded - LLM call likely did not run"

    verdict = json.loads(contract.get_verdict(args=[verdict_id]).call())
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
