# Banker Backend

FastAPI and SQLite backend for the Banker application. This is a simulated
administration API; it does not authenticate against a real bank or process
real payments.

## Endpoints

- `GET /health`
- `POST /auth/login` with `{ "email": "admin@bank.com", "password": "admin123" }`
- `GET /customers/?search=&status=`
- `POST /customers/` with `name`, `email`, `phone`, and `initial_deposit`
- `GET /customers/{customer_id}`
- `PATCH /customers/{customer_id}` with `{ "status": "ACTIVE" }` or `INACTIVE`
- `GET /transactions/?status=&search=`
- `GET /transactions/{transaction_id}`
- `GET /dashboard/summary`
- `GET /infrastructure/`
- `GET /failures/`
- `GET /failures/status`
- `POST /failures/inject`
- `POST /failures/{failure_id}/recover`
- `GET /events/`

Failure and recovery events are persisted locally for future UPIShield
delivery. They are not delivered to UPIShield by this application yet.

## Run

```powershell
cd C:\Users\aksha\OneDrive\Desktop\Colossus\UPIshield-Ecosystem\banker-app\backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8001
```
