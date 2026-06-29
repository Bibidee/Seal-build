# v0.2.17
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
from datetime import datetime, timezone


def _now() -> int:
    return int(datetime.now(timezone.utc).timestamp())

ALLOWED_VERDICT_STATUS = [
    "meets_criteria",
    "partially_meets_criteria",
    "revision_needed",
    "does_not_meet_criteria",
    "unverifiable",
    "evidence_insufficient",
    "late_delivery_valid",
    "late_delivery_invalid",
    "fraudulent_submission",
]

ALLOWED_PAYMENT_ACTION = [
    "release_full",
    "release_partial",
    "request_revision",
    "refund_buyer",
    "split_payment",
    "hold_pending_evidence",
    "slash_contributor_bond",
]

ALLOWED_BOND_ACTION = [
    "none",
    "return",
    "slash_partial",
    "slash_full",
]

TERMINAL_STATUSES = [
    "accepted_full",
    "accepted_partial",
    "rejected",
    "refunded",
    "settled",
    "cancelled",
    "expired",
]


def _json(v) -> str:
    return json.dumps(v, sort_keys=True, separators=(",", ":"))


def _loads(raw: str, fallback):
    if not raw:
        return fallback
    try:
        return json.loads(raw)
    except Exception:
        return fallback


@gl.evm.contract_interface
class _EOA:
    class View:
        pass

    class Write:
        pass


