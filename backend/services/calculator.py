import pandas as pd
import yfinance as yf
from typing import Dict

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

def calc_pivot_points(ticker: str = "GC=F") -> Dict[str, float]:
    """
    使用 standard Pivot Point 公式:
    P = (H + L + C) / 3
    R1 = 2P - L
    S1 = 2P - H
    R2 = P + (H - L)
    S2 = P - (H - L)
    """
    try:
        data = yf.download(ticker, period="2d", interval="1d", progress=False)
        if data.empty or len(data) < 2:
            return None
        
        # Use yesterday's OHLC
        yesterday = data.iloc[-2]
        h, l, c = float(yesterday['High']), float(yesterday['Low']), float(yesterday['Close'])
        
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
        print(f"Error calculating pivot points: {e}")
        return None

def fed_watch_logic(zq_price: float) -> Dict[str, any]:
    """
    解析 ZQ=F (30-Day Fed Funds Future) 价格。
    Implied Rate = 100 - Price
    """
    if zq_price is None:
        return None
    
    implied_rate = 100 - zq_price
    # Simple logic for heuristic probabilities can be expanded 
    # based on current target range (5.25-5.50)
    return {
        "implied_rate": round(implied_rate, 4),
        "status": "Calculated from ZQ=F"
    }
