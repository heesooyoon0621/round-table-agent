# Burry (Cassandra): three P/E-reversion scenarios — downside % and dollar
# damage on a $10,000 position.
# Input: full tsla_demo_data.json via CALC_INPUT env var (or stdin).
# Output: [CALC_RESULTS] JSON on stdout.
import json
import os
import re
import sys


def compute(d):
    price = d["market_snapshot"]["price_usd"]
    o = d["oracle_inputs"]
    c = d["cassandra_inputs"]
    pe_now = o["pe_current"]

    # forward EPS parsed from the raw note (e.g. "using forward EPS ~$2.56")
    fwd_note = str(c["worst_case_scenario_math"].get("if_pe_reverts_to_forward_market_premium_60x", {}).get("note", ""))
    m = re.search(r"\$([\d.]+)", fwd_note)
    fwd_eps = float(m.group(1)) if m else None

    def scenario(name, implied_price, assumption):
        downside_pct = round((implied_price / price - 1) * 100, 1)
        value = round(10000 * implied_price / price)
        return {
            "scenario": name,
            "assumption": assumption,
            "implied_price_usd": round(implied_price, 2),
            "downside_pct": downside_pct,
            "value_of_10000_usd": value,
            "loss_on_10000_usd": 10000 - value,
        }

    scenarios = [
        scenario(
            "reversion_to_5yr_avg_pe",
            price * o["pe_5yr_avg"] / pe_now,
            f"price tag falls from {pe_now}x back to its own 5-year average of {o['pe_5yr_avg']}x",
        ),
        scenario(
            "moderate_reversion_pe_200",
            price * 200 / pe_now,
            f"price tag falls from {pe_now}x to a still-generous 200x",
        ),
    ]
    if fwd_eps:
        scenarios.append(
            scenario(
                "forward_60x_market_premium",
                fwd_eps * 60,
                f"next year's expected earnings (${fwd_eps}/share) at 60x, still double the market average",
            )
        )

    worst = min(scenarios, key=lambda s: s["downside_pct"])

    return {
        "current_price_usd": price,
        "pe_current": pe_now,
        "valuation_percentile_note": c.get("current_valuation_percentile_vs_own_history"),
        "max_historical_drawdown_pct": c["max_historical_drawdown_pct"],
        "max_drawdown_episode": c.get("max_drawdown_episode"),
        "scenarios": scenarios,
        "worst_case": worst,
        "balance_sheet_strength": c.get("balance_sheet_strength"),
        "quarterly_fcf": c.get("quarterly_fcf"),
    }


if __name__ == "__main__":
    raw = os.environ.get("CALC_INPUT") or sys.stdin.read()
    print(json.dumps(compute(json.loads(raw))))
