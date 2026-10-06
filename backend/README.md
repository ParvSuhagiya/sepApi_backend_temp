# EarnRadar Backend (Step 1: Foundation)

FastAPI service returning ranked, scam-checked ways to earn money in India.

## Layout

- `app/main.py` — FastAPI app (`GET /api/health`)
- `app/config.py` — settings via `pydantic-settings`
- `app/errors.py` — typed `AppError` hierarchy
- `app/observability.py` — logging with request-id + secret redaction

## Quickstart

```bash
cd backend
pip install -r requirements.txt
pytest
SERPAPI_KEY=dummy ANTHROPIC_API_KEY=dummy uvicorn app.main:app --reload
```
