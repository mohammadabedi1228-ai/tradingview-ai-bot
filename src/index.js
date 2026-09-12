export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return new Response("Trading Signal Bot is online.", {
        headers: {
          "content-type": "text/plain; charset=UTF-8",
        },
      });
    }

    if (request.method === "GET" && url.pathname === "/signal") {
      const result = await getSignal();
      return Response.json(result);
    }

    return new Response("Not found", { status: 404 });
  },
};

async function getSignal() {
  try {
    const response = await fetch(
      "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=5m&limit=100"
    );
    if (!response.ok) {
  const errorText = await response.text();

  return {
    ok: false,
    error: "Binance API error",
    status: response.status,
    details: errorText,
  };
    }


    const candles = await response.json();

    const closes = candles.map(c => Number(c[4]));

    const price = closes[closes.length - 1];

    const ema20 = EMA(closes, 20);
    const ema50 = EMA(closes, 50);
    const rsi = RSI(closes, 14);

    let score = 0;

    if (ema20 > ema50) score += 1;
    if (ema20 < ema50) score -= 1;

    if (rsi >= 50 && rsi <= 70) score += 1;
    if (rsi < 30) score += 1;
    if (rsi > 70) score -= 1;

    let signal = "WAIT";

    if (score >= 2) {
      signal = "BUY";
    } else if (score <= -2) {
      signal = "SELL";
    }

    return {
      ok: true,
      symbol: "BTCUSDT",
      price,
      ema20,
      ema50,
      rsi,
      score,
      signal,
      timeframe: "5m",
    };

  } catch (error) {
    return {
      ok: false,
      error: error.message,
    };
  }
}

function EMA(values, period) {
  const multiplier = 2 / (period + 1);

  let ema = values.slice(0, period)
    .reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
  }

  return Number(ema.toFixed(2));
}

function RSI(values, period) {
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];

    if (change >= 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];

    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;

  return Number((100 - 100 / (1 + rs)).toFixed(2));
}
