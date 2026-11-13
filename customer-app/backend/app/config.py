import os
from dotenv import load_dotenv

load_dotenv()

BANK_API_URL = os.getenv("BANK_API_URL", "http://localhost:8000")
USE_MOCK_BANK = os.getenv("USE_MOCK_BANK", "true").lower() == "true"
BANK_TIMEOUT_SECONDS = float(os.getenv("BANK_TIMEOUT_SECONDS", "10"))
CUSTOMER_PORT = int(os.getenv("CUSTOMER_PORT", "8001"))
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
DB_PATH = os.getenv("DB_PATH", "customer_app.db")