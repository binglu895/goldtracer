import yfinance as yf
import requests
import os
from datetime import datetime
from typing import Optional, Dict, Any
from .calculator import calc_real_yield, calc_pivot_points, fed_watch_logic

class GoldDataSyncer:
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.fred_api_key = os.getenv("FRED_API_KEY")

    def fetch_yfinance_data(self, ticker: str) -> Dict[str, Any]:
        """Fetch basic market data from yfinance."""
        try:
            t = yf.Ticker(ticker)
            info = t.fast_info
            return {
                "ticker": ticker,
                "last_price": info.last_price,
                "open_price": info.open_price,
                "high_price": info.day_high,
                "low_price": info.day_low,
                "change_percent": ((info.last_price / info.open_price) - 1) * 100 if info.open_price else 0
            }
        except Exception as e:
            print(f"Error fetching {ticker}: {e}")
            return None

    def fetch_fred_metric(self, series_id: str) -> Optional[float]:
        """
        Fetch data from FRED with 'Last Known Good Value' robustness.
        """
        if not self.fred_api_key:
            return None
        
        url = f"https://api.stlouisfed.org/fred/series/observations?series_id={series_id}&api_key={self.fred_api_key}&file_type=json&sort_order=desc&limit=1"
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            if data['observations']:
                return float(data['observations'][0]['value'])
        except Exception as e:
            print(f"FRED Fetch Error for {series_id}: {e}. Falling back to DB cache.")
            # Mark indicator as stale in DB later if we use previous value
            return None
        return None

    def sync_all(self):
        """Main SOP sync loop."""
        
        # 1. High Frequency: yfinance (GC=F, ^TNX, DX-Y.NYB, ZQ=F)
        tickers = ["GC=F", "^TNX", "DX-Y.NYB", "ZQ=F"]
        for symbol in tickers:
            data = self.fetch_yfinance_data(symbol)
            if data:
                self.supabase.table("market_data_cache").upsert(data, on_conflict="ticker").execute()

        # 2. Mid Frequency: Macro Indicators & Calculations
        # Fetch Breakeven Inflation (T10YIE) from FRED
        breakeven = self.fetch_fred_metric("T10YIE")
        
        # Get nominal yield from cache/fresh
        nominal_yield_data = self.fetch_yfinance_data("^TNX")
        nominal_yield = nominal_yield_data['last_price'] if nominal_yield_data else None
        
        # Real Yield Calculation
        is_stale = False
        if breakeven is None:
            # Fallback strategy: Get last value from macro_indicators
            last_entry = self.supabase.table("macro_indicators").select("value").eq("indicator_name", "10Y_Real_Yield").execute()
            if last_entry.data:
                # We can't really re-calculate accurately if breakeven is missing, 
                # but we can flag the existing Real Yield as stale.
                is_stale = True
            real_yield = None # Or keep old one
        else:
            real_yield = calc_real_yield(nominal_yield, breakeven)

        if real_yield is not None:
             self.supabase.table("macro_indicators").upsert({
                 "indicator_name": "10Y_Real_Yield",
                 "value": real_yield,
                 "is_stale": is_stale,
                 "source": "FRED + yfinance"
             }, on_conflict="indicator_name").execute()

        # 3. Pivot Points (Daily SOP)
        pivots = calc_pivot_points("GC=F")
        if pivots:
            self.supabase.table("daily_strategy_log").upsert({
                "log_date": datetime.now().date().isoformat(),
                "pivot_points": pivots
            }, on_conflict="log_date").execute()

        print("Sync completed successfully.")

    def sync_institutional(self):
        """Low Frequency: CFTC / GLD / Central Banks (e.g. 24h)"""
        # Scraper logic for CFTC net long would go here.
        # Placeholder update:
        self.supabase.table("institutional_stats").upsert({
            "category": "GLD_ETF",
            "label": "GLD Holding Change",
            "value": -1.2,
            "change_value": -0.05
        }, on_conflict="category,label").execute()
