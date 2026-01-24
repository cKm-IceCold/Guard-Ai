import os
import google.generativeai as genai
from django.conf import settings

class GeminiService:
    def __init__(self):
        # Configure API Key
        import dotenv
        dotenv.load_dotenv() # Ensure loaded in worker process
        
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            print("WARNING: GEMINI_API_KEY not found in env.")
        
        genai.configure(api_key=api_key)
        # We will instantiate models on the fly to try fallbacks

    def generate_checklist(self, strategy_text):
        """
        Converts a natural language strategy into a strict checklist.
        """
        prompt = f"""
        You are a professional Trading Algo Architect. 
        Analyze the following trading strategy description and convert it into a strict, executable checklist.
        
        Strategy Description: "{strategy_text}"
        
        Output format: JSON Array of strings.
        Example: ["RSI (14) is below 30", "Price is above 200 EMA", "Volume is 2x average"]
        Only return the JSON array, no markdown or text.
        """
        
        # Priority list of models to try (using exact aliases from list_models)
        models_to_try = [
            'gemini-2.0-flash',        # Try the powerful one first
            'gemini-flash-latest',     # Stable alias for 1.5 Flash
            'gemini-pro-latest',       # Stable alias for 1.0 Pro
            'gemini-2.0-flash-lite'    # Backup
        ]

        for model_name in models_to_try:
            try:
                print(f"DEBUG: Trying Gemini Model: {model_name}...")
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                print(f"DEBUG: Success with {model_name}")
                
                # Robust cleanup
                text = response.text.strip()
                if text.startswith('```json'):
                    text = text.split('```json')[1]
                if text.startswith('```'):
                    text = text.split('```')[1]
                if text.endswith('```'):
                    text = text.rsplit('```', 1)[0]
                
                return text.strip()
            except Exception as e:
                print(f"DEBUG: Failed with {model_name}: {e}")
                continue # Try next model
        
        # If all failed
        print("CRITICAL: All Gemini models failed.")
        return '["System Error: AI Service Unavailable. Check backend logs."]'
