import requests
from typing import Dict, Any, Optional

def calc_real_yield(nominal_yield: float, breakeven_inflation: float) -> float:
    """
    ^TNX (last) - T10YIE (latest_daily)
    """
    if nominal_yield is None or breakeven_inflation is None:
        return None
    return round(nominal_yield - breakeven_inflation, 4)

def calc_domestic_premium(gold_spot: float, usd_cny: float, domestic_gold_price: float) -> float:
    """
    (GC=F / 31.1035) * USDCNY 与国内金价的差值
    """
    if not all([gold_spot, usd_cny, domestic_gold_price]):
        return None
    international_cny_per_gram = (gold_spot / 31.1035) * usd_cny
    premium = domestic_gold_price - international_cny_per_gram
    return round(premium, 2)

def fetch_yahoo_finance_raw(ticker: str, period: str = "2d") -> Optional[Dict[str, Any]]:
    """
    Directly call Yahoo Finance API to avoid heavy pandas/yfinance dependencies.
    """
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range={period}&interval=1d"
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        return data['chart']['result'][0]
    except Exception as e:
        print(f"Error fetching raw Yahoo data for {ticker}: {e}")
        return None

def calc_pivot_points(ticker: str = "GC=F") -> Optional[Dict[str, float]]:
    """
    Standard Pivot Point formula using direct API data.
    """
    raw = fetch_yahoo_finance_raw(ticker)
    if not raw:
        return None
    
    try:
        indicators = raw['indicators']['quote'][0]
        # We need yesterday's data (the one before the last one if today is open, or the last one if market is closed)
        # For simplicity, we take the element at index -2 as 'yesterday' if we have 2 elements
        if len(indicators['close']) < 2:
            return None
            
        h = indicators['high'][-2]
        l = indicators['low'][-2]
        c = indicators['close'][-2]
        
        if h is None or l is None or c is None:
            return None

        p = (h + l + c) / 3
        r1 = 2 * p - l
        s1 = 2 * p - h
        r2 = p + (h - l)
        s2 = p - (h - l)
        
        return {
            "P": round(p, 2),
            "R1": round(r1, 2),
            "S1": round(s1, 2),
            "R2": round(r2, 2),
            "S2": round(s2, 2)
        }
    except Exception as e:
        print(f"Error calculating pivots for {ticker}: {e}")
        return None

def fed_watch_logic(zq_price: float) -> Dict[str, Any]:
    if zq_price is None:
        return None
    implied_rate = 100 - zq_price
    return {
        "implied_rate": round(implied_rate, 4),
        "status": "Calculated from ZQ=F"
    }
