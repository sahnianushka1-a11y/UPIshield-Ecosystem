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
- `GET /events/after?cursor_timestamp=&cursor_event_id=&limit=500`

Failure and recovery events are persisted locally for UPIShield polling. The
incremental endpoint uses a stable timestamp and event-ID composite cursor.
Recovery events include `related_event_id`, identifying the original failure
event.

## Run

```powershell
cd C:\Users\aksha\OneDrive\Desktop\Colossus\UPIshield-Ecosystem\banker-app\backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8001
```
