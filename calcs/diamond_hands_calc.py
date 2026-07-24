# Roaring Kitty (Diamond Hands): composite score from short interest,
# momentum/attention, and value floor.
# Input: full tsla_demo_data.json via CALC_INPUT env var (or stdin).
# Output: [CALC_RESULTS] JSON on stdout.
import json
import os
import re
import sys


def compute(d):
    dh = d["diamond_hands_inputs"]

    short_pct = dh["short_interest_pct_of_shares"]
    # squeeze potential: 20%+ short interest is where squeeze setups begin (GME was 100%+)
    squeeze_score = round(min(short_pct / 20.0, 1.0) * 40, 1)

    # attention/momentum: volume spike ratio (parse "3.6x" style note if present)
    vol_note = str(dh.get("volume_today_vs_avg", ""))
    m = re.search(r"([\d.]+)\s*x", vol_note)
    vol_ratio = float(m.group(1)) if m else 1.0
    attention_score = round(min(vol_ratio / 4.0, 1.0) * 20, 1)

    # value floor: price-to-book at or below 3 starts to look like deep value
    pb = dh["price_to_book"]
    value_score = round(max(0.0, (3.0 - pb) / 3.0) * 40, 1)

    total = round(squeeze_score + attention_score + value_score, 1)
    if total >= 60:
        label = "asymmetric setup worth a small, survivable bet"
    elif total >= 35:
        label = "interesting but incomplete — keep watching"
    else:
        label = "not my kind of setup — hype without a value floor"

    return {
        "short_interest_pct_of_shares": short_pct,
        "short_interest_note": dh.get("short_interest_note"),
        "volume_spike_ratio": vol_ratio,
        "price_momentum_60d": dh.get("price_momentum_60d"),
        "price_to_book": pb,
        "value_floor_note": dh.get("value_floor_note"),
        "analyst_consensus": dh.get("analyst_consensus"),
        "score_breakdown": {
            "squeeze_score_of_40": squeeze_score,
            "attention_score_of_20": attention_score,
            "value_floor_score_of_40": value_score,
        },
        "composite_score_of_100": total,
        "setup_label": label,
    }


if __name__ == "__main__":
    raw = os.environ.get("CALC_INPUT") or sys.stdin.read()
    print(json.dumps(compute(json.loads(raw))))
