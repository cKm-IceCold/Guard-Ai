import os
from google import genai
from google.genai import types
from django.conf import settings

class GeminiService:
    """
    Core AI Service for Guard AI.
    Handles communication with Google's Gemini models for:
    1. Checklist Generation: Distilling text into rules.
    2. Backtesting: Simulating performance on data.
    3. Logic Extraction: Converting text into quantitative parameters.
    """
    def __init__(self):
        import dotenv
        # Ensure environment variables are loaded (crucial for detached worker processes)
        dotenv.load_dotenv() 
        
        self.api_key = os.environ.get('GEMINI_API_KEY')
        if not self.api_key:
            print("WARNING: GEMINI_API_KEY not found in environment.")
        
        # Initialize Google GenAI Client
        self.client = genai.Client(api_key=self.api_key)
        
        # HACKATHON COMPLIANCE: Dynamically resolve Gemini 3 model identifiers.
        # This prevents 404s if Google updates the preview name (e.g., -preview -> -v1).
        self.models = self._resolve_gemini3_models()

    def _resolve_gemini3_models(self):
        """
        Queries the API to find all available Gemini 3 models.
        Strictly filters for 'gemini-3' to stay hackathon-compliant.
        """
        resolved = {
            'flash': 'gemini-3-flash-preview', # Default fallbacks
            'pro': 'gemini-3-pro-preview'
        }
        try:
            print("DEBUG: Resolving Gemini 3 models for this API key...")
            available = [m.name.replace('models/', '') for m in self.client.models.list()]
            
            # Look for the best Flash-equivalent in the Gemini 3 family
            flash_models = [m for m in available if 'gemini-3' in m and 'flash' in m]
            if flash_models:
                resolved['flash'] = flash_models[0]
                print(f"DEBUG: Found Gemini 3 Flash: {resolved['flash']}")
                
            # Look for the best Pro-equivalent in the Gemini 3 family
            pro_models = [m for m in available if 'gemini-3' in m and 'pro' in m]
            if pro_models:
                resolved['pro'] = pro_models[0]
                print(f"DEBUG: Found Gemini 3 Pro: {resolved['pro']}")
                
        except Exception as e:
            print(f"WARNING: Model resolution failed: {e}. Using defaults.")
            
        return resolved


    def generate_checklist(self, strategy_text):
        """
        Takes a natural language 'trading plan' and converts it into a 
        concise list of binary rules for the trader to follow.
        Uses Gemini 3 Flash for low-latency rule extraction.
        """
        prompt = f"""
        You are a professional Trading AI assistant. 
        Analyze the following trading strategy and convert it into a strict, executable checklist.
        
        Strategy Description: "{strategy_text}"
        
        Output format: JSON Array of strings.
        Example: ["RSI (14) is below 30", "Price is above 200 EMA", "Volume is 2x average"]
        Only return the JSON array, no markdown or text.
        """
        
        try:
            from google.genai import types
            # Strictly using Gemini 3 for the hackathon
            response = self.client.models.generate_content(
                model=self.models['flash'],
                contents=prompt,
                config=types.GenerateContentConfig(
                    # Using low thinking level for fast extraction of simple rules
                    thinking_config=types.ThinkingConfig(thinking_level="low")
                )
            )
            
            text = response.text.strip()
            # Remove potential AI 'chattiness' or markdown blocks
            if '```' in text:
                if '```json' in text:
                    text = text.split('```json')[1].split('```')[0]
                else:
                    text = text.split('```')[1].split('```')[0]
            
            return text.strip()

        except Exception as e:
            print(f"CRITICAL Gemini 3 Flash Error: {e}")
            # Log the specific error to help with hackathon troubleshooting
            import traceback
            traceback.print_exc()
            return '["AI Protocol Error: Ensure Gemini 3 API access is active."]'

    def run_backtest(self, strategy_description, history_meta, snapshots, logic_json):
        """
        Synthesizes a strategy's hypothetical performance by 
        analyzing historical price snapshots.
        """
        prompt = f"""
        You are a Systematic Trading AI.
        
        {history_meta}
        TREND SNAPSHOTS: {snapshots}
        STRATEGY LOGIC: {logic_json}
        
        TASK:
        1. Project performance across this dataset.
        2. Identify regions of success/failure.
        3. Provide systematic results: Win Rate, Total Profit, Max Drawdown.
        
        OUTPUT FORMAT (Strict JSON):
        {{
            "win_rate": 00.0,
            "total_profit": 00.0,
            "total_trades": 00,
            "benchmark_diff": 00.0,
            "summary": "Full analysis shows...",
            "trade_log": [...]
        }}
        """
        
        # Priority 1: Gemini 3 Pro (High Reasoning)
        # Priority 2: Gemini 3 Flash (Fallback if Pro is exhausted/throttled)
        for model_key in ['pro', 'flash']:
            try:
                from google.genai import types
                thinking = "high" if model_key == 'pro' else "medium"
                
                print(f"DEBUG: Attempting AI Backtest with {self.models[model_key]} (Thinking: {thinking})...")
                response = self.client.models.generate_content(
                    model=self.models[model_key],
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        thinking_config=types.ThinkingConfig(thinking_level=thinking)
                    )
                )
                
                text = response.text.strip()
                if '```' in text:
                    text = text.split('```json')[1].split('```')[0] if '```json' in text else text.split('```')[1].split('```')[0]
                return text.strip()
                
            except Exception as e:
                if "429" in str(e) and model_key == 'pro':
                    print("WARNING: Gemini 3 Pro Quota Exhausted. Falling back to Gemini 3 Flash...")
                    continue
                print(f"CRITICAL Gemini 3 {model_key.upper()} Backtest Failure: {e}")
                
        return '{"error": "AI Backtest Fail: Both Pro and Flash exhausted. Please retry in 60s."}'

    def extract_strategy_logic(self, strategy_description):
        """
        Deconstructs a text-based strategy into its specific indicator 
        requirements and entry conditions.
        """
        prompt = f"""
        Analyze this trading strategy: "{strategy_description}"
        Extract the core entry/exit logic into structured JSON.
        
        Example JSON:
        {{
            "indicators": [{{"name": "EMA", "period": 200}}],
            "entry_conditions": [{{"type": "price_above", "indicator": "ema200"}}]
        }}
        """
        
        try:
            from google.genai import types
            # Gemini 3 Flash is ideal for structured logic extraction
            response = self.client.models.generate_content(
                model=self.models['flash'],
                contents=prompt,
                config=types.GenerateContentConfig(
                    thinking_config=types.ThinkingConfig(thinking_level="medium")
                )
            )
            text = response.text.strip()
            if '```' in text:
                text = text.split('```json')[1].split('```')[0] if '```json' in text else text.split('```')[1].split('```')[0]
            return text.strip()
        except Exception as e:
            print(f"DEBUG: Gemini 3 Logic Extraction Failure: {e}")
            return '{ "error": "Logic extraction failed: Gemini 3 required" }'

    def generate_trader_bio(self, trade_summary_text):
        """
        Uses Gemini 3 to synthesize a professional 'Trader Bio' 
        based on historical performance and risk metrics.
        """
        prompt = f"""
        You are a Top-tier Hedge Fund Talent Scout.
        Write a concise, professional 1-paragraph biography (max 3 sentences) for a trader 
        based on the following performance data:
        
        {trade_summary_text}
        
        Focus on their discipline, risk management, and overall style.
        Sound prestigious but authentic.
        """
        
        try:
            from google.genai import types
            response = self.client.models.generate_content(
                model=self.models['flash'],
                contents=prompt,
                config=types.GenerateContentConfig(
                    thinking_config=types.ThinkingConfig(thinking_level="medium")
                )
            )
            return response.text.strip()
        except Exception as e:
            print(f"DEBUG: Bio Generation Failure: {e}")
            return "Professional Trader utilizing Guard AI risk protocols."

