# UPIShield Engine

The simulated UPIShield engine owns its in-memory dependency graph. It polls
persisted Banker integration events and never writes to the Banker database.

## Run

```powershell
cd "C:\Users\aksha\OneDrive\Desktop\Colossus\UPIshield-Ecosystem\upishield collossus\upishield-engine"
python -m pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8003
```

The engine starts a historical replay from Banker and exposes:

- `GET /integration/status`
- `POST /integration/poll`
- `POST /integration/replay`

The persistent synchronization cursor is stored in
`integration/sync_state.json`. A Banker failure or recovery is processed only
when its event is retrieved from `http://localhost:8001/events/after`.

The engine automatically polls Banker every three seconds by default. Change
the interval with `BANKER_POLL_INTERVAL_SECONDS`. The UPIShield local
simulation endpoints remain available for isolated demonstrations, but are
labelled `LOCAL_SIMULATION` and are kept separate from Banker-originated
events.
