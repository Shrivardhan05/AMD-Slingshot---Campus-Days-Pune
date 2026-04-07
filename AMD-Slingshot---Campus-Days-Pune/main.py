import os
import json
from flask import Flask, request, jsonify
import requests
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='frontend')

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
PLACES_API_KEY = os.getenv("PLACES_API_KEY")

@app.route('/api/analyze-food', methods=['POST'])
def analyze_food():
    if not GEMINI_API_KEY:
        return jsonify({"error": "Gemini API key not configured"}), 500
    
    data = request.get_json()
    text = data.get("text", "") if data else ""
    
    prompt = f"""
    You are a nutrition assistant. The user input is: "{text}"
    Extract the food items and estimate their macronutrients and calories in grams.
    Return ONLY a valid JSON object matching this schema exactly:
    {{
        "items": [
            {{"name": "food name", "protein": 0, "carbs": 0, "fats": 0, "calories": 0}}
        ],
        "total": {{"protein": 0, "carbs": 0, "fats": 0, "calories": 0}}
    }}
    Do not output any markdown formatting, only pure JSON.
    """
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.1}
    }
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        result = response.json()
        
        # Parse the JSON generated inside the content
        try:
            text_response = result['candidates'][0]['content']['parts'][0]['text']
            # Clean up potential markdown formatting that still leaks
            text_response = text_response.replace("```json", "").replace("```", "").strip()
            parsed_data = json.loads(text_response)
            return jsonify(parsed_data)
        except (KeyError, IndexError, json.JSONDecodeError):
            return jsonify({"error": "Gemini returned invalid or unexpected response"}), 500
            
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Failed to communicate with Gemini API: {str(e)}"}), 500

@app.route('/api/recommend-meal', methods=['POST'])
def recommend_meal():
    if not PLACES_API_KEY:
        return jsonify({"error": "Places API key not configured"}), 500
        
    data = request.get_json() or {}
    lat = data.get("lat")
    lng = data.get("lng")
    rem_protein = data.get("remaining_protein", 0)
    rem_carbs = data.get("remaining_carbs", 0)
    
    url = "https://places.googleapis.com/v1/places:searchText"
    
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": PLACES_API_KEY,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.rating,places.priceLevel,places.googleMapsUri"
    }
    
    payload = {
        "textQuery": "healthy restaurant",
        "locationBias": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": 5000.0
            }
        },
        "maxResultCount": 3
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        places_data = response.json()
        places = places_data.get("places", [])
        
        context = "Focus on a balanced meal to meet your remaining macros."
        if rem_protein > 40:
            context = "You need a good amount of protein! Look for chicken, fish, or tofu dishes."
        elif rem_carbs < 30:
            context = "You're low on remaining carbs. Try to find a salad or low-carb option."
            
        return jsonify({
            "recommendations": places,
            "context_message": context
        })
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Failed to recommend meal: {str(e)}"}), 500

# Mount frontend
@app.route('/')
def serve_index():
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    return app.send_static_file(path)

# Used for Google Cloud Run
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    # Production uses 0.0.0.0 bind, debug set to false
    app.run(host='0.0.0.0', port=port, debug=False)
