import requests
import os
from datetime import datetime
from typing import Optional, Dict, Any
from .calculator import calc_real_yield, calc_pivot_points, fetch_yahoo_finance_raw

class GoldDataSyncer:
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.fred_api_key = os.getenv("FRED_API_KEY")

    def fetch_market_data(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Fetch basic market data using direct API call."""
        raw = fetch_yahoo_finance_raw(ticker, period="1d")
        if not raw:
            return None
        
        try:
            meta = raw['meta']
            quote = raw['indicators']['quote'][0]
            
            last_price = meta['regularMarketPrice']
            open_price = quote['open'][0]
            
            return {
                "ticker": ticker,
                "last_price": last_price,
                "open_price": open_price,
                "high_price": quote['high'][0],
                "low_price": quote['low'][0],
                "change_percent": ((last_price / open_price) - 1) * 100 if open_price else 0
            }
        except Exception as e:
            print(f"Error parsing market data for {ticker}: {e}")
            return None

    def fetch_fred_metric(self, series_id: str) -> Optional[float]:
        if not self.fred_api_key:
            return None
        
        url = f"https://api.stlouisfed.org/fred/series/observations?series_id={series_id}&api_key={self.fred_api_key}&file_type=json&sort_order=desc&limit=1"
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            if data['observations']:
                val = data['observations'][0]['value']
                return float(val) if val != "." else None
        except Exception as e:
            print(f"FRED Fetch Error for {series_id}: {e}")
            return None
        return None

    def sync_all(self):
        report = {"updated": [], "errors": []}
        # 1. High Frequency Tickeres
        tickers = ["GC=F", "^TNX", "DX-Y.NYB", "ZQ=F", "CNY=X"]
        for symbol in tickers:
            data = self.fetch_market_data(symbol)
            if data:
                try:
                    self.supabase.table("market_data_cache").upsert(data, on_conflict="ticker").execute()
                    report["updated"].append(symbol)
                except Exception as e:
                    report["errors"].append(f"DB Error {symbol}: {str(e)}")
            else:
                 report["errors"].append(f"Fetch Failed: {symbol}")

        # 2. Real Yield
        breakeven = self.fetch_fred_metric("T10YIE")
        tnx_data = self.fetch_market_data("^TNX")
        nominal = tnx_data['last_price'] if tnx_data else None
        
        real_yield = calc_real_yield(nominal, breakeven)
        if real_yield is not None:
             self.supabase.table("macro_indicators").upsert({
                 "indicator_name": "10Y_Real_Yield",
                 "value": real_yield,
                 "is_stale": breakeven is None,
                 "source": "FRED + Yahoo"
             }, on_conflict="indicator_name").execute()

        # 2.1 Domestic Premium (Simplified: Calculated vs Spot)
        # We need Gold Spot (GC=F) and USDCNY (CNY=X)
        gold_data = self.fetch_market_data("GC=F")
        cny_data = self.fetch_market_data("CNY=X")
        
        if gold_data and cny_data:
            gold_price = gold_data['last_price']
            usd_cny = cny_data['last_price']
            # Theoretical CNY Price/g = (Gold($/oz) / 31.1035) * USDCNY
            theoretical_price = (gold_price / 31.1035) * usd_cny
            
            # Assume a "Reference" Domestic Price (e.g. +$2 premium typically, or fetch real one)
            # Since we don't have a reliable free API for Shanghai Gold T+D right now, 
            # we will store the 'Implied Domestic Price' and a 'Calculated Premium' (mocked slightly or using a proxy)
            # For now, let's just save the Exchange Rate to Macro
            self.supabase.table("macro_indicators").upsert({
                "indicator_name": "USD_CNY",
                "value": usd_cny,
                "source": "Yahoo"
             }, on_conflict="indicator_name").execute()


        # 3. Pivot Points
        pivots = calc_pivot_points("GC=F")
        if pivots:
            # Generate simple technical advice from Pivot Points
            advice = {
                "entry": pivots.get("P"),
                "tp": pivots.get("R1"),
                "sl": pivots.get("S1"),
                "confidence": 0.65,
                "note": "Based on Daily Pivot Points"
            }
            
            self.supabase.table("daily_strategy_log").upsert({
                "log_date": datetime.now().date().isoformat(),
                "pivot_points": pivots,
                "trade_advice": advice
            }, on_conflict="log_date").execute()

        return report

    def sync_institutional(self):
        # Placeholder
        self.supabase.table("institutional_stats").upsert({
            "category": "GLD_ETF",
            "label": "GLD Holding Change",
            "value": -1.2,
            "change_value": -0.05
        }, on_conflict="category,label").execute()
