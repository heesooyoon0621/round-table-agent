"use client";

import { useEffect, useRef, useState } from "react";

const PERSONAS = [
  { id: "oracle", name: "Warren Buffett", shortName: "Buffett", emoji: "🦉", tagline: "Buys great businesses at fair prices — and waits" },
  { id: "moonshot", name: "Cathie Wood", shortName: "Wood", emoji: "🚀", tagline: "Bets big on the future, loves a dip" },
  { id: "diamond_hands", name: "Roaring Kitty", shortName: "Roaring Kitty", emoji: "💎", tagline: "Does his homework, sides with the little guy" },
  { id: "cassandra", name: "Michael Burry", shortName: "Burry", emoji: "🌧️", tagline: "Asks what could go wrong — before anyone else" },
];

const EXAMPLE_QUESTIONS = [
  "Tesla keeps dropping — is it okay to buy now?",
  "Stocks or savings account — which is better for me?",
  "Someone told me about a fund that guarantees 10% a month. Real?",
];

const VERDICT_STYLE = {
  YES: { label: "YES", bg: "#dcfce7", fg: "#166534", border: "#86efac" },
  NO: { label: "NO", bg: "#fee2e2", fg: "#991b1b", border: "#fca5a5" },
  YES_SMALL: { label: "YES, SMALL", bg: "#fef9c3", fg: "#854d0e", border: "#fde047" },
};

function normalizeVerdict(verdict) {
  const v = String(verdict ?? "").toUpperCase();
  if (v.includes("SMALL")) return "YES_SMALL";
  if (v.includes("NO")) return "NO";
  if (v.includes("YES")) return "YES";
  return verdict;
}

function VerdictBadge({ verdict, size = 13 }) {
  const s = VERDICT_STYLE[normalizeVerdict(verdict)] ?? { label: verdict, bg: "#f3f4f6", fg: "#374151", border: "#d1d5db" };
  return (
    <span style={{
      background: s.bg, color: s.fg, border: `1px solid ${s.border}`,
      borderRadius: "999px", padding: "3px 10px", fontSize: size, fontWeight: 700,
      whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
}

function LoadingLine() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setPhase(1), 7000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ color: "#6b7280", fontSize: "13px" }} className="rt-pulse">
      {phase === 0 ? "🧮 Running the numbers in a live sandbox…" : "💭 Thinking hard about your question…"}
    </div>
  );
}

const CALC_SOURCE_LABEL = {
  "daytona-sandbox": "🧮 Numbers computed live in a Daytona sandbox",
  "local-fallback": "🖥️ Numbers computed on the server (sandbox fallback)",
  "static-demo-data": "📦 Numbers from cached demo data",
};

