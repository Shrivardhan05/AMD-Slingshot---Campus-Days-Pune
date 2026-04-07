import pytest
from main import app
from unittest.mock import patch, MagicMock

@pytest.fixture
def client():
    app.config.update({"TESTING": True})
    with app.test_client() as client:
        yield client

@patch("main.GEMINI_API_KEY", "mocked_key")
@patch("main.requests.post")
def test_analyze_food(mock_post, client):
    # Setup mock response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {"text": '{"items": [{"name": "eggs", "protein": 12, "carbs": 1, "fats": 10, "calories": 140}], "total": {"protein": 12, "carbs": 1, "fats": 10, "calories": 140}}'}
                    ]
                }
            }
        ]
    }
    mock_post.return_value = mock_response

    response = client.post("/api/analyze-food", json={"text": "I ate two eggs"})
    
    assert response.status_code == 200
    data = response.json
    assert "items" in data
    assert data["items"][0]["name"] == "eggs"
    mock_post.assert_called_once()


@patch("main.PLACES_API_KEY", "mocked_key")
@patch("main.requests.post")
def test_recommend_meal(mock_post, client):
    # Setup mock response 
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "places": [
            {
                "displayName": {"text": "Healthy Bites"},
                "formattedAddress": "123 Main St",
                "rating": 4.5
            }
        ]
    }
    mock_post.return_value = mock_response
    
    response = client.post("/api/recommend-meal", json={
        "lat": 34.0,
        "lng": -118.0,
        "remaining_calories": 500,
        "remaining_protein": 50,
        "remaining_carbs": 20,
        "remaining_fats": 15
    })
    
    assert response.status_code == 200
    data = response.json
    assert "recommendations" in data
    assert len(data["recommendations"]) == 1
    assert data["recommendations"][0]["displayName"]["text"] == "Healthy Bites"
    assert "context_message" in data
