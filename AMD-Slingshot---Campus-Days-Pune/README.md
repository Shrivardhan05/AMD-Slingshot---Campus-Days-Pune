# Aura - Contextual Health and Nutrition Assistant

Aura is a very lightweight AI wellness assistant powered by Google Gemini and Google Places APIs. This repository uses vanilla HTML/CSS/JS frontend to stay extremely lean (< 1MB).

## Running Locally

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   Copy `.env.example` to `.env` and fill in your keys:
   - `GEMINI_API_KEY` (Gemini API)
   - `PLACES_API_KEY` (Google Places API)

4. Run the development server:
   ```bash
   python main.py
   ```

5. Open your browser and navigate to `http://localhost:8000/`.

## Running Tests

Execute tests via Pytest (make sure you install requirements first):
```bash
pytest test_main.py
```

## Deployment

Deploying serverlessly via Google Cloud Run:

```bash
gcloud run deploy aura-backend --source . --region us-central1 --allow-unauthenticated
```