import { execFile } from "child_process";
import fs from "fs";
import path from "path";

// Runs each persona's Python calculation. Preferred: a live Daytona sandbox
// (USE_DAYTONA=false to disable). Fallback chain: Daytona -> local Python ->
// static block from tsla_demo_data.json.

const CALC_SCRIPTS = {
  oracle: "oracle_calc.py",
  moonshot: "moonshot_calc.py",
  diamond_hands: "diamond_hands_calc.py",
  cassandra: "cassandra_calc.py",
};

const DAYTONA_TIMEOUT_MS = 10_000;

const rawInput = fs.readFileSync(path.join(process.cwd(), "tsla_demo_data.json"), "utf8");

function scriptSource(personaId) {
  return fs.readFileSync(path.join(process.cwd(), "calcs", CALC_SCRIPTS[personaId]), "utf8");
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(label + " timed out after " + ms + "ms")), ms)),
  ]);
}

// One sandbox is created lazily and reused across requests; on any failure it
// is discarded so the next request can recreate it.
let sandboxPromise = null;

async function getSandbox() {
  if (!sandboxPromise) {
    sandboxPromise = (async () => {
      const { Daytona } = await import("@daytonaio/sdk");
      const daytona = new Daytona({ apiKey: process.env.DAYTONA_API_KEY });
      return daytona.create({ language: "python" });
    })();
    sandboxPromise.catch(() => { sandboxPromise = null; });
  }
  return sandboxPromise;
}

async function runInDaytona(personaId) {
  const sandbox = await getSandbox();
  try {
    const res = await sandbox.process.codeRun(scriptSource(personaId), {
      env: { CALC_INPUT: rawInput },
    });
    if (res.exitCode !== 0) {
      throw new Error("sandbox exit " + res.exitCode + ": " + String(res.result).slice(0, 200));
    }
    return JSON.parse(res.result);
  } catch (e) {
    sandboxPromise = null; // force re-create next time
    throw e;
  }
}

function runLocal(personaId) {
  const scriptPath = path.join(process.cwd(), "calcs", CALC_SCRIPTS[personaId]);
  return new Promise((resolve, reject) => {
    execFile(
      "python",
      [scriptPath],
      { env: { ...process.env, CALC_INPUT: rawInput }, timeout: 15_000, windowsHide: true },
      (err, stdout, stderr) => {
        if (err) return reject(new Error("local python failed: " + (stderr || err.message).slice(0, 200)));
        try { resolve(JSON.parse(stdout)); } catch (e) { reject(new Error("local output not JSON: " + e.message)); }
      }
    );
  });
}

export async function runCalc(personaId) {
  if (!CALC_SCRIPTS[personaId]) throw new Error("no calc script for " + personaId);

  const useDaytona =
    String(process.env.USE_DAYTONA ?? "true").toLowerCase() !== "false" &&
    !!process.env.DAYTONA_API_KEY;

  if (useDaytona) {
    try {
      const calc = await withTimeout(runInDaytona(personaId), DAYTONA_TIMEOUT_MS, "Daytona");
      return { calc, source: "daytona-sandbox" };
    } catch (e) {
      console.error(`[calc:${personaId}] Daytona failed -> local fallback:`, e.message);
    }
  }

  try {
    const calc = await runLocal(personaId);
    return { calc, source: "local-fallback" };
  } catch (e) {
    console.error(`[calc:${personaId}] local fallback failed -> static data:`, e.message);
    const tsla = JSON.parse(rawInput);
    const staticKeys = {
      oracle: "oracle_inputs", moonshot: "moonshot_inputs",
      diamond_hands: "diamond_hands_inputs", cassandra: "cassandra_inputs",
    };
    return { calc: tsla[staticKeys[personaId]], source: "static-demo-data" };
  }
}
