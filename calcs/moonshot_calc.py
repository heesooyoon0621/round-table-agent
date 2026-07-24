# Wood (Moonshot): 5-year bull/base/bear scenario multiples and annualized returns.
# Input: full tsla_demo_data.json via CALC_INPUT env var (or stdin).
# Output: [CALC_RESULTS] JSON on stdout.
import json
import os
import sys


def compute(d):
    m = d["moonshot_inputs"]
    cap_now = d["market_snapshot"]["market_cap_usd_trillion"]

    scenarios = {}
    for name, s in m["tam_scenarios_5yr"].items():
        if name.startswith("_"):
            continue
        cap_5yr = s["implied_market_cap_usd_trillion"]
        multiple = round(cap_5yr / cap_now, 2)
        annualized_pct = round(((multiple) ** (1 / 5) - 1) * 100, 1)
        scenarios[name] = {
            "narrative": s["narrative"],
            "implied_market_cap_usd_trillion": cap_5yr,
            "multiple_vs_today": multiple,
            "annualized_return_pct": annualized_pct,
            "value_of_10000_usd_in_5yr": round(10000 * multiple),
        }

    return {
        "market_cap_today_usd_trillion": cap_now,
        "revenue_ttm_usd_billion": m["revenue_ttm_usd_billion"],
        "revenue_growth_latest_q_yoy_pct": m["revenue_growth_latest_q_yoy_pct"],
        "revenue_growth_note": m.get("revenue_growth_note"),
        "deliveries_growth_yoy_pct": m["deliveries_growth_yoy_pct"],
        "fsd_catalyst": m.get("fsd_catalyst"),
        "capex_guide_usd_billion_per_year": m.get("capex_guide_usd_billion_per_year"),
        "scenarios_5yr": scenarios,
        "scenario_note": m["tam_scenarios_5yr"].get("_note"),
    }


if __name__ == "__main__":
    raw = os.environ.get("CALC_INPUT") or sys.stdin.read()
    print(json.dumps(compute(json.loads(raw))))
