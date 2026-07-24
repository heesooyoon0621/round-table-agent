import {
  PERSONAS,
  personaSystemPrompt,
  personaUserMessage,
  moderatorSystemPrompt,
  moderatorUserMessage,
  callFireworks,
} from "../../../lib/roundtable";

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
      const result = await callFireworks({
        system: personaSystemPrompt(personaId),
        user: personaUserMessage(personaId, question.trim()),
        temperature: 0.6,
      });
      const missing = PERSONA_REQUIRED.filter((k) => !(k in result));
      if (missing.length > 0 || !VERDICTS.includes(result.verdict)) {
        return Response.json(
          { error: "schema mismatch (missing: " + missing.join(", ") + ")" },
          { status: 502 }
        );
      }
      return Response.json({ result });
    }

    if (body.type === "moderator") {
      const { question, verdicts } = body;
      if (!Array.isArray(verdicts) || verdicts.length !== 4) {
        return Response.json({ error: "verdicts must contain 4 persona results" }, { status: 400 });
      }
      const result = await callFireworks({
        system: moderatorSystemPrompt(),
        user: moderatorUserMessage(question?.trim() ?? "", verdicts),
        temperature: 0.3,
      });
      const missing = MODERATOR_REQUIRED.filter((k) => !(k in result));
      if (missing.length > 0) {
        return Response.json(
          { error: "schema mismatch (missing: " + missing.join(", ") + ")" },
          { status: 502 }
        );
      }
      return Response.json({ result });
    }

    return Response.json({ error: "unknown request type" }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
