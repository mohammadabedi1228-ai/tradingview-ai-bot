import os
import hmac
import hashlib
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.6-luna")


def valid_signature(raw_body: bytes) -> bool:
    """Optional HMAC protection for TradingView webhook requests."""
    if not WEBHOOK_SECRET:
        return True

    supplied = request.headers.get("X-Webhook-Signature", "")
    expected = hmac.new(
        WEBHOOK_SECRET.encode("utf-8"),
        raw_body,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(supplied, expected)


def ask_ai(payload: dict) -> str:
    """Analyze a TradingView alert without placing trades."""
    if not OPENAI_API_KEY:
        return "AI analysis is disabled: OPENAI_API_KEY is not configured."

    prompt = f"""
You are a market-analysis assistant.
Analyze the following TradingView alert data.

Important:
- Do not claim certainty or guaranteed profit.
- Do not place or execute trades.
- Give educational analysis only.
- Identify trend, momentum, support/resistance if supplied, and key risks.
- If the data is insufficient, say so clearly.

TradingView alert:
{payload}
"""

    response = requests.post(
        "https://api.openai.com/v1/responses",
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": OPENAI_MODEL,
            "input": prompt,
        },
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()

    # Responses API commonly returns the final text in output_text.
    if data.get("output_text"):
        return data["output_text"]

    # Fallback parser for response items.
    parts = []
    for item in data.get("output", []):
        for content in item.get("content", []):
            if content.get("type") == "output_text":
                parts.append(content.get("text", ""))
    return "\n".join(parts) or "No AI text was returned."


@app.get("/")
def home():
    return jsonify({
        "service": "tradingview-ai-bot",
        "status": "ok",
        "message": "TradingView AI webhook is running."
    })


@app.get("/health")
def health():
    return jsonify({"status": "healthy"})


@app.post("/webhook")
def webhook():
    raw = request.get_data()

    if not valid_signature(raw):
        return jsonify({"error": "Invalid webhook signature"}), 401

    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    try:
        analysis = ask_ai(payload)
        return jsonify({
            "ok": True,
            "analysis": analysis
        })
    except requests.HTTPError as exc:
        detail = exc.response.text[:1000] if exc.response is not None else str(exc)
        return jsonify({"ok": False, "error": "AI API request failed", "detail": detail}), 502
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", "10000"))
    app.run(host="0.0.0.0", port=port)
