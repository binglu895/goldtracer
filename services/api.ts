
const API_BASE_URL = 'http://localhost:8000';

export interface DashboardState {
    tickers: any[];
    macro: any[];
    institutional: any[];
    today_strategy: {
        log_date: string;
        ai_summary: string;
        pivot_points: any;
        trade_advice: any;
    };
    analysis_sop: any;
}

export const fetchDashboardState = async (): Promise<DashboardState | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard/summary`);
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Failed to fetch dashboard state:", error);
        return null;
    }
};
