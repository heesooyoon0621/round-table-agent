import fs from "fs";
import path from "path";

// persona_prompts.md is the single source of truth for all prompts.
const md = fs.readFileSync(path.join(process.cwd(), "persona_prompts.md"), "utf8");
const tsla = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "tsla_demo_data.json"), "utf8")
);

export const ROUNDTABLE_MODEL = "accounts/fireworks/models/glm-5p2";

export const PERSONAS = {
  oracle: { name: "The Oracle", emoji: "🦉", header: "## 1. THE ORACLE", calcKey: "oracle_inputs" },
  moonshot: { name: "Moonshot", emoji: "🚀", header: "## 2. MOONSHOT", calcKey: "moonshot_inputs" },
  diamond_hands: { name: "Diamond Hands", emoji: "💎", header: "## 3. DIAMOND HANDS", calcKey: "diamond_hands_inputs" },
  cassandra: { name: "Cassandra", emoji: "🌧️", header: "## 4. CASSANDRA", calcKey: "cassandra_inputs" },
};

function sectionBlock(header) {
  const start = md.indexOf(header);
  if (start < 0) throw new Error("persona_prompts.md section not found: " + header);
  const fenceStart = md.indexOf("```", start);
  const fenceEnd = md.indexOf("```", fenceStart + 3);
  return md.slice(fenceStart + 3, fenceEnd).trim();
}

const SHARED_CORE = sectionBlock("## 0. SHARED CORE");
const MODERATOR_PROMPT = sectionBlock("## 5. THE MODERATOR");

export function personaSystemPrompt(personaId) {
  return SHARED_CORE + "\n\n" + sectionBlock(PERSONAS[personaId].header);
}

// Section 6 template: question + ticker + this persona's CALC_RESULTS block.
export function personaUserMessage(personaId, question) {
  const calc = tsla[PERSONAS[personaId].calcKey];
  return `[QUESTION]\n${question}\n\n[TICKER] ${tsla._meta.ticker}\n\n[CALC_RESULTS]\n${JSON.stringify(calc, null, 2)}`;
}

export function moderatorSystemPrompt() {
  return MODERATOR_PROMPT;
}

export function moderatorUserMessage(question, verdicts) {
  return [
    `[QUESTION]\n${question}`,
    `[TICKER] ${tsla._meta.ticker}`,
    `[PANEL_VERDICTS]\n${JSON.stringify(verdicts, null, 2)}`,
    `[MODERATOR_INPUTS]\n${JSON.stringify(tsla.moderator_inputs, null, 2)}`,
  ].join("\n\n");
}

// Defensive JSON parsing: strip think-blocks and code fences, then take the
// outermost object. Reasoning models sometimes wrap or preface their JSON.
export function cleanParseJSON(text) {
  let t = String(text ?? "");
  t = t.replace(/<think>[\s\S]*?<\/think>/g, "");
  t = t.replace(/```(?:json)?/g, "");
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("no JSON object in model output");
  return JSON.parse(t.slice(a, b + 1));
}

export async function callFireworks({ system, user, maxTokens = 4096, temperature = 0.6 }) {
  const r = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.FIREWORKS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ROUNDTABLE_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens,
      temperature,
      response_format: { type: "json_object" },
    }),
  });
  const j = await r.json();
  if (!r.ok) {
    throw new Error(`Fireworks ${r.status}: ${j?.error?.message ?? JSON.stringify(j).slice(0, 200)}`);
  }
  return cleanParseJSON(j.choices[0].message.content);
}
