"""
Single reusable gateway to the Bank backend.

The Banker backend exposes a customer-facing contract under /customer-api.
"""
import logging

import httpx
from fastapi import HTTPException

from app import config
from app.services import mock_bank

logger = logging.getLogger("customer_app.bank")

BANK_ENDPOINTS = {
    "login": "/customer-api/login",
    "profile": "/customer-api/profile",
    "balance": "/customer-api/balance",
    "transactions": "/customer-api/transactions",
    "submit_payment": "/customer-api/payments",
    "payment_status": "/customer-api/payments/{key}",
}


class BankTimeout(Exception):
    """The Bank did not answer in time. The payment outcome is UNKNOWN, never FAILED."""


class RealBankClient:
    def __init__(self):
        self._http = httpx.AsyncClient(
            base_url=config.BANK_API_URL, timeout=config.BANK_TIMEOUT_SECONDS
        )

    def _require(self, name: str):
        endpoint = BANK_ENDPOINTS.get(name)
        if not endpoint:
            raise HTTPException(status_code=501, detail=f"Bank endpoint '{name}' is not configured.")
        return endpoint

    async def _request(self, method: str, endpoint: str, token: str | None = None, **kwargs):
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        try:
            response = await self._http.request(method, endpoint, headers=headers, **kwargs)
        except httpx.TimeoutException as exc:
            raise BankTimeout() from exc
        if response.status_code >= 400:
            detail = response.json().get("detail", "Bank request failed")
            raise HTTPException(response.status_code, detail)
        return response.json()

    async def login(self, customer_id: str, password: str) -> dict:
        return await self._request(
            "POST", self._require("login"),
            json={"customer_id": customer_id, "password": password},
        )

    async def get_profile(self, token: str) -> dict:
        return await self._request("GET", self._require("profile"), token)

    async def get_balance(self, token: str) -> dict:
        return await self._request("GET", self._require("balance"), token)

    async def list_transactions(self, token: str, limit: int) -> list:
        return (await self._request("GET", self._require("transactions"), token))[:limit]

    async def submit_payment(self, token, key, recipient_id, amount_paise, description) -> dict:
        result = await self._request(
            "POST", self._require("submit_payment"), token,
            json={"idempotency_key": key, "recipient_id": recipient_id,
                  "amount_paise": amount_paise, "description": description},
        )
        return {
            "transaction_id": result["transaction_id"],
            "status": result["status"],
            "failure_reason": result.get("failure_reason"),
            "duplicate": result.get("duplicate", False),
        }

    async def get_payment_status(self, token: str, key: str) -> dict:
        return await self._request(
            "GET", self._require("payment_status").format(key=key), token
        )


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