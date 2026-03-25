import os
import time
import datetime
import numpy as np
import pandas as pd
import requests
import joblib
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import firebase_admin
from firebase_admin import auth

# Load the trained machine learning model from the ml directory
MODEL_PATH = os.path.join(settings.BASE_DIR.parent, "ml", "models", "pollution_xgboost_model.pkl")
try:
    model = joblib.load(MODEL_PATH)
except Exception as e:
    model = None
    print(f"Warning: Could not load model from {MODEL_PATH}. Error: {e}")

def get_google_aqi_data(lat, lon, api_key):
    """Fetches Air Quality Data from Google Maps Air Quality API
    and combines it with free weather data from Open-Meteo."""
    
    # 1. Fetch free weather & lag data from Open-Meteo
    fallback_pm25, features = get_openmeteo_data(lat, lon)
    
    # 2. Try fetching better live PM2.5 data from Google Maps AQI API
    google_pm25 = fallback_pm25
    try:
        google_url = f"https://airquality.googleapis.com/v1/currentConditions:lookup?key={api_key}"
        payload = {
            "location": {"latitude": lat, "longitude": lon},
            "extraComputations": ["POLLUTANT_CONCENTRATION"]
        }
        res = requests.post(google_url, json=payload).json()
        
        # Parse Google API Response for PM2.5
        if "pollutants" in res:
            for pollutant in res["pollutants"]:
                if pollutant.get("code") == "pm25" and "concentration" in pollutant:
                    google_pm25 = pollutant["concentration"]["value"]
                    break
    except Exception as e:
        print(f"Google AQI API Error (falling back to Open-Meteo): {e}")

    # Overwrite the PM2.5 value (feature index 2) with the active source
    features[2] = google_pm25
    
    return google_pm25, features


def get_openmeteo_data(lat, lon):
    """Fetches Live Data from Open-Meteo (No API Key required)"""
    # 1. Weather
    weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,dew_point_2m,surface_pressure,wind_speed_10m,wind_direction_10m"
    w_res = requests.get(weather_url).json()
    curr = w_res["current"]

    TEMP = curr["temperature_2m"]
    PRES = curr["surface_pressure"]
    DEWP = curr["dew_point_2m"]
    WSPM = curr["wind_speed_10m"] / 3.6  # km/h to m/s
    wind_deg = curr["wind_direction_10m"]

    wind_rad = np.deg2rad(wind_deg)
    wind_u = WSPM * np.cos(wind_rad)
    wind_v = WSPM * np.sin(wind_rad)

    dt = datetime.datetime.now()
    day_of_week = dt.weekday()
    month = dt.month

    # 2. Air Quality
    aq_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&current=pm2_5&hourly=pm2_5&past_days=1"
    aq_res = requests.get(aq_url).json()

    current_pm25 = aq_res["current"]["pm2_5"]
    hourly_time = aq_res["hourly"]["time"]
    hourly_pm25 = [p if p is not None else current_pm25 for p in aq_res["hourly"]["pm2_5"]]

    try:
        idx = hourly_time.index(aq_res["current"]["time"])
        pm25_lag1 = hourly_pm25[idx-1]
        pm25_lag2 = hourly_pm25[idx-2]
        pm25_lag3 = hourly_pm25[idx-3]
    except Exception:
        pm25_lag1 = pm25_lag2 = pm25_lag3 = current_pm25

    pm25_roll3 = (pm25_lag1 + pm25_lag2 + pm25_lag3) / 3

    return current_pm25, [
        lat, lon, current_pm25, TEMP, PRES, DEWP, WSPM,
        wind_u, wind_v, day_of_week, month,
        pm25_lag1, pm25_lag2, pm25_lag3, pm25_roll3
    ]


# Utility for verifying firebase token
def verify_firebase_token(request):
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    token = auth_header.split('Bearer ')[1]
    try:
        # Verify token using Firebase Admin SDK
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        print(f"Token verification failed: {e}")
        return None

@api_view(['POST'])
def predict(request):
    data = request.data
    lat = float(data.get("lat", 39.982))
    lon = float(data.get("lon", 116.397))

    api_key = os.getenv("GOOGLE_CLOUD_API_KEY", "")

    try:
        # Check if user has provided a real Google API key
        if api_key and api_key != "your_google_api_key_here":
            current_pm25, features = get_google_aqi_data(lat, lon, api_key)
            source = "Google Maps Air Quality API"
        else:
            # Fallback to completely free open-meteo API with no key needed
            current_pm25, features = get_openmeteo_data(lat, lon)
            source = "Open-Meteo (No Key Needed)"
            
        if model is None:
            return Response({"error": "Model not loaded correctly. Ensure models/pollution_xgboost_model.pkl exists."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Predict Future PM2.5
        feature_names = [
            "latitude", "longitude", "PM2.5", "TEMP", "PRES", "DEWP", "WSPM",
            "wind_u", "wind_v", "day_of_week", "month",
            "PM25_lag1", "PM25_lag2", "PM25_lag3", "PM25_roll3"
        ]
        input_df = pd.DataFrame([features], columns=feature_names)
        prediction = float(f"{model.predict(input_df)[0]:.2f}")
        current_pm25 = float(f"{current_pm25:.2f}")

        response_data = {
            "success": True,
            "source": source,
            "current_pm25": current_pm25,
            "predicted_pm25": prediction,
            "lat": lat,
            "lon": lon,
            "timestamp": datetime.datetime.now().isoformat(),
            "ml_model_features": dict(zip(feature_names, features))
        }

        # Store the required data for the model and the prediction result into Firebase Firestore
        try:
            from firebase_admin import firestore
            db = firestore.client()
            db.collection(u'predictions').add(response_data)
        except Exception as e:
            print(f"Failed to store prediction to Firestore: {e}")

        return Response(response_data)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def auth_protected_data(request):
    """
    Example protected endpoint that checks Firebase authentication.
    """
    user = verify_firebase_token(request)
    if not user:
        return Response({"error": "Unauthorized. Invalid or missing Firebase token."}, status=status.HTTP_401_UNAUTHORIZED)
    
    return Response({
        "message": "You have accessed protected data successfully!",
        "uid": user.get("uid"),
        "email": user.get("email")
    })
