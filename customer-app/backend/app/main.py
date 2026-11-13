from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import config
from app.database import init_db
from app.routers import account, auth, payments

init_db()

app = FastAPI(title="UPIShield Customer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_ORIGIN],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(account.router)
app.include_router(payments.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "bank_mode": "mock" if config.USE_MOCK_BANK else "real"}