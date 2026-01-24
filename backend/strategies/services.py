import os
from google import genai
from django.conf import settings

class GeminiService:
    def __init__(self):
        # Configure API Key
        import dotenv
        dotenv.load_dotenv() # Ensure loaded in worker process
        
        self.api_key = os.environ.get('GEMINI_API_KEY')
        if not self.api_key:
            print("WARNING: GEMINI_API_KEY not found in env.")
        
        # Using the new google-genai SDK
        self.client = genai.Client(api_key=self.api_key)

    def generate_checklist(self, strategy_text):
        """
        Converts a natural language strategy into a strict checklist.
        """
        prompt = f"""
        You are a professional Trading AI assistant. 
        Analyze the following trading strategy and convert it into a strict, executable checklist.
        
        Strategy Description: "{strategy_text}"
        
        Output format: JSON Array of strings.
        Example: ["RSI (14) is below 30", "Price is above 200 EMA", "Volume is 2x average"]
        Only return the JSON array, no markdown or text.
        """
        
        # Priority list of models based on user's discovery results
        models_to_try = [
            'gemini-2.0-flash',        # Found in discovery
            'gemini-flash-latest',     # Found in discovery
            'gemini-2.5-flash',        # Found in discovery (high performance)
            'gemini-pro-latest'        # Found in discovery
        ]

        # One-time attempt to list models if first attempt fails
        discovery_done = False

        for i, model_name in enumerate(models_to_try):
            try:
                print(f"DEBUG: Trying Gemini Model: {model_name}...")
                response = self.client.models.generate_content(
                    model=model_name,
                    contents=prompt
                )
                print(f"DEBUG: Success with {model_name}")
                
                text = response.text.strip()
                # Clean up potential markdown formatting
                if '```' in text:
                    if '```json' in text:
                        text = text.split('```json')[1].split('```')[0]
                    else:
                        text = text.split('```')[1].split('```')[0]
                
                return text.strip()

            except Exception as e:
                print(f"DEBUG: Failed with {model_name}: {e}")
                
                # Dynamic discovery if we hit failures
                if not discovery_done and i == 0:
                    try:
                        print("DEBUG: Attempting model discovery...")
                        discovered = []
                        for m in self.client.models.list():
                            name = m.name.replace('models/', '')
                            if 'flash' in name or 'pro' in name:
                                discovered.append(name)
                        
                        print(f"DEBUG: Discovered: {discovered}")
                        # Filter for generation capable models and prepend them
                        for d in reversed(discovered):
                            if d not in models_to_try:
                                models_to_try.insert(1, d)
                        discovery_done = True
                    except Exception as list_err:
                        print(f"DEBUG: Model discovery failed: {list_err}")
                
                continue 
        
        # If all failed
        print("CRITICAL: All Gemini models failed.")
        return '["System Error: AI Service Unavailable. Please check your API key in the backend dashboard."]'
