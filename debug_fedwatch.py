import os
import sys
from dotenv import load_dotenv

# Ensure backend can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from backend.services.calculator import fetch_yahoo_finance_raw, calc_fed_watch
except ImportError as e:
    print(f"Import Error: {e}")
    sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))
    from services.calculator import fetch_yahoo_finance_raw, calc_fed_watch

load_dotenv(dotenv_path=".env.local")

def main():
    print("=== FedWatch Data Source Debug ===\n")
    
    # 1. Fetch ZQ=F (30-Day Fed Funds Futures)
    print("Fetching ZQ=F (30-Day Fed Funds Futures)...")
    zq_raw = fetch_yahoo_finance_raw("ZQ=F", period="1d")
    
    if not zq_raw or 'meta' not in zq_raw:
        print("[ERROR] Failed to fetch ZQ=F data")
        return
    
    zq_price = zq_raw['meta'].get('regularMarketPrice')
    print(f"ZQ=F Current Price: {zq_price}")
    print(f"Implied Rate (100 - ZQ): {100 - zq_price if zq_price else 'N/A'}%")
    
    # 2. Calculate FedWatch probabilities
    print("\n--- Calculating FedWatch Probabilities ---")
    fed_data = calc_fed_watch(zq_price)
    
    print(f"Meeting: {fed_data.get('meeting_name')}")
    print(f"Current Target Rate: {fed_data.get('current_rate')}%")
    print(f"Implied Rate from ZQ=F: {fed_data.get('implied_rate')}%")
    print(f"Probability of Pause (No Change): {fed_data.get('prob_pause')}%")
    print(f"Probability of 25BP Cut: {fed_data.get('prob_cut_25')}%")
    
    # 3. Compare with CME FedWatch
    print("\n--- Comparison with CME FedWatch Tool ---")
    print("Official FedWatch (as of image):")
    print("  - Maintain 350-375 (5.25-5.50%): 84.2%")
    print("  - Cut to 325-350 (5.00-5.25%): 15.8%")
    
    print("\nOur Calculation:")
    print(f"  - Maintain (5.25-5.50%): {fed_data.get('prob_pause')}%")
    print(f"  - Cut 25BP: {fed_data.get('prob_cut_25')}%")
    
    # 4. Diagnose the issue
    print("\n--- Diagnostic Analysis ---")
    diff = fed_data.get('current_rate', 5.375) - fed_data.get('implied_rate', 0)
    print(f"Rate Difference: {diff}%")
    print(f"Expected: Small positive number (~0.04% for 15.8% cut probability)")
    print(f"Actual: {diff}%")
    
    if abs(diff) > 1.0:
        print("\n[WARNING] Rate difference is abnormally large!")
        print("Possible causes:")
        print("1. ZQ=F might not be the correct contract for March meeting")
        print("2. Yahoo Finance data for ZQ=F might be incorrect")
        print("3. Need to use specific month contract (e.g., FFH26 for March)")
    
    # 5. Try fetching alternative data source
    print("\n--- Attempting Alternative Data Sources ---")
    print("Trying ^TNX (10-Year Treasury)...")
    tnx_raw = fetch_yahoo_finance_raw("^TNX", period="1d")
    if tnx_raw and 'meta' in tnx_raw:
        tnx_price = tnx_raw['meta'].get('regularMarketPrice')
        print(f"^TNX: {tnx_price}%")
    
    print("\n=== Debug Complete ===")

if __name__ == "__main__":
    main()