class SealContract(gl.Contract):
    # seal_id -> seal JSON
    seals: TreeMap[str, str]

    # delivery_id (seal_id:rev) -> delivery JSON
    deliveries: TreeMap[str, str]

    # verdict_id (seal_id:rev) -> verdict JSON
    verdicts: TreeMap[str, str]

    # ordered seal IDs: index -> seal_id
    seal_ids: TreeMap[str, str]

    # total number of seals
    seal_count: u256

    # buyer_address -> JSON array of seal_ids
    buyer_seals: TreeMap[str, str]

    # contributor_address -> JSON array of seal_ids
    contributor_seals: TreeMap[str, str]

    # address -> JSON array of activity events
    wallet_activity: TreeMap[str, str]

    def __init__(self) -> None:
        self.seals = TreeMap()
        self.deliveries = TreeMap()
        self.verdicts = TreeMap()
        self.seal_ids = TreeMap()
        self.seal_count = u256(0)
        self.buyer_seals = TreeMap()
        self.contributor_seals = TreeMap()
        self.wallet_activity = TreeMap()

    # -----------------------------------------------------------------------
    # create_seal (PAYABLE)
    # Buyer creates and funds a Work Seal in one transaction.
    # -----------------------------------------------------------------------

    @gl.public.write.payable
    def create_seal(
        self,
        title: str,
        category: str,
        deliverable_description: str,
        acceptance_criteria: str,
        required_evidence: str,
        deadline: u256,
        revision_limit: u256,
        visibility_mode: str,
        contributor_address: str,
        bond_required: bool,
        bond_amount: u256,
    ) -> str:
        value = gl.message.value
        assert value > u256(0), "GEN escrow is required — no zero-value seal"
        assert title.strip(), "title must not be empty"
        assert deliverable_description.strip(), "deliverable_description must not be empty"
        assert acceptance_criteria.strip(), "acceptance_criteria must not be empty"
        assert int(deadline) > _now(), "deadline must be in the future"

        if bond_required:
            assert int(bond_amount) > 0, "bond_amount must be > 0 when bond is required"

        current_count = int(self.seal_count)
        seal_id = str(current_count + 1)

        self.seal_ids[str(current_count)] = seal_id
        self.seal_count = u256(current_count + 1)

        buyer = str(gl.message.sender_address)
        now = _now()

        seal = {
            "seal_id": seal_id,
            "buyer": buyer,
            "contributor": contributor_address.strip() if contributor_address.strip() else "",
            "title": title,
            "category": category,
            "deliverable_description": deliverable_description,
            "acceptance_criteria": acceptance_criteria,
            "required_evidence": required_evidence,
            "total_escrow": str(int(value)),
            "remaining_escrow": str(int(value)),
            "bond_required": bond_required,
            "bond_amount": str(int(bond_amount)),
            "bond_locked": "0",
            "deadline": str(int(deadline)),
            "revision_limit": str(int(revision_limit)),
            "revisions_used": "0",
            "visibility_mode": visibility_mode if visibility_mode in ("public", "private") else "public",
            "status": "funded",
            "created_at": str(now),
            "accepted_at": "0",
            "latest_delivery_id": "",
            "latest_verdict_id": "",
            "delivery_count": "0",
            "payout_amount": "0",
            "refund_amount": "0",
            "bond_action": "none",
            "payout_claimed": False,
            "refund_claimed": False,
            "bond_claimed": False,
        }

        self.seals[seal_id] = _json(seal)

        existing = _loads(self.buyer_seals.get(buyer, ""), [])
        existing.append(seal_id)
        self.buyer_seals[buyer] = _json(existing)

        self._log_activity(
            buyer,
            {
                "event": "seal_created",
                "seal_id": seal_id,
                "amount": str(int(value)),
                "ts": str(now),
            },
        )

        return seal_id

    # -----------------------------------------------------------------------
    # accept_seal (PAYABLE — contributor may need to send bond)
    # -----------------------------------------------------------------------

    @gl.public.write.payable
    def accept_seal(self, seal_id: str) -> None:
        raw = self.seals.get(seal_id, "")
        assert raw, "Seal not found"

        seal = _loads(raw, {})
        assert seal["status"] == "funded", f"Seal is not available for acceptance (status: {seal['status']})"
        assert _now() < int(seal["deadline"]), "Seal deadline has passed"

        contributor = str(gl.message.sender_address)
        assert contributor.lower() != seal["buyer"].lower(), "Buyer cannot be contributor"

        if seal["contributor"]:
            assert contributor.lower() == seal["contributor"].lower(), "Only the invited contributor may accept this seal"

        bond_locked = u256(0)

        if seal["bond_required"]:
            required_bond = int(seal["bond_amount"])
            sent = int(gl.message.value)
            assert sent >= required_bond, f"Bond required: {required_bond} wei, sent: {sent} wei"

            bond_locked = u256(required_bond)

            if sent > required_bond:
                _EOA(Address(contributor)).emit_transfer(value=u256(sent - required_bond))
        else:
            assert int(gl.message.value) == 0, "Bond not required for this seal"

        now = _now()

        seal["contributor"] = contributor
        seal["bond_locked"] = str(int(bond_locked))
        seal["accepted_at"] = str(now)
        seal["status"] = "accepted"

        self.seals[seal_id] = _json(seal)

        existing = _loads(self.contributor_seals.get(contributor, ""), [])
        if seal_id not in existing:
            existing.append(seal_id)

        self.contributor_seals[contributor] = _json(existing)

        self._log_activity(
            contributor,
            {
                "event": "seal_accepted",
                "seal_id": seal_id,
                "bond": str(int(bond_locked)),
                "ts": str(now),
            },
        )

    # -----------------------------------------------------------------------
    # cancel_unaccepted_seal — buyer cancels before acceptance
    # -----------------------------------------------------------------------

    @gl.public.write
    def cancel_unaccepted_seal(self, seal_id: str) -> None:
        raw = self.seals.get(seal_id, "")
        assert raw, "Seal not found"

        seal = _loads(raw, {})
        caller = str(gl.message.sender_address)

        assert caller.lower() == seal["buyer"].lower(), "Only buyer can cancel"
        assert seal["status"] == "funded", "Can only cancel a funded (unaccepted) seal"

        escrow = int(seal["total_escrow"])
        assert escrow > 0, "No escrow to refund"

        now = _now()

        seal["status"] = "cancelled"
        seal["refund_amount"] = str(escrow)
        seal["remaining_escrow"] = "0"
        seal["refund_claimed"] = True

        self.seals[seal_id] = _json(seal)

        self._log_activity(
            caller,
            {
                "event": "seal_cancelled",
                "seal_id": seal_id,
                "refund": str(escrow),
                "ts": str(now),
            },
        )

        _EOA(Address(caller)).emit_transfer(value=u256(escrow))

    # -----------------------------------------------------------------------
    # expire_seal — anyone can expire if deadline passed and seal is funded/accepted
    # -----------------------------------------------------------------------

    @gl.public.write
    def expire_seal(self, seal_id: str) -> None:
        raw = self.seals.get(seal_id, "")
        assert raw, "Seal not found"

        seal = _loads(raw, {})
        assert seal["status"] in ("funded", "accepted"), f"Cannot expire seal in status: {seal['status']}"
        assert _now() >= int(seal["deadline"]), "Seal deadline has not passed yet"

        buyer = seal["buyer"]
        escrow = int(seal["total_escrow"])
        bond = int(seal["bond_locked"])
        now = _now()

        seal["status"] = "expired"
        seal["remaining_escrow"] = "0"
        seal["refund_amount"] = str(escrow)
        seal["refund_claimed"] = True

        if bond > 0:
            seal["bond_action"] = "return"
            seal["bond_claimed"] = True

        self.seals[seal_id] = _json(seal)

        self._log_activity(
            buyer,
            {
                "event": "seal_expired",
                "seal_id": seal_id,
                "refund": str(escrow),
                "ts": str(now),
            },
        )

        if escrow > 0:
            _EOA(Address(buyer)).emit_transfer(value=u256(escrow))

        if bond > 0 and seal["contributor"]:
            contributor = seal["contributor"]

            self._log_activity(
                contributor,
                {
                    "event": "bond_returned_expiry",
                    "seal_id": seal_id,
                    "bond": str(bond),
                    "ts": str(now),
                },
            )

            _EOA(Address(contributor)).emit_transfer(value=u256(bond))

    # -----------------------------------------------------------------------
    # submit_delivery
    # -----------------------------------------------------------------------

    @gl.public.write
    def submit_delivery(
        self,
        seal_id: str,
        delivery_summary: str,
        evidence_urls: str,
        private_evidence_commitment_hash: str,
        self_assessed_completion_bps: u256,
        contributor_notes: str,
    ) -> str:
        raw = self.seals.get(seal_id, "")
        assert raw, "Seal not found"

        seal = _loads(raw, {})
        assert seal["status"] in ("accepted", "revision_requested"), f"Cannot submit delivery in status: {seal['status']}"

        contributor = str(gl.message.sender_address)
        assert contributor.lower() == seal["contributor"].lower(), "Only accepted contributor can submit delivery"
        assert delivery_summary.strip(), "delivery_summary must not be empty"

        urls = _loads(evidence_urls, [])
        assert isinstance(urls, list) and len(urls) > 0, "At least one evidence URL is required"
        assert 0 <= int(self_assessed_completion_bps) <= 10000, "self_assessed_completion_bps must be 0–10000"

        delivery_count = int(seal.get("delivery_count", "0")) + 1
        delivery_id = f"{seal_id}:{delivery_count}"
        now = _now()

        delivery = {
            "delivery_id": delivery_id,
            "seal_id": seal_id,
            "contributor": contributor,
            "delivery_summary": delivery_summary,
            "evidence_urls": urls,
            "private_evidence_commitment_hash": private_evidence_commitment_hash,
            "self_assessed_completion_bps": str(int(self_assessed_completion_bps)),
            "contributor_notes": contributor_notes,
            "submitted_at": str(now),
            "status": "submitted",
            "revision_number": str(delivery_count - 1),
        }

        self.deliveries[delivery_id] = _json(delivery)

        seal["delivery_count"] = str(delivery_count)
        seal["latest_delivery_id"] = delivery_id
        seal["status"] = "delivery_submitted"

        self.seals[seal_id] = _json(seal)

        self._log_activity(
            contributor,
            {
                "event": "delivery_submitted",
                "seal_id": seal_id,
                "delivery_id": delivery_id,
                "ts": str(now),
            },
        )

        return delivery_id

    # -----------------------------------------------------------------------
    # submit_revision
    # -----------------------------------------------------------------------

    @gl.public.write
    def submit_revision(
        self,
        seal_id: str,
        delivery_summary: str,
        evidence_urls: str,
        private_evidence_commitment_hash: str,
        self_assessed_completion_bps: u256,
        contributor_notes: str,
    ) -> str:
        raw = self.seals.get(seal_id, "")
        assert raw, "Seal not found"

        seal = _loads(raw, {})
        assert seal["status"] == "revision_requested", "Seal is not awaiting revision"

        contributor = str(gl.message.sender_address)
        assert contributor.lower() == seal["contributor"].lower(), "Only the contributor can submit revision"

        revision_limit = int(seal.get("revision_limit", "3"))
        revisions_used = int(seal.get("revisions_used", "0"))
        assert revisions_used < revision_limit, f"Revision limit reached ({revision_limit})"

        seal["revisions_used"] = str(revisions_used + 1)
        self.seals[seal_id] = _json(seal)

        urls = _loads(evidence_urls, [])
        assert isinstance(urls, list) and len(urls) > 0, "At least one evidence URL is required"
        assert 0 <= int(self_assessed_completion_bps) <= 10000, "self_assessed_completion_bps must be 0–10000"

        delivery_count = int(seal.get("delivery_count", "0")) + 1
        delivery_id = f"{seal_id}:{delivery_count}"
        now = _now()

        delivery = {
            "delivery_id": delivery_id,
            "seal_id": seal_id,
            "contributor": contributor,
            "delivery_summary": delivery_summary,
            "evidence_urls": urls,
            "private_evidence_commitment_hash": private_evidence_commitment_hash,
            "self_assessed_completion_bps": str(int(self_assessed_completion_bps)),
            "contributor_notes": contributor_notes,
            "submitted_at": str(now),
            "status": "submitted",
            "revision_number": str(delivery_count - 1),
        }

        self.deliveries[delivery_id] = _json(delivery)

        seal2 = _loads(self.seals.get(seal_id, ""), {})
        seal2["delivery_count"] = str(delivery_count)
        seal2["latest_delivery_id"] = delivery_id
        seal2["status"] = "delivery_submitted"

        self.seals[seal_id] = _json(seal2)

        self._log_activity(
            contributor,
            {
                "event": "revision_submitted",
                "seal_id": seal_id,
                "delivery_id": delivery_id,
                "revision": str(delivery_count - 1),
                "ts": str(now),
            },
        )

        return delivery_id

    # -----------------------------------------------------------------------
    # request_acceptance_verdict
    # -----------------------------------------------------------------------

    @gl.public.write
    def request_acceptance_verdict(self, seal_id: str, buyer_notes: str) -> None:
        raw = self.seals.get(seal_id, "")
        assert raw, "Seal not found"

        seal = _loads(raw, {})
        assert seal["status"] == "delivery_submitted", f"Cannot request verdict in status: {seal['status']}"

        caller = str(gl.message.sender_address)
        buyer = seal["buyer"]
        contributor = seal["contributor"]

        assert caller.lower() in (buyer.lower(), contributor.lower()), "Only buyer or contributor may request verdict"

        delivery_id = seal["latest_delivery_id"]
        assert delivery_id, "No delivery found on seal"

        delivery_raw = self.deliveries.get(delivery_id, "")
        assert delivery_raw, "Delivery record not found"

        delivery = _loads(delivery_raw, {})

        prior_verdict_text = ""
        if seal.get("latest_verdict_id"):
            pv_raw = self.verdicts.get(seal["latest_verdict_id"], "")
            if pv_raw:
                pv = _loads(pv_raw, {})
                prior_verdict_text = (
                    f"\nPRIOR VERDICT:\n"
                    f"Status: {pv.get('verdict_status', '')}\n"
                    f"Payment Action: {pv.get('payment_action', '')}\n"
                    f"Reason: {pv.get('short_reason', '')}\n"
                )

        evidence_list = "\n".join(f"  - {url}" for url in delivery.get("evidence_urls", []))

        seal["status"] = "under_review"
        self.seals[seal_id] = _json(seal)

        prompt_text = f"""You are a neutral GenLayer acceptance validator for Work Seal {seal_id}.

WORK SEAL TITLE: {seal["title"]}

DELIVERABLE DESCRIPTION:
{seal["deliverable_description"]}

ACCEPTANCE CRITERIA:
{seal["acceptance_criteria"]}

REQUIRED EVIDENCE:
{seal["required_evidence"]}

DEADLINE (unix timestamp): {seal["deadline"]}
ESCROW (wei): {seal["total_escrow"]}
BOND REQUIRED: {seal.get("bond_required", False)}
REVISION NUMBER: {delivery.get("revision_number", "0")}

DELIVERY SUMMARY:
{delivery["delivery_summary"]}

EVIDENCE URLS:
{evidence_list}

CONTRIBUTOR NOTES:
{delivery.get("contributor_notes", "")}

CONTRIBUTOR SELF-ASSESSED COMPLETION (bps out of 10000): {delivery.get("self_assessed_completion_bps", "10000")}

BUYER NOTES:
{buyer_notes}
{prior_verdict_text}

YOUR TASK:
Judge whether this delivery satisfies the acceptance criteria.
Return ONLY canonical JSON.

Return ONLY this exact JSON structure:
{{
  "verdict_status": "meets_criteria",
  "payment_action": "release_full",
  "payout_bps": 10000,
  "revision_required": false,
  "bond_action": "none",
  "confidence": 90,
  "short_reason": "All acceptance criteria met with complete evidence."
}}

verdict_status must be one of: {', '.join(ALLOWED_VERDICT_STATUS)}
payment_action must be one of: {', '.join(ALLOWED_PAYMENT_ACTION)}
bond_action must be one of: {', '.join(ALLOWED_BOND_ACTION)}
payout_bps must be integer 0–10000.
confidence must be integer 0–100."""

        task = (
            "Evaluate whether the submitted delivery satisfies the Work Seal acceptance criteria. "
            "Return a minimal canonical JSON verdict only."
        )

        criteria = (
            "The response must be valid JSON only with no prose. "
            f"verdict_status must be one of: {', '.join(ALLOWED_VERDICT_STATUS)}. "
            f"payment_action must be one of: {', '.join(ALLOWED_PAYMENT_ACTION)}. "
            f"bond_action must be one of: {', '.join(ALLOWED_BOND_ACTION)}. "
            "payout_bps must be an integer between 0 and 10000. "
            "confidence must be an integer between 0 and 100. "
            "No markdown, no explanation."
        )

        def nondet_verdict() -> str:
            return prompt_text

        try:
            result_raw = gl.eq_principle.prompt_non_comparative(
                nondet_verdict,
                task=task,
                criteria=criteria,
            )
        except Exception:
            seal2 = _loads(self.seals.get(seal_id, ""), {})
            seal2["status"] = "delivery_submitted"
            self.seals[seal_id] = _json(seal2)
            return

        raw_str = result_raw.strip() if isinstance(result_raw, str) else str(result_raw)
        backticks = "``" + "`"
        raw_str = raw_str.replace(backticks + "json", "").replace(backticks, "").strip()

        verdict_dict = _loads(raw_str, None)

        if not verdict_dict or not isinstance(verdict_dict, dict):
            seal2 = _loads(self.seals.get(seal_id, ""), {})
            seal2["status"] = "delivery_submitted"
            self.seals[seal_id] = _json(seal2)
            return

        verdict_status = str(verdict_dict.get("verdict_status", "")).lower()
        payment_action = str(verdict_dict.get("payment_action", "")).lower()
        bond_action = str(verdict_dict.get("bond_action", "none")).lower()

        if verdict_status not in ALLOWED_VERDICT_STATUS:
            seal2 = _loads(self.seals.get(seal_id, ""), {})
            seal2["status"] = "delivery_submitted"
            self.seals[seal_id] = _json(seal2)
            return

        if payment_action not in ALLOWED_PAYMENT_ACTION:
            seal2 = _loads(self.seals.get(seal_id, ""), {})
            seal2["status"] = "delivery_submitted"
            self.seals[seal_id] = _json(seal2)
            return

        if bond_action not in ALLOWED_BOND_ACTION:
            bond_action = "none"

        try:
            payout_bps = int(verdict_dict.get("payout_bps", 0))
        except Exception:
            payout_bps = 0

        payout_bps = max(0, min(10000, payout_bps))

        try:
            confidence = int(verdict_dict.get("confidence", 50))
        except Exception:
            confidence = 50

        confidence = max(0, min(100, confidence))

        revision_required = bool(verdict_dict.get("revision_required", False))
        short_reason = str(verdict_dict.get("short_reason", ""))[:500]

        now = _now()
        verdict_id = f"{seal_id}:{seal.get('delivery_count', '1')}"

        verdict_record = {
            "verdict_id": verdict_id,
            "seal_id": seal_id,
            "delivery_id": delivery_id,
            "verdict_status": verdict_status,
            "payment_action": payment_action,
            "payout_bps": str(payout_bps),
            "revision_required": revision_required,
            "bond_action": bond_action,
            "confidence": str(confidence),
            "short_reason": short_reason,
            "created_at": str(now),
        }

        self.verdicts[verdict_id] = _json(verdict_record)

        delivery["status"] = "under_review"
        self.deliveries[delivery_id] = _json(delivery)

        seal3 = _loads(self.seals.get(seal_id, ""), {})
        total_escrow = int(seal3["total_escrow"])

        payout_amount = 0
        refund_amount = 0
        new_status = "under_review"

        if payment_action == "release_full" or verdict_status in ("meets_criteria", "late_delivery_valid"):
            payout_amount = total_escrow
            refund_amount = 0
            new_status = "accepted_full"
            delivery["status"] = "accepted"

        elif payment_action == "release_partial" or verdict_status == "partially_meets_criteria":
            payout_amount = total_escrow * payout_bps // 10000
            refund_amount = total_escrow - payout_amount
            new_status = "accepted_partial"
            delivery["status"] = "partially_accepted"

        elif payment_action == "split_payment":
            payout_amount = total_escrow * payout_bps // 10000
            refund_amount = total_escrow - payout_amount
            new_status = "accepted_partial"
            delivery["status"] = "partially_accepted"

        elif payment_action == "request_revision" or revision_required:
            new_status = "revision_requested"
            delivery["status"] = "revision_needed"

        elif payment_action in ("refund_buyer", "slash_contributor_bond") or verdict_status in (
            "does_not_meet_criteria",
            "late_delivery_invalid",
            "fraudulent_submission",
        ):
            payout_amount = 0
            refund_amount = total_escrow
            new_status = "rejected"
            delivery["status"] = "rejected"

        elif payment_action == "hold_pending_evidence" or verdict_status in ("unverifiable", "evidence_insufficient"):
            new_status = "delivery_submitted"
            delivery["status"] = "submitted"

        else:
            new_status = "delivery_submitted"

        if verdict_status == "fraudulent_submission":
            bond_action = "slash_full"
        elif bond_action not in ALLOWED_BOND_ACTION:
            bond_action = "none"

        self.deliveries[delivery_id] = _json(delivery)

        seal3["latest_verdict_id"] = verdict_id
        seal3["status"] = new_status
        seal3["payout_amount"] = str(payout_amount)
        seal3["refund_amount"] = str(refund_amount)
        seal3["remaining_escrow"] = (
            "0"
            if new_status not in ("delivery_submitted", "revision_requested", "under_review")
            else str(total_escrow)
        )
        seal3["bond_action"] = bond_action

        self.seals[seal_id] = _json(seal3)

        self._log_activity(
            buyer,
            {
                "event": "verdict_issued",
                "seal_id": seal_id,
                "verdict": verdict_status,
                "payment_action": payment_action,
                "payout_amount": str(payout_amount),
                "ts": str(now),
            },
        )

    # -----------------------------------------------------------------------
    # resolve_delivery
    # -----------------------------------------------------------------------

    @gl.public.write
    def resolve_delivery(self, seal_id: str) -> None:
        raw = self.seals.get(seal_id, "")
        assert raw, "Seal not found"

        seal = _loads(raw, {})

        assert seal["status"] in ("accepted_full", "accepted_partial", "rejected"), (
            f"Seal is not in a resolvable status: {seal['status']}"
        )

    # -----------------------------------------------------------------------
    # claim_contributor_payout
    # -----------------------------------------------------------------------

    @gl.public.write
    def claim_contributor_payout(self, seal_id: str) -> None:
        raw = self.seals.get(seal_id, "")
        assert raw, "Seal not found"

        seal = _loads(raw, {})

        assert seal["status"] in ("accepted_full", "accepted_partial"), f"Payout not available in status: {seal['status']}"
        assert not seal.get("payout_claimed", False), "Payout already claimed"

        caller = str(gl.message.sender_address)
        assert caller.lower() == seal["contributor"].lower(), "Only the contributor can claim payout"

        payout = int(seal["payout_amount"])
        assert payout > 0, "No payout available"
        assert payout <= int(seal["total_escrow"]), "Payout exceeds escrow — contract invariant violated"

        now = _now()

        seal["payout_claimed"] = True
        self.seals[seal_id] = _json(seal)

        self._log_activity(
            caller,
            {
                "event": "payout_claimed",
                "seal_id": seal_id,
                "amount": str(payout),
                "ts": str(now),
            },
        )

        _EOA(Address(caller)).emit_transfer(value=u256(payout))

    # -----------------------------------------------------------------------
    # claim_buyer_refund
    # -----------------------------------------------------------------------

    @gl.public.write
    def claim_buyer_refund(self, seal_id: str) -> None:
        raw = self.seals.get(seal_id, "")
        assert raw, "Seal not found"

        seal = _loads(raw, {})

        assert seal["status"] in ("accepted_partial", "rejected"), f"Refund not available in status: {seal['status']}"
        assert not seal.get("refund_claimed", False), "Refund already claimed"

        caller = str(gl.message.sender_address)
        assert caller.lower() == seal["buyer"].lower(), "Only the buyer can claim refund"

        refund = int(seal["refund_amount"])
        assert refund > 0, "No refund available"

        now = _now()

        seal["refund_claimed"] = True
        self.seals[seal_id] = _json(seal)

        self._log_activity(
            caller,
            {
                "event": "refund_claimed",
                "seal_id": seal_id,
                "amount": str(refund),
                "ts": str(now),
            },
        )

        _EOA(Address(caller)).emit_transfer(value=u256(refund))

    # -----------------------------------------------------------------------
    # withdraw_contributor_bond
    # -----------------------------------------------------------------------

    @gl.public.write
    def withdraw_contributor_bond(self, seal_id: str) -> None:
        raw = self.seals.get(seal_id, "")
        assert raw, "Seal not found"

        seal = _loads(raw, {})

        caller = str(gl.message.sender_address)
        assert caller.lower() == seal["contributor"].lower(), "Only the contributor can withdraw bond"
        assert not seal.get("bond_claimed", False), "Bond already claimed or slashed"

        bond = int(seal.get("bond_locked", "0"))
        assert bond > 0, "No bond locked"

        bond_action = seal.get("bond_action", "none")

        if bond_action == "slash_full":
            buyer = seal["buyer"]
            now = _now()

            seal["bond_claimed"] = True
            self.seals[seal_id] = _json(seal)

            self._log_activity(
                caller,
                {
                    "event": "bond_slashed_full",
                    "seal_id": seal_id,
                    "amount": str(bond),
                    "ts": str(now),
                },
            )

            _EOA(Address(buyer)).emit_transfer(value=u256(bond))
            return

        if bond_action == "slash_partial":
            slash_amount = bond // 2
            return_amount = bond - slash_amount
            buyer = seal["buyer"]
            now = _now()

            seal["bond_claimed"] = True
            self.seals[seal_id] = _json(seal)

            self._log_activity(
                caller,
                {
                    "event": "bond_slashed_partial",
                    "seal_id": seal_id,
                    "slashed": str(slash_amount),
                    "returned": str(return_amount),
                    "ts": str(now),
                },
            )

            if slash_amount > 0:
                _EOA(Address(buyer)).emit_transfer(value=u256(slash_amount))

            if return_amount > 0:
                _EOA(Address(caller)).emit_transfer(value=u256(return_amount))

            return

        returnable_statuses = (
            "accepted_full",
            "accepted_partial",
            "rejected",
            "cancelled",
            "expired",
            "funded",
        )

        assert seal["status"] in returnable_statuses or bond_action == "return", (
            f"Bond not yet returnable in status: {seal['status']}"
        )

        now = _now()

        seal["bond_claimed"] = True
        self.seals[seal_id] = _json(seal)

        self._log_activity(
            caller,
            {
                "event": "bond_returned",
                "seal_id": seal_id,
                "amount": str(bond),
                "ts": str(now),
            },
        )

        _EOA(Address(caller)).emit_transfer(value=u256(bond))

    # -----------------------------------------------------------------------
    # Internal activity logger
    # -----------------------------------------------------------------------

    def _log_activity(self, address: str, event: dict) -> None:
        existing = _loads(self.wallet_activity.get(address, ""), [])
        existing.append(event)

        if len(existing) > 100:
            existing = existing[-100:]

        self.wallet_activity[address] = _json(existing)

    # -----------------------------------------------------------------------
    # View: get_seal
    # -----------------------------------------------------------------------

    @gl.public.view
    def get_seal(self, seal_id: str) -> str:
        raw = self.seals.get(seal_id, "")

        if not raw:
            return _json({"error": "not_found"})

        return raw

    # -----------------------------------------------------------------------
    # View: get_public_seals
    # -----------------------------------------------------------------------

    @gl.public.view
    def get_public_seals(self, offset: u256, limit: u256) -> str:
        result = []
        total = int(self.seal_count)

        start = int(offset)
        end = min(start + int(limit), total)

        for i in range(start, end):
            sid = self.seal_ids.get(str(i), "")
            if not sid:
                continue

            raw = self.seals.get(sid, "")
            if not raw:
                continue

            s = _loads(raw, {})

            if s.get("visibility_mode") != "public":
                continue

            result.append(
                {
                    "seal_id": s["seal_id"],
                    "title": s["title"],
                    "category": s["category"],
                    "buyer": s["buyer"],
                    "contributor": s.get("contributor", ""),
                    "total_escrow": s["total_escrow"],
                    "status": s["status"],
                    "deadline": s["deadline"],
                    "created_at": s["created_at"],
                    "latest_verdict_id": s.get("latest_verdict_id", ""),
                }
            )

        return _json({"seals": result, "total": total})

    # -----------------------------------------------------------------------
    # View: get_seal_detail_public
    # -----------------------------------------------------------------------

    @gl.public.view
    def get_seal_detail_public(self, seal_id: str) -> str:
        raw = self.seals.get(seal_id, "")

        if not raw:
            return _json({"error": "not_found"})

        s = _loads(raw, {})

        if s.get("visibility_mode") != "public":
            return _json(
                {
                    "seal_id": seal_id,
                    "title": s["title"],
                    "status": s["status"],
                    "visibility_mode": "private",
                }
            )

        return _json(
            {
                "seal_id": s["seal_id"],
                "title": s["title"],
                "category": s["category"],
                "buyer": s["buyer"],
                "contributor": s.get("contributor", ""),
                "deliverable_description": s["deliverable_description"],
                "acceptance_criteria": s["acceptance_criteria"],
                "required_evidence": s["required_evidence"],
                "total_escrow": s["total_escrow"],
                "bond_required": s.get("bond_required", False),
                "deadline": s["deadline"],
                "revision_limit": s.get("revision_limit", "3"),
                "visibility_mode": s.get("visibility_mode", "public"),
                "status": s["status"],
                "created_at": s["created_at"],
                "latest_delivery_id": s.get("latest_delivery_id", ""),
                "latest_verdict_id": s.get("latest_verdict_id", ""),
                "payout_amount": s.get("payout_amount", "0"),
                "payout_claimed": s.get("payout_claimed", False),
                "refund_amount": s.get("refund_amount", "0"),
            }
        )

    # -----------------------------------------------------------------------
    # View: get_seals_by_buyer
    # -----------------------------------------------------------------------

    @gl.public.view
    def get_seals_by_buyer(self, buyer: str) -> str:
        ids = _loads(self.buyer_seals.get(buyer, ""), [])
        result = []

        for sid in ids:
            raw = self.seals.get(sid, "")
            if raw:
                result.append(_loads(raw, {}))

        return _json(result)

    # -----------------------------------------------------------------------
    # View: get_seals_by_contributor
    # -----------------------------------------------------------------------

    @gl.public.view
    def get_seals_by_contributor(self, contributor: str) -> str:
        ids = _loads(self.contributor_seals.get(contributor, ""), [])
        result = []

        for sid in ids:
            raw = self.seals.get(sid, "")
            if raw:
                result.append(_loads(raw, {}))

        return _json(result)

    # -----------------------------------------------------------------------
    # View: get_delivery_packets
    # -----------------------------------------------------------------------

    @gl.public.view
    def get_delivery_packets(self, seal_id: str) -> str:
        raw = self.seals.get(seal_id, "")

        if not raw:
            return _json([])

        s = _loads(raw, {})
        count = int(s.get("delivery_count", "0"))
        result = []

        for i in range(1, count + 1):
            did = f"{seal_id}:{i}"
            d_raw = self.deliveries.get(did, "")
            if d_raw:
                result.append(_loads(d_raw, {}))

        return _json(result)

    # -----------------------------------------------------------------------
    # View: get_verdict
    # -----------------------------------------------------------------------

    @gl.public.view
    def get_verdict(self, verdict_id: str) -> str:
        raw = self.verdicts.get(verdict_id, "")

        if not raw:
            return _json({"error": "not_found"})

        return raw

    # -----------------------------------------------------------------------
    # View: get_wallet_activity
    # -----------------------------------------------------------------------

    @gl.public.view
    def get_wallet_activity(self, address: str) -> str:
        return self.wallet_activity.get(address, "[]")

    # -----------------------------------------------------------------------
    # View: get_admin_monitor_stats
    # -----------------------------------------------------------------------

    @gl.public.view
    def get_admin_monitor_stats(self) -> str:
        total = int(self.seal_count)

        funded = 0
        accepted = 0
        under_review = 0
        revision_requested = 0
        accepted_full = 0
        accepted_partial = 0
        rejected = 0
        cancelled = 0
        expired = 0
        total_escrowed = 0
        total_released = 0
        total_refunded = 0
        pending_verdicts = 0
        stuck_claims = 0

        for i in range(total):
            sid = self.seal_ids.get(str(i), "")
            if not sid:
                continue

            raw = self.seals.get(sid, "")
            if not raw:
                continue

            s = _loads(raw, {})
            status = s.get("status", "")
            escrow = int(s.get("total_escrow", "0"))
            payout = int(s.get("payout_amount", "0"))
            refund = int(s.get("refund_amount", "0"))

            total_escrowed += escrow

            if status == "funded":
                funded += 1

            elif status == "accepted":
                accepted += 1

            elif status == "under_review":
                under_review += 1
                pending_verdicts += 1

            elif status == "revision_requested":
                revision_requested += 1

            elif status == "accepted_full":
                accepted_full += 1
                total_released += payout

                if not s.get("payout_claimed", False):
                    stuck_claims += 1

            elif status == "accepted_partial":
                accepted_partial += 1
                total_released += payout
                total_refunded += refund

                if not s.get("payout_claimed", False):
                    stuck_claims += 1

                if not s.get("refund_claimed", False) and refund > 0:
                    stuck_claims += 1

            elif status == "rejected":
                rejected += 1
                total_refunded += refund

                if not s.get("refund_claimed", False) and refund > 0:
                    stuck_claims += 1

            elif status == "cancelled":
                cancelled += 1
                total_refunded += refund

            elif status == "expired":
                expired += 1
                total_refunded += refund

        return _json(
            {
                "total_seals": total,
                "funded": funded,
                "accepted": accepted,
                "under_review": under_review,
                "revision_requested": revision_requested,
                "accepted_full": accepted_full,
                "accepted_partial": accepted_partial,
                "rejected": rejected,
                "cancelled": cancelled,
                "expired": expired,
                "total_escrowed_wei": str(total_escrowed),
                "total_released_wei": str(total_released),
                "total_refunded_wei": str(total_refunded),
                "pending_verdicts": pending_verdicts,
                "stuck_claims": stuck_claims,
                "contract_version": "1.0.1",
            }
        )

    # -----------------------------------------------------------------------
    # View: get_seal_count
    # -----------------------------------------------------------------------

    @gl.public.view
    def get_seal_count(self) -> str:
        return str(int(self.seal_count))