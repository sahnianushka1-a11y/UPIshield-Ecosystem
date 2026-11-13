"""
Single reusable gateway to the Bank backend.

Real endpoints are NOT invented. Fill BANK_ENDPOINTS and the request/response mapping
only after the Bank developer confirms the contract.
"""
import logging

import httpx
from fastapi import HTTPException

from app import config
from app.services import mock_bank

logger = logging.getLogger("customer_app.bank")

# TODO: fill from the agreed Bank API contract. None = not yet agreed.
BANK_ENDPOINTS = {
    "login": None,
    "profile": None,
    "balance": None,
    "transactions": None,
    "submit_payment": None,
    "payment_status": None,  # must support lookup by idempotency key and/or transaction ID
}


class BankTimeout(Exception):
    """The Bank did not answer in time. The payment outcome is UNKNOWN, never FAILED."""


class RealBankClient:
    def __init__(self):
        self._http = httpx.AsyncClient(
            base_url=config.BANK_API_URL, timeout=config.BANK_TIMEOUT_SECONDS
        )

    def _require(self, name: str):
        if not BANK_ENDPOINTS.get(name):
            raise HTTPException(
                status_code=501,
                detail=f"Bank endpoint '{name}' is not configured yet (contract pending).",
            )
        raise NotImplementedError(f"Map request/response fields for '{name}' from the contract.")

    async def login(self, customer_id: str, password: str) -> dict:
        self._require("login")

    async def get_profile(self, token: str) -> dict:
        self._require("profile")

    async def get_balance(self, token: str) -> dict:
        self._require("balance")

    async def list_transactions(self, token: str, limit: int) -> list:
        self._require("transactions")

    async def submit_payment(self, token, key, recipient_id, amount_paise, description) -> dict:
        self._require("submit_payment")

    async def get_payment_status(self, token: str, key: str) -> dict:
        self._require("payment_status")


class MockBankClient:
    async def login(self, customer_id: str, password: str) -> dict:
        return mock_bank.login(customer_id, password)

    async def get_profile(self, token: str) -> dict:
        return mock_bank.get_profile(token)

    async def get_balance(self, token: str) -> dict:
        return mock_bank.get_balance(token)

    async def list_transactions(self, token: str, limit: int) -> list:
        return mock_bank.list_transactions(token, limit)

    async def submit_payment(self, token, key, recipient_id, amount_paise, description) -> dict:
        try:
            return mock_bank.submit_payment(token, key, recipient_id, amount_paise, description)
        except mock_bank.MockTimeout:
            raise BankTimeout()

    async def get_payment_status(self, token: str, key: str) -> dict:
        return mock_bank.get_payment_status(token, key)


bank = MockBankClient() if config.USE_MOCK_BANK else RealBankClient()