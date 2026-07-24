"""Fetch normalized Yahoo Finance overlays without making quotes wait for fundamentals.

Usage: python live_market_data.py TSLA quote|fundamentals
The quote mode deliberately avoids ``Ticker.info``: Yahoo's quote-summary
endpoint can be slow or unavailable, whereas chart/fast-info data is usually
enough to provide a current price and range. Fundamentals are optional.
"""
import json
import sys
from datetime import datetime, timezone

import yfinance as yf


def number(value, default=None):
    try:
        return float(value) if value is not None else default
    except (TypeError, ValueError):
        return default


def percent(value, default=None):
    value = number(value)
    return round(value * 100, 2) if value is not None else default


def safe_get(mapping, key, default=None):
    try:
        return mapping.get(key, default)
    except Exception:
        return default


def quote(ticker_name):
    ticker = yf.Ticker(ticker_name)
    # This chart request also lets us derive momentum and a reliable last-close
    # fallback if Yahoo does not expose a real-time quote.
    history = ticker.history(period="3mo", interval="1d", auto_adjust=False, timeout=5)
    if history.empty:
        raise RuntimeError("Yahoo Finance returned no price history")
    closes = history["Close"].dropna()
    fast = ticker.fast_info
    latest_price = number(safe_get(fast, "last_price"), number(closes.iloc[-1]))
    if latest_price is None:
        raise RuntimeError("Yahoo Finance returned no current price")
    prior_60d = number(closes.iloc[max(0, len(closes) - 61)])
    momentum_60d = round((latest_price / prior_60d - 1) * 100, 1) if prior_60d else None
    current_volume = number(history["Volume"].iloc[-1])
    average_volume = number(history["Volume"].tail(min(len(history), 20)).mean())
    volume_ratio = round(current_volume / average_volume, 2) if average_volume else None
    high_52 = number(safe_get(fast, "year_high"))
    return {
        "_live_market_data": {
            "source": "Yahoo Finance via yfinance", "ticker": ticker_name,
            "as_of_utc": datetime.now(timezone.utc).isoformat(), "is_live": True,
            "quote_status": "live-or-most-recent-close",
            "note": "Yahoo Finance prices may be delayed and may be the most recent market close.",
        },
        "market_snapshot": {
            "price_usd": round(latest_price, 2),
            "market_cap_usd_trillion": round(number(safe_get(fast, "market_cap")) / 1_000_000_000_000, 4) if number(safe_get(fast, "market_cap")) else None,
            "week52_high": high_52, "week52_low": number(safe_get(fast, "year_low")),
            "drop_from_52wk_high_pct": round((latest_price / high_52 - 1) * 100, 1) if high_52 else None,
        },
        "diamond_hands_inputs": {
            "volume_today_vs_avg": f"{volume_ratio}x most recent daily volume versus 20-day average" if volume_ratio else None,
            "price_momentum_60d": f"{momentum_60d:+.1f}% over about 60 trading days" if momentum_60d is not None else None,
        },
    }


def fundamentals(ticker_name):
    # This endpoint is valuable but optional. The Node runner gives it a longer,
    # separate deadline so a slow response cannot prevent live price tracking.
    ticker = yf.Ticker(ticker_name)
    info = ticker.info or {}
    market_cap = number(info.get("marketCap"))
    free_cash_flow = number(info.get("freeCashflow"))
    roe_by_year = {}
    try:
        financials = ticker.financials
        balance_sheet = ticker.balance_sheet
        for column in financials.columns:
            net_income = number(financials.loc["Net Income", column]) if "Net Income" in financials.index else None
            equity = number(balance_sheet.loc["Stockholders Equity", column]) if "Stockholders Equity" in balance_sheet.index and column in balance_sheet.columns else None
            if net_income is not None and equity not in (None, 0):
                roe_by_year[str(column.year)] = round(net_income / equity * 100, 2)
    except Exception:
        pass
    return {
        "_live_market_data": {
            "source": "Yahoo Finance via yfinance", "ticker": ticker_name,
            "fundamentals_status": "available",
        },
        "oracle_inputs": {
            "pe_current": number(info.get("trailingPE")),
            "debt_to_equity": round(number(info.get("debtToEquity")) / 100, 3) if number(info.get("debtToEquity")) is not None else None,
            "fcf_ttm_usd_billion": round(free_cash_flow / 1_000_000_000, 3) if free_cash_flow else None,
            "fcf_yield_pct_ttm": round(free_cash_flow / market_cap * 100, 3) if free_cash_flow and market_cap else None,
            "roe_by_year": roe_by_year,
        },
        "moonshot_inputs": {
            "revenue_ttm_usd_billion": round(number(info.get("totalRevenue")) / 1_000_000_000, 3) if number(info.get("totalRevenue")) else None,
            "revenue_growth_latest_q_yoy_pct": percent(info.get("revenueGrowth")),
        },
        "diamond_hands_inputs": {
            "short_interest_pct_of_shares": percent(info.get("shortPercentOfFloat")),
            "price_to_book": number(info.get("priceToBook")),
        },
        "cassandra_inputs": {"forward_eps": number(info.get("forwardEps"))},
    }


if __name__ == "__main__":
    ticker = (sys.argv[1] if len(sys.argv) > 1 else "TSLA").upper()
    mode = sys.argv[2] if len(sys.argv) > 2 else "quote"
    if mode == "quote":
        print(json.dumps(quote(ticker)))
    elif mode == "fundamentals":
        print(json.dumps(fundamentals(ticker)))
    else:
        raise ValueError("mode must be quote or fundamentals")
