
import os
import logging
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

class AIService:
    """
    General AI Service for miscellaneous tasks like behavioral analysis.
    Different from GeminiService as it uses the parsing features of the new SDK.
    """
    def __init__(self):
        # Fallback to GOOGLE_API_KEY if GEMINI_API_KEY isn't set
        self.api_key = os.getenv('GOOGLE_API_KEY') or os.getenv('GEMINI_API_KEY')
        self.client = None
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
                # Ensure we only use Gemini 3
                self.model_name = self._resolve_gemini3()
            except Exception as e:
                logger.error(f"Failed to initialize Gemini client: {e}")

    def _resolve_gemini3(self):
        """Finds the best available Gemini 3 Flash model."""
        target = 'gemini-3-flash-preview'
        try:
            available = [m.name.replace('models/', '') for m in self.client.models.list()]
            g3_models = [m for m in available if 'gemini-3' in m and 'flash' in m]
            if g3_models:
                target = g3_models[0]
                logger.info(f"Resolved Gemini 3 model: {target}")
        except:
            pass
        return target

    def analyze_behavior(self, trades_data):

        """
        Uses Gemini's multimodal reasoning to detect psychological patterns 
        in a user's trade history (e.g., revenge trading, cutting wins early).
        
        Args:
            trades_data (str): A string representation of the trade logs.
            
        Returns:
            dict: Structured JSON containing alerts, strengths, and projected yield.
        """
        if not self.client:
            return {
                "impulse_alerts": ["AI features require GOOGLE_API_KEY or GEMINI_API_KEY."],
                "strength_matrix": ["System is running in offline mode."],
                "projected_yield": "N/A"
            }

        prompt = f"""
        You are an expert Trading Psychologist and Risk Manager.
        Analyze the following trading history for patterns of emotional bias or strategy drift.
        
        Trade History:
        {trades_data}

        Identify:
        1. Impulse Alerts: Signs of FOMO, revenge trading, or over-leveraging.
        2. Strength Matrix: Behaviors that follow the rules and maintain edge.
        3. Projected Yield: Estimated monthly profit if historical win rate is maintained with 100% discipline.
        
        Return ONLY valid JSON in this exact schema:
        {{
            "impulse_alerts": ["alert 1", "alert 2", "alert 3"],
            "strength_matrix": ["strength 1", "strength 2", "strength 3"],
            "projected_yield": "$1,234.00"
        }}
        """

        try:
            # Strictly using Gemini 3 Flash for behavioral analysis
            # Medium thinking level provides a balance for pattern detection logic
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    thinking_config=types.ThinkingConfig(thinking_level="medium")
                )
            )

            return response.parsed
        except Exception as e:
            logger.error(f"Gemini 3 Behavioral Analysis Failure: {e}")
            import traceback
            traceback.print_exc()
            return {
                "impulse_alerts": ["AI behavioral engine error. Ensure Gemini 3 access."],
                "strength_matrix": ["Analysis unavailable."],
                "projected_yield": "N/A"
            }




# Singleton instance to be used across the app
ai_service = AIService()

