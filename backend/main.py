import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv

# Import services
from .services.analysis_engine import analyze_market_state
from .services.sync_service import GoldDataSyncer

load_dotenv()

app = FastAPI(title="Goldtracer PRO Backend API")

# Configure CORS for Vercel & local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase Setup
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL else None

@app.get("/")
async def root():
    return {"status": "Goldtracer API Online"}

@app.get("/api/dashboard/summary")
@app.get("/api/v1/full-state")
async def get_dashboard_summary():
    """
    The 'Mega-Endpoint' returns everything needed for one-page rendering.
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase connection not configured")
    
    try:
        # Fetch from the helper view defined in SQL schema
        response = supabase.table("latest_dashboard_state").select("*").execute()
        if not response.data:
            return {"error": "No data found"}
        
        state = response.data[0]
        
        # Inject SOP Analysis on the fly or fetch pre-calculated (using on the fly for logic demo)
        analysis = analyze_market_state(
            macro_data={i['indicator_name']: i['value'] for i in (state.get('macro') or [])},
            institutional_data={s['label']: s['value'] for s in (state.get('institutional') or [])},
            market_cache=state.get('tickers') or []
        )
        
        state['analysis_sop'] = analysis
        return state
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/charts/{category}")
async def get_charts(category: str):
    """
    Return time series data for specific categories.
    """
    # Logic to fetch from market_history based on category mappings
    # Placeholder for brevity
    return {"category": category, "data": []}

@app.get("/api/macro/history")
async def get_macro_history(range: str = "1mo"):
    if not supabase:
         raise HTTPException(status_code=500, detail="Supabase connection not configured")
    
    from datetime import datetime, timedelta
    now = datetime.now()
    days_map = {"1d": 1, "1w": 7, "1mo": 30, "3mo": 90, "1y": 365}
    days = days_map.get(range, 30)
    cutoff = (now - timedelta(days=days)).strftime('%Y-%m-%d')
    
    try:
        response = supabase.table("macro_history").select("*").gte("log_date", cutoff).order("log_date").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cron/sync")
async def trigger_sync(full: bool = False):
    """
    CRON JOB Endpoint for Vercel.
    """
    if not supabase:
         raise HTTPException(status_code=500, detail="Supabase connection not configured")
    
    try:
        syncer = GoldDataSyncer(supabase)
        report = syncer.sync_all()
        inst_report = syncer.sync_institutional()
        
        # Sync history only once a day or if forced
        hist_report = syncer.sync_macro_history(days=365 if full else 7)

        
        report["updated"].extend(inst_report["updated"])
        if hist_report["updated"] > 0:
            report["updated"].append(f"macro_history_{hist_report['updated']}_rows")
            
        news_report = syncer.sync_news()
        if news_report["updated"] > 0:
             report["updated"].append(f"news_{news_report['updated']}_items")

        report["errors"].extend(inst_report["errors"])
        report["errors"].extend(hist_report["errors"])
        report["errors"].extend(news_report["errors"])

        
        return {
            "status": "Sync executed successfully",
            "report": report
        }
    except Exception as e:
        status_code = 500
        # If it's a timeout or rate limit, we might want to return 200 or 202 to avoid Vercel retrying aggressively
        # but let's stick to 500 for critical failures.
        raise HTTPException(status_code=status_code, detail=f"Sync failed: {str(e)}")

from pydantic import BaseModel
class FedWatchUpdate(BaseModel):
    prob_pause: float
    prob_cut_25: float
    meeting_date: str = "2026-03-18"

@app.post("/api/admin/fedwatch/update")
async def update_fedwatch_manually(data: FedWatchUpdate):
    """
    Manually update FedWatch probabilities in the database.
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase connection not configured")
    
    from datetime import datetime
    today = datetime.now().strftime('%Y-%m-%d')
    last_updated = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Calculate implied rate
    current_rate = 5.375
    implied_rate = current_rate - (0.25 * (data.prob_cut_25 / 100))
    
    fed_payload = {
        "meeting_date": data.meeting_date,
        "meeting_name": f"{data.meeting_date[5:7].lstrip('0')}月{data.meeting_date[8:10].lstrip('0')}日议息会议",
        "meeting_time": "美东 14:00 / 北京次日 03:00",
        "meeting_datetime_utc": f"{data.meeting_date}T19:00:00Z",
        "prob_pause": round(data.prob_pause, 1),
        "prob_cut_25": round(data.prob_cut_25, 1),
        "implied_rate": round(implied_rate, 3),
        "current_rate": current_rate,
        "data_source": "CME FedWatch (Manual Update)",
        "last_verified": last_updated
    }
    
    try:
        # Check if record exists for today
        res = supabase.table("daily_strategy_log").select("*").eq("log_date", today).execute()
        
        if res.data:
            # Update existing record
            supabase.table("daily_strategy_log").update({"fedwatch": fed_payload}).eq("log_date", today).execute()
        else:
            # Insert new record for today
            supabase.table("daily_strategy_log").insert({
                "log_date": today,
                "fedwatch": fed_payload
            }).execute()
            
        return {"status": "success", "fedwatch": fed_payload}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database update failed: {str(e)}")
