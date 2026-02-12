import requests
import time
from datetime import datetime

def test_ticker(ticker):
    # Try query2 as a fallback/alternative
    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{ticker}?range=1d&interval=1m&_={int(time.time())}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            res = data.get('chart', {}).get('result', [{}])[0]
            meta = res.get('meta', {})
            rmp = meta.get('regularMarketPrice')
            name = meta.get('shortName') or meta.get('longName') or "Unknown"
            currency = meta.get('currency')
            print(f"Ticker: {ticker:<12} | Name: {name:<25} | Price: {rmp:<10} | Cur: {currency}")
        else:
            print(f"Ticker: {ticker:<12} | Error: {resp.status_code}")
    except Exception as e:
        print(f"Ticker: {ticker:<12} | Exception: {e}")

if __name__ == "__main__":
    tickers = ["GC=F", "XAUUSD=X", "USDCNH=X", "DX-Y.NYB", "ZQ=F", "^TNX", "600489.SS", "518880.SS"]
    for t in tickers:
        test_ticker(t)
        time.sleep(0.5)
