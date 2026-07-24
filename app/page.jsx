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

      {state?.status === "loading" && <LoadingLine />}

      {state?.status === "error" && (
        <div style={{ fontSize: "13px" }}>
          <div style={{ color: "#991b1b", marginBottom: "8px" }}>
            Couldn&apos;t get an answer ({state.error})
          </div>
          <button onClick={onRetry} style={{
            padding: "6px 14px", borderRadius: "8px", border: "1px solid #d1d5db",
            background: "#f9fafb", cursor: "pointer", fontSize: "13px", fontWeight: 600,
          }}>
            ↻ Try again
          </button>
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
        <button onClick={onRetry} style={{ padding: "8px 18px", borderRadius: "8px", border: "1px solid #d1d5db", background: "#f9fafb", cursor: "pointer", fontWeight: 600 }}>
          ↻ Ask the Moderator again
        </button>
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
      <div style={{ fontSize: "24px", fontWeight: 800, lineHeight: 1.35 }}>{d.final_call_plain}</div>
      <div>
        <span style={{
          background: d.confidence_label_plain === "High confidence" ? "#dcfce7" : "#fef9c3",
          color: d.confidence_label_plain === "High confidence" ? "#166534" : "#854d0e",
          borderRadius: "999px", padding: "4px 12px", fontSize: "12px", fontWeight: 700,
        }}>
          {d.confidence_label_plain}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {(d.scoreboard ?? []).map((row, i) => {
          const meta = PERSONAS.find((p) =>
            String(row.persona ?? "").toLowerCase().replace(/[^a-z]/g, "").includes(p.id.replace("_", ""))
          ) ?? PERSONAS[i];
          return (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: "10px", fontSize: "14px" }}>
              <span style={{ whiteSpace: "nowrap", fontWeight: 700 }}>{meta?.emoji} {meta?.shortName ?? row.persona}</span>
              <VerdictBadge verdict={row.verdict} size={11} />
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
    </div>
  );
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState(null);
  const [cards, setCards] = useState({});
  const [mod, setMod] = useState({ status: "idle" });
  const modSigRef = useRef(null);

  const askPersona = async (personaId, q) => {
    setCards((c) => ({ ...c, [personaId]: { status: "loading" } }));
    try {
      const r = await fetch("/api/roundtable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "persona", personaId, question: q }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "HTTP " + r.status);
      setCards((c) => ({ ...c, [personaId]: { status: "done", data: j.result, calc: j.calc, calcSource: j.calcSource } }));
    } catch (e) {
      setCards((c) => ({ ...c, [personaId]: { status: "error", error: e.message } }));
    }
  };

  const ask = (q) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setAsked(trimmed);
    setQuestion(trimmed);
    setMod({ status: "idle" });
    modSigRef.current = null;
    PERSONAS.forEach((p) => askPersona(p.id, trimmed));
  };

  const runModerator = async (verdicts, sig) => {
    setMod({ status: "loading" });
    try {
      const r = await fetch("/api/roundtable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "moderator", question: asked, verdicts }),
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

  const busy = PERSONAS.some((p) => cards[p.id]?.status === "loading") || mod.status === "loading";

  return (
    <main style={{ maxWidth: "980px", margin: "0 auto", padding: "24px 20px 60px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <style>{`.rt-pulse { animation: rtpulse 1.4s ease-in-out infinite; } @keyframes rtpulse { 0%,100% {opacity:.45} 50% {opacity:1} }`}</style>

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
          placeholder="Ask anything — no dumb questions"
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
          {busy ? "Debating…" : "Ask the table"}
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

      {asked && (
        <div style={{ fontSize: "14px", color: "#374151" }}>
          You asked: <b>&ldquo;{asked}&rdquo;</b>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
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

      <footer style={{ fontSize: "12px", color: "#9ca3af", textAlign: "center", marginTop: "8px" }}>
        Educational personas based on each investor&apos;s public philosophy. Not affiliated. Not financial advice.
      </footer>
    </main>
  );
}
