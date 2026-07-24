import fs from "fs";
import path from "path";

// Price-change scenarios: rebuild the raw demo data as if TSLA moved by pct%.
// Only price-derived fields are rescaled; business fundamentals (revenue,
// ROE, debt, short interest) stay untouched. The calc scripts then recompute
// every derived number from this modified input, exactly like a normal run.

const baseRaw = fs.readFileSync(path.join(process.cwd(), "tsla_demo_data.json"), "utf8");

export function scenarioPrice(pct) {
  const base = JSON.parse(baseRaw);
  return Math.round(base.market_snapshot.price_usd * (1 + pct / 100));
}

export function scenarioLabel(pct) {
  const arrow = pct < 0 ? "📉" : "📈";
  const verb = pct < 0 ? "drops another" : "rises";
  return `${arrow} Scenario: Tesla ${verb} ${Math.abs(pct)}% (price $${scenarioPrice(pct)})`;
}

export function buildScenarioRawInput(pct) {
  const d = JSON.parse(baseRaw);
  const f = 1 + pct / 100;
  const ms = d.market_snapshot;

  ms.price_usd = Math.round(ms.price_usd * f * 100) / 100;
  ms.market_cap_usd_trillion = Math.round(ms.market_cap_usd_trillion * f * 100) / 100;
  ms.drop_from_52wk_high_pct = Math.round((ms.price_usd / ms.week52_high - 1) * 1000) / 10;
  ms.price_note = `HYPOTHETICAL: price adjusted ${pct}% from the 2026-07-24 close for a what-if scenario`;

  const o = d.oracle_inputs;
  o.pe_current = Math.round(o.pe_current * f);
  o.pe_note = `HYPOTHETICAL: price tag rescaled ${pct}% from the cached value; earnings unchanged`;
  o.fcf_yield_pct_ttm = Math.round((o.fcf_yield_pct_ttm / f) * 100) / 100;

  d.diamond_hands_inputs.price_to_book =
    Math.round(d.diamond_hands_inputs.price_to_book * f * 10) / 10;

  d.cassandra_inputs.current_valuation_percentile_vs_own_history =
    `HYPOTHETICAL price scenario (${pct}%): current P/E ~${o.pe_current} vs 7yr avg 235 and 5yr avg 136`;

  d._meta.scenario = `What-if: price ${pct}% => $${ms.price_usd}. All derived numbers recomputed from this modified input.`;
  return JSON.stringify(d);
}
