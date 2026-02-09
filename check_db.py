import os
import sys
import time
from dotenv import load_dotenv
from supabase import create_client

# Ensure backend can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from backend.services.sync_service import GoldDataSyncer
except ImportError as e:
    print(f"Import Error: {e}")
    # Fallback for direct execution if package structure issues persist
    sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))
    from services.sync_service import GoldDataSyncer

load_dotenv(dotenv_path=".env.local") 

def main():
    print("--- Goldtracer PRO v5.0 Database Diagnostic ---")
    
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        print("[ERROR] Supabase URL or Key not found in environment variables.")
        print("Please ensure .env.local exists and contains valid Supabase credentials.")
        return

    print(f"[OK] Supabase Credentials Found: {url[:30]}...")
    
    try:
        supabase = create_client(url, key)
    except Exception as e:
        print(f"[ERROR] Failed to create Supabase client: {e}")
        return
    
    print("\n--- Step 1: Triggering Data Synchronization ---")
    print("Initializing GoldDataSyncer...")
    syncer = GoldDataSyncer(supabase)
    
    print("Running sync_all()... (This fetches Yahoo Finance & FRED data)")
    start_time = time.time()
    try:
        syncer.sync_all()
        # Also run sync_institutional for complete data
        syncer.sync_institutional() 
        print(f"[OK] Sync completed in {time.time() - start_time:.2f} seconds.")
    except Exception as e:
        print(f"[ERROR] Sync process failed: {e}")
        import traceback
        traceback.print_exc()

    print("\n--- Step 2: Verifying Database Content ---")
    
    # 1. Market Data
    try:
        res = supabase.table("market_data_cache").select("*").execute()
        print(f"\n[Table: market_data_cache] Found {len(res.data)} records")
        if not res.data:
            print("[WARN] No market data found.")
        for item in res.data:
            print(f"  - {item['ticker']:<10} | Last: {item['last_price']} | Open: {item['open_price']} | Change: {item['change_percent']}%")
    except Exception as e:
         print(f"[ERROR] Failed to query market_data_cache: {e}")

    # 2. Macro Indicators
    try:
        res = supabase.table("macro_indicators").select("*").execute()
        print(f"\n[Table: macro_indicators] Found {len(res.data)} records")
        for item in res.data:
            print(f"  - {item['indicator_name']:<15} | Value: {item['value']} | Source: {item['source']}")
    except Exception as e:
         print(f"[ERROR] Failed to query macro_indicators: {e}")

    # 3. Strategy Log
    try:
        res = supabase.table("daily_strategy_log").select("*").order("log_date", desc=True).limit(1).execute()
        print(f"\n[Table: daily_strategy_log] Found {len(res.data)} records")
        for item in res.data:
            print(f"  - Date: {item['log_date']}")
            print(f"  - Pivot Points: {item['pivot_points']}")
    except Exception as e:
         print(f"[ERROR] Failed to query daily_strategy_log: {e}")

    print("\n--- Diagnostic Complete ---")

if __name__ == "__main__":
    main()
