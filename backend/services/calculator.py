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
    # Use more realistic headers to avoid Vercel/AWS IP blocking
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0',
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        if not data['chart']['result']:
             print(f"Yahoo API returned no result for {ticker}: {data}")
             return None
        return data['chart']['result'][0]
    except Exception as e:
        print(f"Error fetching raw Yahoo data for {ticker}: {type(e).__name__} {e}")
        return None

def calc_pivot_points(ticker: str = "GC=F", interval: str = "1d") -> Optional[Dict[str, float]]:
    """
    Standard Pivot Point formula using direct API data.
    Intervals: 4h, 1d, 1w
    """
    y_interval = interval
    range_val = "5d" # Default for 1d and 4h
    
    if interval == "4h":
        y_interval = "4h"
    elif interval == "1w":
        y_interval = "1wk"
        range_val = "1mo"
    elif interval == "1d":
        y_interval = "1d"
        range_val = "5d"


    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range={range_val}&interval={y_interval}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        raw = data['chart']['result'][0]
        
        indicators = raw['indicators']['quote'][0]
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
        print(f"Error calculating pivots for {ticker} at {interval}: {e}")
        return None


def calc_rsi(ticker: str = "GC=F", period: int = 14) -> Optional[float]:
    raw = fetch_yahoo_finance_raw(ticker, period="30d")
    if not raw or 'indicators' not in raw:
        return None
    try:
        closes = [c for c in raw['indicators']['quote'][0]['close'] if c is not None]
        if len(closes) < period + 1:
            return None
        
        changes = [closes[i] - closes[i-1] for i in range(1, len(closes))]
        gains = [c if c > 0 else 0 for c in changes]
        losses = [-c if c < 0 else 0 for c in changes]
        
        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period
        
        if avg_loss == 0:
            return 100.0
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        return round(rsi, 2)
    except:
        return None

def fetch_indicator_price(ticker: str) -> Optional[float]:
    raw = fetch_yahoo_finance_raw(ticker, period="1d")
    if not raw or 'meta' not in raw:
        return None
    return raw['meta'].get('regularMarketPrice')

