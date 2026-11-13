import logging
import sqlite3
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException

from app import config
from app.database import get_conn
from app.services.bank_client import BankTimeout, bank

logger = logging.getLogger("customer_app.payments")

TERMINAL = {"SUCCESS", "FAILED"}
KNOWN = {"SUCCESS", "FAILED", "PROCESSING"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _normalize(bank_status) -> str:
    """Anything we don't recognise is UNKNOWN, never FAILED."""
    s = str(bank_status or "").upper()
    return s if s in KNOWN else "UNKNOWN"


def _message(status: str, duplicate: bool, reason: Optional[str]):
    if duplicate:
        return (
            "DUPLICATE_DETECTED",
            f"This payment was already received. Current status: {status}. "
            "No second payment was made.",
        )
    if status == "SUCCESS":
        return "PAYMENT_SUCCESSFUL", "Payment successful."
    if status == "PROCESSING":
        return (
            "PAYMENT_PENDING",
            "Your payment is being processed. Please check back shortly. Do not pay again.",
        )
    if status == "UNKNOWN":
        return (
            "CONFIRMATION_NOT_RECEIVED",
            "We did not receive confirmation from the bank. Your payment may or may not "
            "have gone through. Please do not pay again. Use 'Check status' to confirm.",
        )
    return "PAYMENT_FAILED", "Payment failed." + (f" Reason: {reason}." if reason else "")


def _out(row, duplicate: bool = False) -> dict:
    code, text = _message(row["status"], duplicate, row["failure_reason"])
    return {
        "idempotency_key": row["idempotency_key"],
        "recipient_id": row["recipient_id"],
        "amount": row["amount_paise"] / 100,
        "description": row["description"],
        "status": row["status"],
        "transaction_id": row["bank_transaction_id"],
        "message_code": code,
        "message": text,
        "duplicate_detected": duplicate,
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "is_mock": config.USE_MOCK_BANK,
    }


def _fetch(key: str):
    with get_conn() as conn:
        return conn.execute(
            "SELECT * FROM payment_requests WHERE idempotency_key = ?", (key,)
        ).fetchone()


def _update(key, status, txn_id=None, reason=None):
    with get_conn() as conn:
        conn.execute(
            "UPDATE payment_requests SET status = ?, "
            "bank_transaction_id = COALESCE(?, bank_transaction_id), "
            "failure_reason = ?, updated_at = ? WHERE idempotency_key = ?",
            (status, txn_id, reason, _now(), key),
        )


def _delete(key):
    with get_conn() as conn:
        conn.execute("DELETE FROM payment_requests WHERE idempotency_key = ?", (key,))


async def _refresh_row(token: str, customer_id: str, key: str):
    """Ask the Bank for the status of an existing request. Never creates a payment."""
    row = _fetch(key)
    if row is None or row["customer_id"] != customer_id:
        raise HTTPException(404, "No payment request found for this reference.")
    if row["status"] in TERMINAL:
        return row
    try:
        result = await bank.get_payment_status(token, key)
    except BankTimeout:
        return row
    except HTTPException:
        raise
    except Exception as exc:  # log the type only, never details that may hold tokens
        logger.warning("Status lookup failed: %s", type(exc).__name__)
        return row
    if result.get("found"):
        _update(
            key,
            _normalize(result.get("status")),
            result.get("transaction_id"),
            result.get("failure_reason"),
        )
        row = _fetch(key)
    # Not found: leave the status as is. Missing at the Bank is NOT proof of failure.
    return row


async def refresh_status(token: str, customer_id: str, key: str) -> dict:
    return _out(await _refresh_row(token, customer_id, key))


async def _handle_duplicate(token, customer_id, req, amount_paise) -> dict:
    row = _fetch(req.idempotency_key)
    if (
        row["customer_id"] != customer_id
        or row["recipient_id"] != req.recipient_id
        or row["amount_paise"] != amount_paise
        or row["description"] != req.description
    ):
        raise HTTPException(
            409, "This request reference was already used for a different payment."
        )
    if row["status"] not in TERMINAL:
        row = await _refresh_row(token, customer_id, req.idempotency_key)
    return _out(row, duplicate=True)


async def create_payment(token: str, customer_id: str, req) -> dict:
    if req.recipient_id == customer_id:
        raise HTTPException(422, "You cannot send money to your own account.")

    amount_paise = int(req.amount * 100)
    key = req.idempotency_key
    now = _now()

    # The PRIMARY KEY makes this insert atomic: only one request per key can win.
    try:
        with get_conn() as conn:
            conn.execute(
                "INSERT INTO payment_requests (idempotency_key, customer_id, recipient_id, "
                "amount_paise, description, status, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, ?, 'PROCESSING', ?, ?)",
                (key, customer_id, req.recipient_id, amount_paise, req.description, now, now),
            )
    except sqlite3.IntegrityError:
        return await _handle_duplicate(token, customer_id, req, amount_paise)

    try:
        result = await bank.submit_payment(
            token, key, req.recipient_id, amount_paise, req.description
        )
    except HTTPException:
        # Bank refused or the integration isn't configured: nothing was processed.
        _delete(key)
        raise
    except BankTimeout:
        return await _unknown(token, customer_id, key)
    except Exception as exc:
        logger.warning("Bank submit failed: %s", type(exc).__name__)
        return await _unknown(token, customer_id, key)

    _update(
        key,
        _normalize(result.get("status")),
        result.get("transaction_id"),
        result.get("failure_reason"),
    )
    return _out(_fetch(key), duplicate=bool(result.get("duplicate")))


async def _unknown(token, customer_id, key) -> dict:
    """Timeout/network trouble: keep the SAME key, mark UNKNOWN, query status. Never resubmit."""
    _update(key, "UNKNOWN")
    return _out(await _refresh_row(token, customer_id, key))


def list_payments(customer_id: str, limit: int = 20) -> list:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM payment_requests WHERE customer_id = ? "
            "ORDER BY created_at DESC, rowid DESC LIMIT ?",
            (customer_id, limit),
        ).fetchall()
    return [_out(r) for r in rows]
