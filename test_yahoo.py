import requests
import time
import json

def test_ticker(ticker):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range=1d&interval=1m&_={int(time.time())}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        print(f"Ticker: {ticker} | Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            res = data.get('chart', {}).get('result', [])
            if not res:
                print(f"  [ERROR] No result in chart data: {json.dumps(data)}")
                return
            meta = res[0].get('meta', {})
            quote = res[0].get('indicators', {}).get('quote', [{}])[0]
            closes = [c for c in quote.get('close', []) if c is not None]
            rmp = meta.get('regularMarketPrice')
            print(f"  RMP: {rmp} | Closes count: {len(closes)} | Latest Close: {closes[-1] if closes else 'N/A'}")
        else:
            print(f"  [ERROR] Status: {resp.status_code} | Body: {resp.text[:100]}")
    except Exception as e:
        print(f"  [EXCEPTION] {ticker}: {e}")

if __name__ == "__main__":
    for t in ["GC=F", "DX-Y.NYB", "ZQ=F", "USDCNH=X", "^TNX"]:
        test_ticker(t)
        time.sleep(1)
