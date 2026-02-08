import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv

# Import services
from .services.analysis_engine import analyze_market_state

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

@app.post("/api/ai/diagnose")
async def ai_diagnose(context: Dict[str, Any]):
    """
    Placeholder for DeepSeek/Google LLM call.
    """
    return {
        "summary": "AI diagnosis based on current terminal state...",
        "confidence": 0.92
    }
