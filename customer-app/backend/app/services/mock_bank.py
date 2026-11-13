"""
ISOLATED MOCK BANK. Used only when USE_MOCK_BANK=true.
Nothing here is a real transaction. State is in memory and resets on server restart.

Demo triggers: start the payment description with
  [fail]     -> Bank declines the payment (FAILED)
  [slow]     -> stays PROCESSING for ~8 seconds, then SUCCESS
  [timeout]  -> Bank DOES process it, but the reply is lost; status lookup finds
                nothing for ~10 seconds (balance drops first!), then SUCCESS
  [lost]     -> request never reaches the Bank; reply lost; status stays unknown
"""
import secrets
import time
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException


class MockTimeout(Exception):
    pass


_USERS = {
    "CUST1001": {"password": "demo123", "name": "Aarav Mehta", "account": "XXXXXX4821"},
    "CUST1002": {"password": "demo123", "name": "Diya Nair", "account": "XXXXXX7390"},
}
_BALANCES = {"CUST1001": 5_000_000, "CUST1002": 2_500_000}  # paise
_TOKENS = {}   # token -> customer_id
_TXNS = {}     # transaction_id -> dict
_BY_KEY = {}   # (sender_id, idempotency_key) -> transaction_id


def _iso(dt) -> str:
    return dt.isoformat(timespec="seconds")


def _new_txn(sender, recipient, paise, desc, key, created=None):
    t = {
        "transaction_id": "TXN" + uuid.uuid4().hex[:8].upper(),
        "sender_id": sender,
        "recipient_id": recipient,
        "amount_paise": paise,
        "description": desc,
        "status": "PROCESSING",
        "failure_reason": None,
        "created_at": _iso(created or datetime.now(timezone.utc)),
        "idempotency_key": key,
        "visible_after": 0.0,
        "complete_at": None,
    }
    _TXNS[t["transaction_id"]] = t
    if key:
        _BY_KEY[(sender, key)] = t["transaction_id"]
    return t


def _seed():
    now = datetime.now(timezone.utc)
    for sender, recipient, paise, desc, days in [
        ("CUST1002", "CUST1001", 150000, "Dinner split", 3),
        ("CUST1001", "CUST1002", 50000, "Book money", 2),
        ("CUST1002", "CUST1001", 200000, "Rent share", 1),
    ]:
        _new_txn(sender, recipient, paise, desc, None, now - timedelta(days=days))["status"] = "SUCCESS"


_seed()


def _apply(t):
    if _BALANCES[t["sender_id"]] < t["amount_paise"]:
        t["status"], t["failure_reason"] = "FAILED", "Insufficient balance"
        return
    _BALANCES[t["sender_id"]] -= t["amount_paise"]
    _BALANCES[t["recipient_id"]] += t["amount_paise"]
    t["status"] = "SUCCESS"


def _settle_pending():
    now = time.time()
    for t in _TXNS.values():
        if t["status"] == "PROCESSING" and t["complete_at"] and now >= t["complete_at"]:
            _apply(t)


def _customer(token: str) -> str:
    customer_id = _TOKENS.get(token)
    if not customer_id:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    return customer_id


def _public(t) -> dict:
    return {
        "transaction_id": t["transaction_id"],
        "sender_id": t["sender_id"],
        "recipient_id": t["recipient_id"],
        "amount": t["amount_paise"] / 100,
        "description": t["description"],
        "status": t["status"],
        "failure_reason": t["failure_reason"],
        "created_at": t["created_at"],
        "idempotency_key": t["idempotency_key"],
    }


def login(customer_id: str, password: str) -> dict:
    user = _USERS.get(customer_id)
    if not user or user["password"] != password:
        raise HTTPException(status_code=401, detail="Invalid customer ID or password.")
    token = secrets.token_urlsafe(32)
    _TOKENS[token] = customer_id
    return {"access_token": token, "token_type": "bearer", "is_mock": True}


def get_profile(token: str) -> dict:
    customer_id = _customer(token)
    user = _USERS[customer_id]
    return {
        "customer_id": customer_id,
        "name": user["name"],
        "masked_account_number": user["account"],
        "is_mock": True,
    }


def get_balance(token: str) -> dict:
    me = _customer(token)
    _settle_pending()
    return {"balance": _BALANCES[me] / 100}


def list_transactions(token: str, limit: int) -> list:
    me = _customer(token)
    _settle_pending()
    now = time.time()
    rows = []
    for t in _TXNS.values():
        if me not in (t["sender_id"], t["recipient_id"]) or now < t["visible_after"]:
            continue
        debit = t["sender_id"] == me
        p = _public(t)
        p["direction"] = "DEBIT" if debit else "CREDIT"
        p["counterparty_id"] = t["recipient_id"] if debit else t["sender_id"]
        rows.append(p)
    rows.sort(key=lambda r: r["created_at"], reverse=True)
    return rows[:limit]


def submit_payment(token, key, recipient_id, amount_paise, description) -> dict:
    sender = _customer(token)

    existing = _BY_KEY.get((sender, key))
    if existing:  # the Bank honours idempotency: same key returns the original result
        _settle_pending()
        return {**_public(_TXNS[existing]), "duplicate": True}

    desc = (description or "").lower()
    if desc.startswith("[lost]"):
        raise MockTimeout()  # never recorded: the Bank never saw it

    t = _new_txn(sender, recipient_id, amount_paise, description, key)
    if recipient_id not in _USERS:
        t["status"], t["failure_reason"] = "FAILED", "Recipient account not found"
    elif _BALANCES[sender] < amount_paise:
        t["status"], t["failure_reason"] = "FAILED", "Insufficient balance"
    elif desc.startswith("[fail]"):
        t["status"], t["failure_reason"] = "FAILED", "Declined by the bank"
    elif desc.startswith("[slow]"):
        t["complete_at"] = time.time() + 8
    else:
        _apply(t)

    if desc.startswith("[timeout]") and t["status"] == "SUCCESS":
        t["visible_after"] = time.time() + 10
        raise MockTimeout()  # processed, but the reply never arrived

    return _public(t)


def get_payment_status(token: str, key: str) -> dict:
    sender = _customer(token)
    _settle_pending()
    tid = _BY_KEY.get((sender, key))
    t = _TXNS.get(tid) if tid else None
    if not t or time.time() < t["visible_after"]:
        return {"found": False}
    return {"found": True, **_public(t)}