import { initLogger } from "braintrust";

// Braintrust tracing. One question = one trace tree:
//   roundtable (root, keyed by questionId from the client)
//     ├─ persona:oracle        ├─ calc:oracle (tool)  └─ llm (glm-5p2)
//     ├─ persona:moonshot ...
//     └─ moderator             └─ llm
let logger = null;

export function getTraceLogger() {
  if (!logger && process.env.BRAINTRUST_API_KEY) {
    logger = initLogger({
      projectName: "round-table-agent",
      apiKey: process.env.BRAINTRUST_API_KEY,
    });
  }
  return logger;
}

// questionId -> Promise<{ span, exported }> — the promise is stored
// synchronously so four concurrent persona requests share ONE root span.
const roots = new Map();

export function getRootSpan(questionId, question) {
  const lg = getTraceLogger();
  if (!lg || !questionId) return Promise.resolve(null);
  let entryPromise = roots.get(questionId);
  if (!entryPromise) {
    const span = lg.startSpan({ name: "roundtable", event: { input: question } });
    entryPromise = span.export().then((exported) => ({ span, exported }));
    roots.set(questionId, entryPromise);
    // safety: drop stale roots after 10 minutes so the map can't grow forever
    setTimeout(() => {
      if (roots.get(questionId) === entryPromise) { span.end(); roots.delete(questionId); }
    }, 600_000).unref?.();
  }
  return entryPromise;
}

export function startChildSpan(parentExported, { name, type, input, metadata }) {
  const lg = getTraceLogger();
  if (!lg || !parentExported) return null;
  const span = lg.startSpan({ parent: parentExported, name, type, event: { input, metadata } });
  return span;
}

export async function finishRoot(questionId, output) {
  const entry = await roots.get(questionId);
  if (!entry) return;
  entry.span.log({ output });
  entry.span.end();
  roots.delete(questionId);
  try { await getTraceLogger()?.flush(); } catch { /* tracing must never break the app */ }
}
