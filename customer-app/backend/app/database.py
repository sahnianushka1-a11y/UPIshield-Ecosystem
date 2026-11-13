import sqlite3
from contextlib import contextmanager

from app import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS payment_requests (
    idempotency_key TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    amount_paise INTEGER NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL,
    bank_transaction_id TEXT,
    failure_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payment_customer
    ON payment_requests(customer_id, created_at);

-- Used in the refund phase. Tracking only; the Bank executes refunds.
CREATE TABLE IF NOT EXISTS refund_requests (
    refund_id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    transaction_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
"""


@contextmanager
def get_conn():
    conn = sqlite3.connect(config.DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with get_conn() as conn:
        conn.executescript(SCHEMA)
