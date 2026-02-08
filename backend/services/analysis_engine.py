from typing import Dict, List, Any

def analyze_market_state(
    macro_data: Dict[str, Any], 
    institutional_data: Dict[str, Any], 
    market_cache: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Comprehensive SOP Analysis Engine.
    Returns:
    - Macro Segment: Bullish/Bearish/Divergence
    - Alert Segment: Warnings (premium, crowded, etf_divergence)
    """
    
    # 1. Macro Segment Logic
    # Example logic: if real yield down + rate cut prob up -> Bullish
    real_yield = macro_data.get("10Y_Real_Yield", 0)
    fed_prob_cut = macro_data.get("Fed_Cut_Probability", 0) # Assumed key
    
    macro_sentiment = "Neutral"
    if real_yield < 1.5 and fed_prob_cut > 50:
        macro_sentiment = "Bullish"
    elif real_yield > 3.0:
        macro_sentiment = "Bearish"
    
    # 2. Alert Segment
    premium = macro_data.get("Domestic_Premium", 0)
    cftc_net_long = institutional_data.get("CFTC_Net_Long", 0)
    gld_holding_change = institutional_data.get("GLD_Change", 0)
    price_change = 0
    # Find gold price change in cache
    for item in market_cache:
        if item.get("ticker") == "GC=F":
            price_change = item.get("change_percent", 0)
            break

    alerts = {
        "premium_warning": premium > 15,
        "crowded_warning": cftc_net_long > 200000,
        "etf_divergence": price_change > 0 and gld_holding_change < 0
    }
    
    return {
        "macro_segment": {
            "sentiment": macro_sentiment,
            "logic": "Based on Real Yield and Fed Watch probabilities"
        },
        "alerts": alerts
    }
