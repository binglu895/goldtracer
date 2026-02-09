-- Goldtracer PRO Supabase Schema Definition

-- 1. Market Data Cache: Real-time & High Frequency
CREATE TABLE market_data_cache (
    id SERIAL PRIMARY KEY,
    ticker TEXT UNIQUE NOT NULL, -- GC=F, ^TNX, DXY, ZQ=F, USDCNY=X, 000819.SS
    last_price DECIMAL,
    open_price DECIMAL,
    high_price DECIMAL,
    low_price DECIMAL,
    change_percent DECIMAL,
    cached_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB -- Flexible storage for extra API fields
);

-- 2. Macro Indicators: Mid/Low Frequency calculations
CREATE TABLE macro_indicators (
    id SERIAL PRIMARY KEY,
    indicator_name TEXT UNIQUE NOT NULL, -- 10Y_Real_Yield, Fed_Spread, Domestic_Premium, Interest_GDP_Ratio
    value DECIMAL,
    unit TEXT,
    is_stale BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    source TEXT -- FRED, Calculation, PBoC
);

-- 3. Institutional & Sentiment Data
CREATE TABLE institutional_stats (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL, -- CFTC, GLD_ETF, CentralBank
    label TEXT NOT NULL, -- e.g., "Managed Money Net Long", "PBoC Gold Reserve"
    value DECIMAL,
    change_value DECIMAL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category, label)
);

-- 4. Daily Strategy & AI Logs
CREATE TABLE daily_strategy_log (
    id SERIAL PRIMARY KEY,
    log_date DATE UNIQUE DEFAULT CURRENT_DATE,
    ai_summary TEXT,
    pivot_points JSONB, -- { "P": 2332.1, "R1": 2354.8, ... }
    trade_advice JSONB, -- { "entry": 2338.5, "tp": 2375.0, "sl": 2322.0, "confidence": 0.884 }
    fedwatch JSONB, -- { "meeting_date": "2026-03-18", "prob_pause": 82.4, "prob_cut_25": 17.6, ... }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Time Series Data (for Charts)
CREATE TABLE market_history (
    id BIGSERIAL PRIMARY KEY,
    ticker TEXT NOT NULL,
    price DECIMAL NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_market_history_ticker_time ON market_history(ticker, timestamp DESC);

-- 6. Macro History Data (3-Line Chart: Nominal, Breakeven, Real)
CREATE TABLE macro_history (
    id SERIAL PRIMARY KEY,
    log_date DATE UNIQUE NOT NULL,
    nominal_yield DECIMAL,
    breakeven_inflation DECIMAL,
    real_yield DECIMAL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_macro_history_date ON macro_history(log_date DESC);

-- 7. Real-time News & Intel Stream
CREATE TABLE news_stream (
    id SERIAL PRIMARY KEY,
    msg_type TEXT DEFAULT 'FLASH', -- FLASH, DATA, NOTICE, ALERT
    title TEXT NOT NULL,
    content TEXT,
    source TEXT,
    url TEXT,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(title, published_at)
);

-- Helper table for "Mega-Endpoint" quick fetch
DROP VIEW IF EXISTS latest_dashboard_state;
CREATE VIEW latest_dashboard_state AS
SELECT 
    (SELECT json_agg(m) FROM market_data_cache m) as tickers,
    (SELECT json_agg(i) FROM macro_indicators i) as macro,
    (SELECT json_agg(s) FROM institutional_stats s) as institutional,
    (SELECT row_to_json(d) FROM daily_strategy_log d WHERE log_date = CURRENT_DATE) as today_strategy,
    (SELECT json_agg(n) FROM (SELECT * FROM news_stream ORDER BY published_at DESC LIMIT 15) n) as news;


