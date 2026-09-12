# tradingview-ai-bot

A small Flask + Docker service for receiving TradingView webhook alerts and sending the alert data to an AI model for educational market analysis.

## What it does

- `GET /` — service status
- `GET /health` — health check
- `POST /webhook` — receives a TradingView JSON alert
- Optional HMAC webhook protection
- Optional OpenAI Responses API analysis
- Does **not** execute trades

## Render deployment

Use:
- Runtime: Docker
- Branch: `main`
- Root Directory: blank
- Dockerfile Path: `.`
- Health Check Path: `/health`

Environment variables:
- `OPENAI_API_KEY` = your API key
- `WEBHOOK_SECRET` = optional secret
- `OPENAI_MODEL` = `gpt-5.6-luna`

Never put API keys directly into the source code.

## Example TradingView alert body

```json
{
  "symbol": "{{ticker}}",
  "price": "{{close}}",
  "time": "{{time}}",
  "exchange": "{{exchange}}",
  "volume": "{{volume}}"
}
```

## Example request

```bash
curl -X POST https://YOUR-RENDER-URL/webhook \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDT","price":"65000","time":"2026-01-01T12:00:00Z"}'
```

This project is an analysis prototype, not a guaranteed-profit trading system.
