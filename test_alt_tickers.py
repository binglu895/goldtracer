import requests
import time
from datetime import datetime

def test_ticker(ticker):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range=1d&interval=1m&_={int(time.time())}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            meta = data.get('chart', {}).get('result', [{}])[0].get('meta', {})
            rmp = meta.get('regularMarketPrice')
            rmt = meta.get('regularMarketTime')
            dt = datetime.fromtimestamp(rmt).strftime('%Y-%m-%d %H:%M:%S') if rmt else "N/A"
            print(f"Ticker: {ticker:<12} | Price: {rmp:<10} | Time: {dt}")
        else:
            print(f"Ticker: {ticker:<12} | Error: {resp.status_code}")
    except Exception as e:
        print(f"Ticker: {ticker:<12} | Exception: {e}")

if __name__ == "__main__":
    print(f"Local System Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    tickers = ["GLD", "XAUUSD=B", "PA=F", "SI=F", "HG=F", "EURUSD=X", "JPY=X"]
    for t in tickers:
        test_ticker(t)
        time.sleep(0.5)
