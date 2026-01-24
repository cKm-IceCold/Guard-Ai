import os
from google import genai
from dotenv import load_dotenv

# Load env directly
load_dotenv()

def test_gemini():
    api_key = os.environ.get('GEMINI_API_KEY')
    print(f"API Key present: {bool(api_key)}")
    if api_key:
        print(f"API Key prefix: {api_key[:5]}...")
    else:
        print("ERROR: GEMINI_API_KEY not found in .env")
        return

    client = genai.Client(api_key=api_key)
    
    # Try the most stable one first
    model_name = 'gemini-1.5-flash'
    print(f"\nTesting model: {model_name}")
    
    try:
        response = client.models.generate_content(
            model=model_name,
            contents="Hello! Generate a 3 item trading checklist."
        )
        print(f"SUCCESS! Response: {response.text}")
    except Exception as e:
        print(f"FAILED with {model_name}: {e}")
        
        print("\nListing ALL available models for this key (Discovery):")
        try:
            for m in client.models.list():
                print(f"- {m.name}")
        except Exception as list_err:
            print(f"Could not list models: {list_err}")

if __name__ == "__main__":
    test_gemini()