function PersonaCard({ meta, state, onRetry }) {
  const base = {
    border: "1px solid #e5e7eb", borderRadius: "14px", padding: "16px",
    background: "#fff", display: "flex", flexDirection: "column", gap: "10px",
    minHeight: "120px",
  };

  return (
    <div style={base}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "22px" }}>{meta.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "15px" }}>{meta.name}</div>
          <div style={{ fontSize: "11px", color: "#9ca3af" }}>{meta.tagline}</div>
        </div>
        {state?.status === "done" && <VerdictBadge verdict={state.data.verdict} />}
      </div>

      {(!state || state.status === "idle") && (
        <div style={{ color: "#9ca3af", fontSize: "13px" }}>Waiting for a question…</div>
      )}

      {state?.status === "loading" && (
        <>
          <LoadingLine />
          <div className="rt-skel" style={{ width: "85%" }} />
          <div className="rt-skel" style={{ width: "70%" }} />
          <div className="rt-skel" style={{ width: "55%" }} />
        </>
      )}

      {state?.status === "error" && (
        <div style={{ fontSize: "13px" }}>
          <div style={{ color: "#991b1b", marginBottom: "8px" }}>
            Couldn&apos;t get an answer ({state.error})
          </div>
          {onRetry && (
            <button onClick={onRetry} style={{
              padding: "6px 14px", borderRadius: "8px", border: "1px solid #d1d5db",
              background: "#f9fafb", cursor: "pointer", fontSize: "13px", fontWeight: 600,
            }}>
              ↻ Try again
            </button>
          )}
        </div>
      )}

      {state?.status === "done" && (
        <>
          <div style={{ fontSize: "16px", fontWeight: 600, lineHeight: 1.45 }}>
            {state.data.headline_plain}
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>
            Confidence: {state.data.confidence}/100
          </div>
          {state.calcSource && (
            <div style={{ fontSize: "11px", color: "#9ca3af" }}>
              {CALC_SOURCE_LABEL[state.calcSource] ?? state.calcSource}
            </div>
          )}
          <details>
            <summary style={{ cursor: "pointer", fontSize: "13px", color: "#2563eb", fontWeight: 600 }}>
              Hear the full story
            </summary>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px", fontSize: "14px", lineHeight: 1.55 }}>
              <p><b>🪞 Picture it:</b> {state.data.analogy_plain}</p>
              <p><b>💬 Why:</b> {state.data.reason_plain}</p>
              <p><b>💵 Your $10,000:</b> {state.data.money_translation_plain}</p>
              <p><b>🔄 I&apos;d change my mind if:</b> {state.data.flip_condition_plain}</p>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

function ModeratorPanel({ mod, onRetry }) {
  if (mod.status === "idle") return null;

  if (mod.status === "loading") {
    return (
      <div style={{ border: "2px solid #e5e7eb", borderRadius: "16px", padding: "24px", textAlign: "center", color: "#6b7280" }} className="rt-pulse">
        🎙️ The Moderator is listening to all four and writing the family verdict…
      </div>
    );
  }

  if (mod.status === "error") {
    return (
      <div style={{ border: "2px solid #fca5a5", borderRadius: "16px", padding: "24px", textAlign: "center" }}>
        <div style={{ color: "#991b1b", marginBottom: "10px" }}>The Moderator hit a snag ({mod.error})</div>
        {onRetry && (
          <button onClick={onRetry} style={{ padding: "8px 18px", borderRadius: "8px", border: "1px solid #d1d5db", background: "#f9fafb", cursor: "pointer", fontWeight: 600 }}>
            ↻ Ask the Moderator again
          </button>
        )}
      </div>
    );
  }

  const d = mod.data;
  const box = { border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px", fontSize: "14px", lineHeight: 1.55 };
  return (
    <div style={{ border: "2px solid #111827", borderRadius: "16px", padding: "24px", background: "#fff", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ fontSize: "12px", letterSpacing: "0.1em", color: "#6b7280", fontWeight: 700 }}>
        🎙️ THE ROUND TABLE&apos;S FAMILY VERDICT
      </div>
      <div style={{ fontSize: "32px", fontWeight: 800, lineHeight: 1.25, letterSpacing: "-0.01em" }}>{d.final_call_plain}</div>
      <div>
        <span style={{
          background: d.confidence_label_plain === "High confidence" ? "#dcfce7" : "#fef9c3",
          color: d.confidence_label_plain === "High confidence" ? "#166534" : "#854d0e",
          borderRadius: "999px", padding: "4px 12px", fontSize: "12px", fontWeight: 700,
        }}>
          {d.confidence_label_plain}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        {(d.scoreboard ?? []).map((row, i) => {
          const meta = PERSONAS.find((p) =>
            String(row.persona ?? "").toLowerCase().replace(/[^a-z]/g, "").includes(p.id.replace("_", ""))
          ) ?? PERSONAS[i];
          return (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: "8px", fontSize: "13px", lineHeight: 1.4 }}>
              <span style={{ whiteSpace: "nowrap", fontWeight: 700, minWidth: "110px" }}>{meta?.emoji} {meta?.shortName ?? row.persona}</span>
              <VerdictBadge verdict={row.verdict} size={10} />
              <span style={{ color: "#4b5563" }}>{row.headline_plain}</span>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "10px" }}>
        <div style={{ ...box, background: "#fff7ed" }}>
          <b>📈 If you put in $10,000…</b><br />{d.money_scenario_plain}
        </div>
        <div style={{ ...box, background: "#f0fdf4" }}>
          <b>🏦 The safe alternative</b><br />{d.savings_comparison_plain}
        </div>
      </div>

      <div style={box}><b>⏰ When to ask us again:</b> {d.revisit_trigger_plain}</div>
      <div style={{ ...box, background: "#fefce8" }}><b>🤝 One more thing:</b> {d.safety_note_plain}</div>

      <details>
        <summary style={{ cursor: "pointer", fontSize: "13px", color: "#2563eb", fontWeight: 600 }}>
          📱 Message to share with your family
        </summary>
        <div style={{ ...box, marginTop: "10px", whiteSpace: "pre-wrap", background: "#f9fafb" }}>{d.share_card_plain}</div>
      </details>
      <ShareButton text={d.share_card_plain} />
    </div>
  );
}

// Compact scenario diff: one line per persona ("old -> new" verdicts),
// flips highlighted; the full cards live behind an expand toggle.
function ScenarioBlock({ sc, baseline }) {
  if (!sc) return null;
  return (
    <div style={{ border: "2px dashed #9ca3af", borderRadius: "16px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "8px", background: "#fcfcfd" }}>
      <div style={{ fontWeight: 800, fontSize: "15px" }}>{sc.label}</div>

      {PERSONAS.map((p) => {
        const st = sc.cards[p.id];
        const oldV = baseline?.[p.id];
        const newV = st?.status === "done" ? st.data.verdict : null;
        const flipped = oldV && newV && normalizeVerdict(oldV) !== normalizeVerdict(newV);
        return (
          <div
            key={p.id}
            style={{
              display: "flex", alignItems: "center", gap: "8px", fontSize: "13px",
              padding: "4px 8px", borderRadius: "8px", minWidth: 0,
              background: flipped ? "#fef3c7" : "transparent",
              border: flipped ? "1px solid #fcd34d" : "1px solid transparent",
            }}
          >
            <span style={{ whiteSpace: "nowrap", fontWeight: 700 }}>{p.emoji} {p.shortName}:</span>
            {oldV && <VerdictBadge verdict={oldV} size={10} />}
            <span style={{ color: "#9ca3af" }}>→</span>
            {st?.status === "error" ? (
              <span style={{ color: "#991b1b" }}>failed</span>
            ) : newV ? (
              <VerdictBadge verdict={newV} size={10} />
            ) : (
              <span className="rt-pulse" style={{ color: "#9ca3af" }}>…</span>
            )}
            {flipped && <span title="verdict flipped">✨</span>}
            {newV && (
              <span style={{ flex: 1, minWidth: 0, color: "#4b5563", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                — {st.data.headline_plain}
              </span>
            )}
          </div>
        );
      })}

      {sc.mod?.status === "done" && (
        <div style={{ fontSize: "13px", fontWeight: 700, marginTop: "2px" }}>
          🎙️ {sc.mod.data.final_call_plain}
        </div>
      )}
      {sc.mod?.status === "loading" && (
        <div className="rt-pulse" style={{ fontSize: "12px", color: "#6b7280" }}>🎙️ Writing the scenario verdict…</div>
      )}
      {sc.mod?.status === "error" && (
        <div style={{ fontSize: "12px", color: "#991b1b" }}>🎙️ Scenario verdict failed ({sc.mod.error})</div>
      )}

      <details>
        <summary style={{ cursor: "pointer", fontSize: "12px", color: "#2563eb", fontWeight: 600 }}>
          Show the full scenario cards
        </summary>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "10px" }}>
          <div className="rt-grid">
            {PERSONAS.map((p) => (
              <PersonaCard key={p.id} meta={p} state={sc.cards[p.id]} onRetry={null} />
            ))}
          </div>
          <ModeratorPanel mod={sc.mod} onRetry={null} />
        </div>
      </details>
    </div>
  );
}

function ShareButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable (e.g. insecure context) — leave the button as-is
    }
  };
  return (
    <button
      onClick={copy}
      style={{
        alignSelf: "flex-start", padding: "10px 18px", borderRadius: "10px",
        border: "none", background: copied ? "#16a34a" : "#111827", color: "#fff",
        fontWeight: 700, fontSize: "14px", cursor: "pointer",
      }}
    >
      {copied ? "✅ Copied!" : "📋 Share with family"}
    </button>
  );
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState(null);
  const [cards, setCards] = useState({});
  const [mod, setMod] = useState({ status: "idle" });
  const [chat, setChat] = useState([]);
  const [scenarios, setScenarios] = useState({});
  const [chatBusy, setChatBusy] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const modSigRef = useRef(null);
  const questionIdRef = useRef(null);

  const askPersona = async (personaId, q) => {
    setCards((c) => ({ ...c, [personaId]: { status: "loading" } }));
    try {
      const r = await fetch("/api/roundtable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "persona", personaId, question: q, questionId: questionIdRef.current }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "HTTP " + r.status);
      setCards((c) => ({ ...c, [personaId]: { status: "done", data: j.result, calc: j.calc, calcSource: j.calcSource } }));
    } catch (e) {
      setCards((c) => ({ ...c, [personaId]: { status: "error", error: e.message } }));
    }
  };

  // The frozen core flow: full round table (4 personas + moderator).
  const startRoundTable = (trimmed) => {
    setAsked(trimmed);
    setQuestion(trimmed);
    setMod({ status: "idle" });
    setChat([]);
    modSigRef.current = null;
    questionIdRef.current = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random());
    PERSONAS.forEach((p) => askPersona(p.id, trimmed));
  };

  const buildFollowupContext = () => ({
    originalQuestion: asked,
    personas: Object.fromEntries(PERSONAS.map((p) => [p.id, cards[p.id]?.data ?? null])),
    calc: Object.fromEntries(PERSONAS.map((p) => [p.id, cards[p.id]?.calc ?? null])),
    moderator: mod.data ?? null,
  });

  const askFollowup = async (trimmed) => {
    setQuestion("");
    setChat((c) => [...c, { role: "user", text: trimmed }]);
    setChatBusy(true);
    try {
      const r = await fetch("/api/roundtable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "followup", question: trimmed, context: buildFollowupContext() }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "HTTP " + r.status);
      setChat((c) => [...c, { role: "table", text: j.result.reply_plain }]);
    } catch (e) {
      setChat((c) => [...c, { role: "table", text: "Sorry — I hit a snag answering that (" + e.message + "). Please try again." }]);
    } finally {
      setChatBusy(false);
    }
  };

  const updateScenario = (id, fn) => setScenarios((s) => ({ ...s, [id]: fn(s[id]) }));

  // Scenario follow-up: re-convene the table on modified inputs (price ±pct%).
  const runScenario = async (trimmed, pct, label) => {
    const id = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random());
    const qid = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random());
    setQuestion("");
    setChat((c) => [...c, { role: "user", text: trimmed }, { role: "scenario", id }]);
    setScenarios((s) => ({
      ...s,
      [id]: {
        label,
        cards: Object.fromEntries(PERSONAS.map((p) => [p.id, { status: "loading" }])),
        mod: { status: "idle" },
      },
    }));
    setChatBusy(true);
    try {
      const results = await Promise.all(PERSONAS.map(async (p) => {
        try {
          const r = await fetch("/api/roundtable", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "persona", personaId: p.id, question: trimmed, questionId: qid, scenarioPct: pct }),
          });
          const j = await r.json();
          if (!r.ok) throw new Error(j.error ?? "HTTP " + r.status);
          updateScenario(id, (sc) => ({ ...sc, cards: { ...sc.cards, [p.id]: { status: "done", data: j.result, calc: j.calc, calcSource: j.calcSource } } }));
          return j.result;
        } catch (e) {
          updateScenario(id, (sc) => ({ ...sc, cards: { ...sc.cards, [p.id]: { status: "error", error: e.message } } }));
          return null;
        }
      }));
      const four = results.filter(Boolean);
      if (four.length === 4) {
        updateScenario(id, (sc) => ({ ...sc, mod: { status: "loading" } }));
        try {
          const r = await fetch("/api/roundtable", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "moderator", question: trimmed, verdicts: four, questionId: qid, scenarioPct: pct }),
          });
          const j = await r.json();
          if (!r.ok) throw new Error(j.error ?? "HTTP " + r.status);
          updateScenario(id, (sc) => ({ ...sc, mod: { status: "done", data: j.result } }));
        } catch (e) {
          updateScenario(id, (sc) => ({ ...sc, mod: { status: "error", error: e.message } }));
        }
      } else {
        updateScenario(id, (sc) => ({ ...sc, mod: { status: "error", error: "some panelists failed — please ask the scenario again" } }));
      }
    } finally {
      setChatBusy(false);
    }
  };

  const ask = async (q) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const hasVerdict = mod.status === "done";
    // Classify first; on any failure fall back to the proven full pipeline.
    let route = "new_verdict";
    let scenarioPct = null;
    let scenarioLbl = null;
    setClassifying(true);
    try {
      const r = await fetch("/api/roundtable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "classify", question: trimmed, hasVerdict }),
      });
      const j = await r.json();
      if (r.ok && j.result?.route) {
        route = j.result.route;
        scenarioPct = j.result.priceChangePct ?? null;
        scenarioLbl = j.result.label ?? null;
      }
    } catch {
      // fall through to new_verdict
    } finally {
      setClassifying(false);
    }
    if (route.startsWith("followup") && !hasVerdict) route = "new_verdict";
    if (route === "followup_scenario" && (scenarioPct == null || !scenarioLbl)) route = "followup_explain";
    console.info("[roundtable route]", route, scenarioPct ?? "", "—", trimmed);
    if (route === "new_verdict") return startRoundTable(trimmed);
    if (route === "followup_scenario") return runScenario(trimmed, scenarioPct, scenarioLbl);
    return askFollowup(trimmed); // followup_explain + out_of_scope (scope honesty lives in the prompt)
  };

  const verdictSummaryLine = () => {
    const counts = {};
    PERSONAS.forEach((p) => {
      const v = cards[p.id]?.data?.verdict;
      if (v) counts[v] = (counts[v] ?? 0) + 1;
    });
    const tally = ["NO", "YES_SMALL", "YES"]
      .filter((v) => counts[v])
      .map((v) => `${counts[v]} ${v === "YES_SMALL" ? "YES,SMALL" : v}`)
      .join(" / ");
    return `${mod.data?.final_call_plain ?? ""} — ${tally}`;
  };

  const runModerator = async (verdicts, sig) => {
    setMod({ status: "loading" });
    try {
      const r = await fetch("/api/roundtable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "moderator", question: asked, verdicts, questionId: questionIdRef.current }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "HTTP " + r.status);
      setMod({ status: "done", data: j.result, sig });
    } catch (e) {
      setMod({ status: "error", error: e.message, sig });
    }
  };

  useEffect(() => {
    if (!asked) return;
    const done = PERSONAS.every((p) => cards[p.id]?.status === "done");
    if (!done) return;
    const verdicts = PERSONAS.map((p) => cards[p.id].data);
    const sig = JSON.stringify(verdicts.map((v) => v.persona + v.verdict + v.confidence));
    if (modSigRef.current === sig) return;
    modSigRef.current = sig;
    runModerator(verdicts, sig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, asked]);

  const busy = PERSONAS.some((p) => cards[p.id]?.status === "loading") || mod.status === "loading" || chatBusy || classifying;

  return (
    <main style={{ maxWidth: "980px", margin: "0 auto", padding: "24px 20px 60px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <style>{`
        .rt-pulse { animation: rtpulse 1.4s ease-in-out infinite; }
        @keyframes rtpulse { 0%,100% {opacity:.45} 50% {opacity:1} }
        .rt-skel { height: 12px; border-radius: 6px; background: #e5e7eb; animation: rtpulse 1.4s ease-in-out infinite; }
        .rt-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (min-width: 640px) { .rt-grid { grid-template-columns: 1fr 1fr; } }
      `}</style>

      <header>
        <h1 style={{ fontSize: "26px" }}>🏛️ The Round Table</h1>
        <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>
          Four legendary investors debate your question — then explain it like a kind neighbor. No question is too basic.
        </p>
      </header>

      <div style={{ display: "flex", gap: "8px" }}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !busy && ask(question)}
          placeholder={mod.status === "done" ? "Ask a follow-up — or start a new question" : "Ask anything — no dumb questions"}
          style={{ flex: 1, padding: "12px 16px", borderRadius: "12px", border: "1px solid #d1d5db", fontSize: "15px", outline: "none" }}
        />
        <button
          onClick={() => ask(question)}
          disabled={busy || !question.trim()}
          style={{
            padding: "12px 22px", borderRadius: "12px", border: "none",
            background: busy || !question.trim() ? "#e5e7eb" : "#111827",
            color: busy || !question.trim() ? "#9ca3af" : "#fff",
            fontWeight: 700, fontSize: "15px", cursor: busy || !question.trim() ? "default" : "pointer",
          }}
        >
          {classifying ? "Reading…" : busy ? "Debating…" : "Ask the table"}
        </button>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {EXAMPLE_QUESTIONS.map((q) => (
          <button key={q} onClick={() => !busy && ask(q)} style={{
            padding: "8px 14px", borderRadius: "999px", border: "1px solid #d1d5db",
            background: "#f9fafb", fontSize: "13px", cursor: busy ? "default" : "pointer", textAlign: "left",
          }}>
            {q}
          </button>
        ))}
      </div>

      {chat.length === 0 ? (
        <>
          {asked && (
            <div style={{ fontSize: "14px", color: "#374151" }}>
              You asked: <b>&ldquo;{asked}&rdquo;</b>
            </div>
          )}

          <div className="rt-grid">
            {PERSONAS.map((p) => (
              <PersonaCard key={p.id} meta={p} state={cards[p.id]} onRetry={() => askPersona(p.id, asked)} />
            ))}
          </div>

          <ModeratorPanel
            mod={mod}
            onRetry={() => {
              const verdicts = PERSONAS.map((p) => cards[p.id]?.data).filter(Boolean);
              if (verdicts.length === 4) runModerator(verdicts, modSigRef.current);
            }}
          />
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Thread anchor: original question + collapsed verdict summary */}
          <div style={{ alignSelf: "flex-end", maxWidth: "85%", padding: "10px 14px", borderRadius: "14px 14px 4px 14px", background: "#111827", color: "#fff", fontSize: "14px", lineHeight: 1.55 }}>
            {asked}
          </div>
          <details style={{ border: "1px solid #d1d5db", borderRadius: "12px", padding: "10px 14px", background: "#fafafa" }}>
            <summary style={{ cursor: "pointer", fontSize: "13px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              🏛️ Verdict: {verdictSummaryLine()}
            </summary>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "12px" }}>
              <div className="rt-grid">
                {PERSONAS.map((p) => (
                  <PersonaCard key={p.id} meta={p} state={cards[p.id]} onRetry={() => askPersona(p.id, asked)} />
                ))}
              </div>
              <ModeratorPanel
                mod={mod}
                onRetry={() => {
                  const verdicts = PERSONAS.map((p) => cards[p.id]?.data).filter(Boolean);
                  if (verdicts.length === 4) runModerator(verdicts, modSigRef.current);
                }}
              />
            </div>
          </details>

          {/* Follow-up exchanges */}
          {chat.map((m, i) => m.role === "scenario" ? (
            <ScenarioBlock
              key={m.id}
              sc={scenarios[m.id]}
              baseline={Object.fromEntries(PERSONAS.map((p) => [p.id, cards[p.id]?.data?.verdict]))}
            />
          ) : (
            <div
              key={i}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                padding: "10px 14px",
                borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                background: m.role === "user" ? "#111827" : "#f3f4f6",
                color: m.role === "user" ? "#fff" : "#111827",
                fontSize: "14px",
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
              }}
            >
              {m.text}
            </div>
          ))}
          {chatBusy && (
            <div className="rt-pulse" style={{ color: "#6b7280", fontSize: "13px" }}>
              🎙️ The Moderator is thinking…
            </div>
          )}
        </div>
      )}

      <footer style={{ fontSize: "12px", color: "#9ca3af", textAlign: "center", marginTop: "8px" }}>
        Educational personas based on each investor&apos;s public philosophy. Not affiliated. Not financial advice.
      </footer>
    </main>
  );
}
