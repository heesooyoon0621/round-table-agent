# Buffett (The Oracle): P/E premium vs history, ROE trend, FCF yield vs savings.
# Input: full tsla_demo_data.json via CALC_INPUT env var (or stdin).
# Output: [CALC_RESULTS] JSON on stdout.
import json
import os
import sys


def compute(d):
    o = d["oracle_inputs"]
    pe = o["pe_current"]
    pe5 = o["pe_5yr_avg"]
    pe7 = o["pe_7yr_avg"]

    roe = {int(k): v for k, v in o["roe_by_year"].items() if k.isdigit()}
    ttm = o["roe_by_year"].get("ttm_2026")
    years = sorted(roe)
    roe_series = [{"year": y, "roe_pct": roe[y]} for y in years]
    if ttm is not None:
        roe_series.append({"year": "ttm_2026", "roe_pct": ttm})
    roe_latest = roe_series[-1]["roe_pct"]
    roe_peak = max(r["roe_pct"] for r in roe_series)
    drop_pct = round((roe_latest - roe_peak) / roe_peak * 100, 1)
    if drop_pct <= -50:
        trend = "sharply declining"
    elif drop_pct <= -20:
        trend = "declining"
    elif drop_pct < 20:
        trend = "roughly flat"
    else:
        trend = "improving"

    fcf_yield = o["fcf_yield_pct_ttm"]
    savings = o["savings_rate_pct"]

    return {
        "pe_current": pe,
        "pe_5yr_avg": pe5,
        "pe_7yr_avg": pe7,
        "pe_premium_vs_5yr_avg_pct": round((pe / pe5 - 1) * 100, 1),
        "pe_premium_vs_7yr_avg_pct": round((pe / pe7 - 1) * 100, 1),
        "roe_series": roe_series,
        "roe_latest_pct": roe_latest,
        "roe_peak_pct": roe_peak,
        "roe_change_from_peak_pct": drop_pct,
        "roe_trend": trend,
        "roe_note": o.get("roe_note"),
        "debt_to_equity": o["debt_to_equity"],
        "fcf_yield_pct": fcf_yield,
        "fcf_latest_quarter": o.get("fcf_latest_quarter"),
        "savings_rate_pct": savings,
        "savings_vs_fcf_multiple": round(savings / fcf_yield, 1) if fcf_yield else None,
        "on_10000_usd": {
            "company_cash_earnings_per_year_usd": round(10000 * fcf_yield / 100),
            "savings_account_per_year_usd": round(10000 * savings / 100),
        },
    }


if __name__ == "__main__":
    raw = os.environ.get("CALC_INPUT") or sys.stdin.read()
    print(json.dumps(compute(json.loads(raw))))
