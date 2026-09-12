export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return new Response("TradingView AI Bot is online.", {
        headers: { "content-type": "text/plain; charset=UTF-8" },
      });
    }

    if (request.method !== "POST" || url.pathname !== "/webhook") {
      return new Response("Not found", { status: 404 });
    }

    let alert;

    try {
      alert = await request.json();
    } catch {
      return Response.json(
        { ok: false, error: "Invalid JSON" },
        { status: 400 }
      );
    }

    ctx.waitUntil(analyzeAlert(alert, env));

    return Response.json({
      ok: true,
      received: true
    });
  },
};

async function analyzeAlert(alert, env) {
  if (!env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not configured.");
    return;
  }

  const prompt = `You are a market-analysis assistant for educational purposes.

Analyze this TradingView alert data:

${JSON.stringify(alert, null, 2)}

Give a concise analysis with:

1. Market/symbol context if available
2. Directional bias (bullish, bearish, or neutral)
3. Key reasons based only on the supplied data
4. Important risk/invalidation level if supplied
5. A short educational conclusion

Do not claim certainty and do not present the response as financial advice.`;

  try {
    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-5.6",
          input: prompt,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "OpenAI API error:",
        JSON.stringify(data)
      );
      return;
    }

    console.log(
      "AI ANALYSIS:",
      data.output_text || JSON.stringify(data)
    );

  } catch (error) {
    console.error(
      "AI request failed:",
      error
    );
  }
}
