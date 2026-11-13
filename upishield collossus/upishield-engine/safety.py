
from datetime import datetime, timezone


# ==========================================
# MODULE 5: TRANSACTION SAFETY ENGINE
# ==========================================

VALID_STATUSES = {
    "CREATED",
    "PENDING",
    "APPROVED",
    "CAPTURED",
    "SUCCESS",
    "FAILED",
    "UNKNOWN"
}


def evaluate_transaction_safety(
    transaction_id,
    payment_status,
    response_received=True,
    duplicate_detected=False,
    provider_status=None
):
    """
    Evaluates whether a transaction is safe to complete,
    retry, or requires reconciliation.

    This module does NOT initiate payments or move money.
    """

    if not transaction_id:
        return {
            "success": False,
            "decision": "REJECT",
            "reason": "Missing transaction ID"
        }

    payment_status = (payment_status or "UNKNOWN").upper()

    if payment_status not in VALID_STATUSES:
        payment_status = "UNKNOWN"

    # 1. Duplicate payment protection
    if duplicate_detected:
        return {
            "success": True,
            "transaction_id": transaction_id,
            "decision": "BLOCK_DUPLICATE",
            "transaction_status": "UNKNOWN",
            "safe_to_retry": False,
            "human_review_required": True,
            "reason": "Duplicate transaction detected",
            "next_action": "DO_NOT_PROCESS_AGAIN"
        }

    # 2. Lost response protection
    if not response_received:
        return {
            "success": True,
            "transaction_id": transaction_id,
            "decision": "RECONCILE_WITH_PROVIDER",
            "transaction_status": "UNKNOWN",
            "safe_to_retry": False,
            "human_review_required": True,
            "reason": "Payment response was not received",
            "next_action": "CHECK_PROVIDER_STATUS"
        }

    # 3. Provider status reconciliation
    if provider_status:
        provider_status = provider_status.upper()

        if provider_status in ["COMPLETED", "CAPTURED"]:
            final_status = "SUCCESS"
            decision = "CONFIRM_SUCCESS"
            next_action = "UPDATE_TRANSACTION_AS_SUCCESS"

        elif provider_status in ["CREATED", "PENDING", "APPROVED"]:
            final_status = "PENDING"
            decision = "WAIT_FOR_CONFIRMATION"
            next_action = "CHECK_STATUS_AGAIN"

        elif provider_status in ["DENIED", "VOIDED", "FAILED"]:
            final_status = "FAILED"
            decision = "CONFIRM_FAILURE"
            next_action = "FOLLOW_BANK_FAILURE_POLICY"

        else:
            final_status = "UNKNOWN"
            decision = "MANUAL_REVIEW"
            next_action = "INVESTIGATE_TRANSACTION"

    else:
        # 4. Evaluate existing bank transaction status
        if payment_status in ["SUCCESS", "CAPTURED"]:
            final_status = "SUCCESS"
            decision = "CONFIRM_SUCCESS"
            next_action = "NO_FURTHER_PAYMENT_ACTION"

        elif payment_status in ["CREATED", "PENDING", "APPROVED"]:
            final_status = "PENDING"
            decision = "WAIT_FOR_CONFIRMATION"
            next_action = "CHECK_STATUS_AGAIN"

        elif payment_status == "FAILED":
            final_status = "FAILED"
            decision = "CONFIRM_FAILURE"
            next_action = "FOLLOW_BANK_FAILURE_POLICY"

        else:
            final_status = "UNKNOWN"
            decision = "MANUAL_REVIEW"
            next_action = "INVESTIGATE_TRANSACTION"

    return {
        "success": True,
        "transaction_id": transaction_id,
        "decision": decision,
        "transaction_status": final_status,
        "safe_to_retry": False,
        "human_review_required": final_status != "SUCCESS",
        "reason": "Transaction safety evaluation completed",
        "next_action": next_action,
        "evaluated_at": datetime.now(timezone.utc).isoformat()
    }
