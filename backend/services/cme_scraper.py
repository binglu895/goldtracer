"""
CME FedWatch Tool Scraper
Automatically fetches FOMC meeting probabilities from CME Group's official FedWatch tool.

NOTE: CME Group may block automated access. This scraper implements multiple fallback strategies:
1. Direct page HTML parsing
2. Alternative JSON endpoints
3. Graceful fallback to last known values
"""

import requests
import json
import re
from typing import Dict, Any, Optional
from datetime import datetime
from bs4 import BeautifulSoup

class CMEFedWatchScraper:
    def __init__(self):
        self.page_url = "https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html"
        # Alternative: Try the mobile/API endpoint
        self.alt_api_url = "https://www.cmegroup.com/content/dam/cmegroup/market-data/probability-tree/us_probabilities.json"
        
    def fetch_fedwatch_data(self) -> Optional[Dict[str, Any]]:
        """
        Fetch FedWatch probabilities using multiple strategies.
        
        Returns:
            Dict containing meeting probabilities or None if all methods failed
        """
        # Strategy 1: Try JSON endpoint (fastest if it works)
        result = self._try_json_endpoint()
        if result:
            return result
        
        # Strategy 2: Try HTML parsing
        result = self._try_html_parsing()
        if result:
            return result
        
        # All strategies failed
        print("[CME Scraper] All scraping methods failed")
        return None
    
    def _try_json_endpoint(self) -> Optional[Dict[str, Any]]:
        """Try fetching from CME's JSON data endpoint."""
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://www.cmegroup.com/'
        }
        
        try:
            print("[CME Scraper] Trying JSON endpoint...")
            response = requests.get(self.alt_api_url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return self._parse_json_data(data)
            else:
                print(f"[CME Scraper] JSON endpoint returned {response.status_code}")
                return None
                
        except Exception as e:
            print(f"[CME Scraper] JSON endpoint failed: {e}")
            return None
    
    def _try_html_parsing(self) -> Optional[Dict[str, Any]]:
        """Try parsing the HTML page directly."""
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
        
        try:
            print("[CME Scraper] Trying HTML parsing...")
            response = requests.get(self.page_url, headers=headers, timeout=15)
            
            if response.status_code != 200:
                print(f"[CME Scraper] HTML page returned {response.status_code}")
                return None
            
            # Look for embedded JSON data in the HTML
            # CME often embeds data in <script> tags
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Search for script tags containing FedWatch data
            for script in soup.find_all('script'):
                if script.string and 'probabilities' in script.string.lower():
                    # Try to extract JSON from the script
                    match = re.search(r'var\s+fedWatchData\s*=\s*({.*?});', script.string, re.DOTALL)
                    if match:
                        data = json.loads(match.group(1))
                        return self._parse_json_data(data)
            
            print("[CME Scraper] Could not find FedWatch data in HTML")
            return None
            
        except Exception as e:
            print(f"[CME Scraper] HTML parsing failed: {e}")
            return None
    
    def _parse_json_data(self, data: Dict) -> Optional[Dict[str, Any]]:
        """
        Parse CME data structure (flexible parser for multiple formats).
        """
        try:
            # CME data can have different structures, handle multiple cases
            
            # Format 1: Array of meetings
            if isinstance(data, list) and len(data) > 0:
                next_meeting = data[0]
            elif 'meetings' in data:
                next_meeting = data['meetings'][0]
            elif 'data' in data and isinstance(data['data'], list):
                next_meeting = data['data'][0]
            else:
                print(f"[CME Scraper] Unknown data structure: {list(data.keys())}")
                return None
            
            # Extract meeting date
            meeting_date = next_meeting.get('date') or next_meeting.get('meetingDate') or "2026-03-18"
            
            # Extract probabilities (multiple possible field names)
            probs = next_meeting.get('probabilities') or next_meeting.get('rateProbs') or {}
            
            # Find current rate range and one-cut scenarios
            # Probabilities are usually keyed like "525-550", "500-525", etc.
            current_range_keys = ['525-550', '5.25-5.50', 'current']
            one_cut_keys = ['500-525', '5.00-5.25', 'oneCut']
            
            prob_pause = 0
            prob_cut = 0
            
            for key in current_range_keys:
                if key in probs:
                    prob_pause = float(probs[key])
                    break
            
            for key in one_cut_keys:
                if key in probs:
                    prob_cut = float(probs[key])
                    break
            
            if prob_pause == 0 and prob_cut == 0:
                # Couldn't parse, return None
                print(f"[CME Scraper] Could not extract probabilities from: {probs}")
                return None
            
            return {
                "meeting_date": meeting_date,
                "prob_pause": prob_pause,
                "prob_cut_25": prob_cut,
                "raw_data": probs,
                "source": "CME FedWatch Scraper",
                "fetched_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"[CME Scraper] JSON parse error: {e}")
            return None
    
    def get_next_meeting_info(self) -> Dict[str, Any]:
        """
        Get comprehensive information about the next FOMC meeting.
        
        Returns:
            Dict with meeting date, time, and probabilities
        """
        cme_data = self.fetch_fedwatch_data()
        
        if not cme_data:
            # Fallback to hardcoded values if scraping fails
            print("[CME Scraper] Failed to fetch live data, using fallback values")
            return {
                "meeting_date": "2026-03-18",
                "meeting_name": "3月18日议息会议",
                "meeting_time": "美东 14:00 / 北京次日 03:00",
                "meeting_datetime_utc": "2026-03-18T19:00:00Z",
                "prob_pause": 84.2,
                "prob_cut_25": 15.8,
                "implied_rate": 5.335,
                "current_rate": 5.375,
                "data_source": "Fallback (CME Unreachable)",
                "last_verified": datetime.now().strftime("%Y-%m-%d")
            }
        
        # Map CME date format to our format
        meeting_date_obj = datetime.strptime(cme_data['meeting_date'], "%Y-%m-%d")
        
        # Calculate implied rate from probabilities
        current_rate = 5.375
        prob_cut_decimal = cme_data['prob_cut_25'] / 100
        implied_rate = current_rate - (0.25 * prob_cut_decimal)
        
        return {
            "meeting_date": cme_data['meeting_date'],
            "meeting_name": f"{meeting_date_obj.month}月{meeting_date_obj.day}日议息会议",
            "meeting_time": "美东 14:00 / 北京次日 03:00",
            "meeting_datetime_utc": f"{cme_data['meeting_date']}T19:00:00Z",
            "prob_pause": round(cme_data['prob_pause'], 1),
            "prob_cut_25": round(cme_data['prob_cut_25'], 1),
            "implied_rate": round(implied_rate, 3),
            "current_rate": current_rate,
            "data_source": "CME FedWatch Live API",
            "last_verified": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }


# Standalone test function
if __name__ == "__main__":
    scraper = CMEFedWatchScraper()
    result = scraper.get_next_meeting_info()
    
    print("\n=== CME FedWatch Scraper Test ===")
    print(json.dumps(result, indent=2, ensure_ascii=False))
