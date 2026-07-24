"use client";

import { CopilotKit, useCopilotChat } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { TextMessage, Role } from "@copilotkit/runtime-client-gql";
import "@copilotkit/react-ui/styles.css";

const EXAMPLE_QUESTIONS = [
  "Tesla keeps dropping — is it okay to buy now?",
  "Stocks or savings account — which is better for me?",
  "Someone told me about a fund that guarantees 10% a month. Real?",
];

// The plain-language system prompt lives server-side in
// app/api/copilotkit/route.js, where it is injected into every model request.

function ExampleQuestions() {
  const { appendMessage } = useCopilotChat();

  const ask = (question) => {
    appendMessage(new TextMessage({ content: question, role: Role.User }));
  };

  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", padding: "12px 24px" }}>
      {EXAMPLE_QUESTIONS.map((q) => (
        <button
          key={q}
          onClick={() => ask(q)}
          style={{
            padding: "8px 14px",
            borderRadius: "999px",
            border: "1px solid #d1d5db",
            background: "#f9fafb",
            fontSize: "13px",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          {q}
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <main style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        <header style={{ padding: "16px 24px 4px", borderBottom: "none" }}>
          <h1 style={{ fontSize: "20px" }}>🏛️ The Round Table</h1>
          <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>
            Plain-English answers about money. No question is too basic.
          </p>
        </header>
        <ExampleQuestions />
        <div style={{ flex: 1, minHeight: 0, borderTop: "1px solid #e5e7eb" }}>
          <CopilotChat
            style={{ height: "100%" }}
            labels={{
              title: "The Round Table",
              initial:
                "Hi! I'm here to talk about money in plain English. Ask me anything — really, anything.",
              placeholder: "Ask anything — no dumb questions",
            }}
          />
        </div>
      </main>
    </CopilotKit>
  );
}
