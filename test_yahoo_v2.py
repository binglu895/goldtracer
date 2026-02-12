import requests
import time
import json
from datetime import datetime

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
                print(f"  [ERROR] No result")
                return
            meta = res[0].get('meta', {})
            rmp = meta.get('regularMarketPrice')
            rmt = meta.get('regularMarketTime')
            
            if rmt:
                dt = datetime.fromtimestamp(rmt).strftime('%Y-%m-%d %H:%M:%S')
                print(f"  Price: {rmp} | Time: {dt} ({rmt})")
            else:
                print(f"  Price: {rmp} | Time: N/A")
                
            quote = res[0].get('indicators', {}).get('quote', [{}])[0]
            closes = [c for c in quote.get('close', []) if c is not None]
            if closes:
                print(f"  Latest Close: {closes[-1]} | Count: {len(closes)}")
            else:
                print(f"  No closes in range=1d")
        else:
            print(f"  [ERROR] Body: {resp.text[:100]}")
    except Exception as e:
        print(f"  [EXCEPTION] {e}")

if __name__ == "__main__":
    print(f"Local System Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    for t in ["GC=F", "DX-Y.NYB", "ZQ=F", "USDCNH=X", "^TNX"]:
        test_ticker(t)
        time.sleep(1)
