
import time
import schedule
import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# Ensure backend can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.services.sync_service import GoldDataSyncer

load_dotenv(dotenv_path=".env.local")

def run_sync():
    print(f"[{time.strftime('%H:%M:%S')}] Starting sync...")
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        print("Error: Supabase credentials missing")
        return
        
    try:
        supabase = create_client(url, key)
        syncer = GoldDataSyncer(supabase)
        syncer.sync_all()
        syncer.sync_institutional()
        print(f"[{time.strftime('%H:%M:%S')}] Sync completed.")
    except Exception as e:
        print(f"Sync error: {e}")

def main():
    print("--- Goldtracer PRO Data Scheduler ---")
    print("Running sync every 5 minutes...")
    
    # Run once on startup
    run_sync()
    
    schedule.every(5).minutes.do(run_sync)
    
    while True:
        schedule.run_pending()
        time.sleep(1)

if __name__ == "__main__":
    main()
