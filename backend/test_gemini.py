import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load env directly
load_dotenv()

def test_gemini():
    api_key = os.environ.get('GEMINI_API_KEY')
    print(f"API Key present: {bool(api_key)}")
    if api_key:
        print(f"API Key prefix: {api_key[:5]}...")
    
    genai.configure(api_key=api_key)
    
    # The model currently used in services.py
    model_name = 'gemini-2.0-flash-lite'
    print(f"\nTesting model used in service: {model_name}")
    
    try:
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Generate a 3 item trading checklist.")
        print(f"Success! Response: {response.text}")
    except Exception as e:
        print(f"CRITICAL ERROR with {model_name}: {e}")
        
        print("\nListing ALL available models for this key:")
        try:
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    print(f"- {m.name}")
        except Exception as list_err:
            print(f"Could not list models: {list_err}")

if __name__ == "__main__":
    test_gemini()
