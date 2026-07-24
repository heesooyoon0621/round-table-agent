import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import OpenAI from "openai";

// Plain-language system prompt — injected server-side so it applies no matter
// which internal path (chat completions or responses API) the adapter uses.
const PLAIN_LANGUAGE_SYSTEM = `
You are a warm, patient financial explainer on "The Round Table".
Write in warm, simple English that a 70-year-old with zero finance knowledge
can fully understand. Rules:
(a) NO jargon — never use P/E, valuation, margin, market cap, FCF, DCA,
    diversification, or similar terms without translating them into everyday
    words; say "the price tag compared to what the company actually earns"
    instead of P/E.
(b) Every percentage MUST be translated into real money using $10,000 as the
    baseline: never "-39%" alone, always "if you put in $10,000, it could
    shrink to about $6,100".
(c) Use at most ONE everyday-life analogy per answer (shop, weather,
    festival, neighborhood).
(d) Short sentences. One idea per sentence. No bullet-point walls; talk like
    a kind neighbor, not an analyst report.
(e) Kind, respectful, never condescending.
When comparing with a savings account, assume roughly 4% per year and say the
number in dollars (e.g., "$10,000 becomes about $10,400 in a year, guaranteed").
Never tell anyone to buy or sell; the decision always belongs to them and
their family. If the question involves borrowed money, betting everything,
retirement savings at risk, or "guaranteed" high returns, gently warn them —
guaranteed high monthly returns are almost always a scam.
`.trim();

// Fireworks AI is OpenAI-compatible; we only change the baseURL.
// The custom fetch injects the system prompt into every model request.
const injectSystemPrompt = async (url, init = {}) => {
  try {
    if (init.body && typeof init.body === "string") {
      const body = JSON.parse(init.body);
      const target = String(url);
      if (target.includes("/responses")) {
        body.instructions = PLAIN_LANGUAGE_SYSTEM;
        init = { ...init, body: JSON.stringify(body) };
      } else if (target.includes("/chat/completions") && Array.isArray(body.messages)) {
        if (!body.messages.some((m) => m.role === "system")) {
          body.messages = [{ role: "system", content: PLAIN_LANGUAGE_SYSTEM }, ...body.messages];
        }
        init = { ...init, body: JSON.stringify(body) };
      }
    }
  } catch {
    // If the body isn't JSON, pass it through untouched.
  }
  return fetch(url, init);
};

const openai = new OpenAI({
  apiKey: process.env.FIREWORKS_API_KEY,
  baseURL: "https://api.fireworks.ai/inference/v1",
  fetch: injectSystemPrompt,
});

const serviceAdapter = new OpenAIAdapter({
  openai,
  model: "accounts/fireworks/models/kimi-k2p6",
  keepSystemRole: true,
});

const runtime = new CopilotRuntime();

export const POST = async (req) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
