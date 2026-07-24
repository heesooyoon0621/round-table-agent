import {
  PERSONAS,
  personaSystemPrompt,
  personaUserMessage,
  moderatorSystemPrompt,
  moderatorUserMessage,
  callFireworks,
  ROUNDTABLE_MODEL,
} from "../../../lib/roundtable";
import { runCalc } from "../../../lib/calc";
import { getRootSpan, startChildSpan, finishRoot } from "../../../lib/trace";
import {
  classifierSystemPrompt,
  followupSystemPrompt,
  followupUserMessage,
} from "../../../lib/followup";
import { buildScenarioRawInput, scenarioLabel } from "../../../lib/scenario";

function validScenarioPct(pct) {
  return typeof pct === "number" && isFinite(pct) && pct >= -90 && pct <= 300 && pct !== 0;
}

const PERSONA_REQUIRED = [
  "persona", "verdict", "confidence", "headline_plain", "analogy_plain",
  "reason_plain", "money_translation_plain", "technical_basis",
  "flip_condition_plain", "one_liner_debate_plain",
];
const MODERATOR_REQUIRED = [
  "final_call_plain", "confidence_label_plain", "scoreboard",
  "money_scenario_plain", "savings_comparison_plain",
  "revisit_trigger_plain", "safety_note_plain", "share_card_plain",
];
const VERDICTS = ["YES", "NO", "YES_SMALL"];

export async function POST(req) {
  try {
    const body = await req.json();

    if (body.type === "persona") {
      const { personaId, question } = body;
      if (!PERSONAS[personaId]) {
        return Response.json({ error: "unknown persona: " + personaId }, { status: 400 });
      }
      if (!question?.trim()) {
        return Response.json({ error: "question is required" }, { status: 400 });
      }
      const root = await getRootSpan(body.questionId, question.trim());
      const personaSpan = startChildSpan(root?.exported, {
        name: "persona:" + personaId,
        input: question.trim(),
      });

      const scenarioActive = validScenarioPct(body.scenarioPct);
      const rawOverride = scenarioActive ? buildScenarioRawInput(body.scenarioPct) : undefined;
      const effectiveQuestion = scenarioActive
        ? `${scenarioLabel(body.scenarioPct)} (hypothetical — all numbers recomputed at the new price). User asked: ${question.trim()}`
        : question.trim();

      const calcSpan = startChildSpan(root && (await personaSpan?.export()), {
        name: "calc:" + personaId,
        type: "tool",
        input: { personaId, script: "calcs/" + personaId + "_calc.py", scenarioPct: scenarioActive ? body.scenarioPct : undefined },
      });
      const { calc, source: calcSource } = await runCalc(personaId, rawOverride);
      calcSpan?.log({ output: calc, metadata: { source: calcSource } });
      calcSpan?.end();

      const llmSpan = startChildSpan(root && (await personaSpan?.export()), {
        name: "llm:" + personaId,
        type: "llm",
        input: question.trim(),
        metadata: { model: ROUNDTABLE_MODEL },
      });
      const result = await callFireworks({
        system: personaSystemPrompt(personaId),
        user: personaUserMessage(personaId, effectiveQuestion, calc),
        temperature: 0.6,
      });
      llmSpan?.log({ output: result });
      llmSpan?.end();
      personaSpan?.log({ output: result });
      personaSpan?.end();
      const missing = PERSONA_REQUIRED.filter((k) => !(k in result));
      if (missing.length > 0 || !VERDICTS.includes(result.verdict)) {
        return Response.json(
          { error: "schema mismatch (missing: " + missing.join(", ") + ")" },
          { status: 502 }
        );
      }
      return Response.json({ result, calc, calcSource });
    }

    if (body.type === "moderator") {
      const { question, verdicts } = body;
      if (!Array.isArray(verdicts) || verdicts.length !== 4) {
        return Response.json({ error: "verdicts must contain 4 persona results" }, { status: 400 });
      }
      const modScenario = validScenarioPct(body.scenarioPct);
      const modQuestion = modScenario
        ? `${scenarioLabel(body.scenarioPct)} (hypothetical — the panel verdicts below were produced at the new price). User asked: ${question?.trim() ?? ""}`
        : (question?.trim() ?? "");
      const root = await getRootSpan(body.questionId, modQuestion);
      const modSpan = startChildSpan(root?.exported, {
        name: "moderator",
        type: "llm",
        input: { question: modQuestion, verdicts },
        metadata: { model: ROUNDTABLE_MODEL },
      });
      const result = await callFireworks({
        system: moderatorSystemPrompt(),
        user: moderatorUserMessage(modQuestion, verdicts),
        temperature: 0.3,
      });
      modSpan?.log({ output: result });
      modSpan?.end();
      await finishRoot(body.questionId, result);
      const missing = MODERATOR_REQUIRED.filter((k) => !(k in result));
      if (missing.length > 0) {
        return Response.json(
          { error: "schema mismatch (missing: " + missing.join(", ") + ")" },
          { status: 502 }
        );
      }
      return Response.json({ result });
    }

    if (body.type === "classify") {
      const { question, hasVerdict } = body;
      if (!question?.trim()) {
        return Response.json({ error: "question is required" }, { status: 400 });
      }
      const result = await callFireworks({
        system: classifierSystemPrompt(!!hasVerdict),
        user: question.trim(),
        temperature: 0,
        maxTokens: 1024,
      });
      const route = ["new_verdict", "followup_explain", "followup_scenario", "out_of_scope"].includes(result.route)
        ? result.route
        : "new_verdict";
      const pct = Number(result.price_change_pct);
      if (route === "followup_scenario" && !validScenarioPct(pct)) {
        // unparseable scenario -> safest is an explanatory answer
        return Response.json({ result: { route: "followup_explain" } });
      }
      return Response.json({
        result: route === "followup_scenario"
          ? { route, priceChangePct: pct, label: scenarioLabel(pct) }
          : { route },
      });
    }

    if (body.type === "followup") {
      const { question, context } = body;
      if (!question?.trim()) {
        return Response.json({ error: "question is required" }, { status: 400 });
      }
      const result = await callFireworks({
        system: followupSystemPrompt(),
        user: followupUserMessage(question.trim(), context),
        temperature: 0.4,
      });
      if (typeof result.reply_plain !== "string" || !result.reply_plain.trim()) {
        return Response.json({ error: "schema mismatch (missing reply_plain)" }, { status: 502 });
      }
      return Response.json({ result: { reply_plain: result.reply_plain } });
    }

    return Response.json({ error: "unknown request type" }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
