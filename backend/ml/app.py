import os
import time
import datetime
import numpy as np
import pandas as pd
import requests
import joblib
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables (from root .env to share keys with frontend)
root_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.env"))
load_dotenv(root_env)
load_dotenv() # Also load local .env if exists

app = Flask(__name__)
# Enable CORS for all routes (to accommodate various local ports like 8080, 8081, 5173 etc)
CORS(app)

# ──────────────────────────────────────────────────────────────────────────────
# Firebase / Firestore (Gracefully enabled with 8hr Auto-Delete)
# ──────────────────────────────────────────────────────────────────────────────
db = None
try:
    import firebase_admin
    from firebase_admin import credentials, firestore

    # Using the path provided by the user in backend/server/
    cred_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../server/firebase_credentials.json"))
    
    if os.path.exists(cred_path):
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        db = firestore.client()
        print(f"✅ Firebase connected using: {cred_path}")
    else:
        print(f"⚠️  Firebase credentials not found at '{cred_path}'.")
except Exception as e:
    print(f"⚠️  Firebase init error: {e}. Firestore storage disabled.")

def cleanup_old_records(hours=8):
    """Automatically delete records older than X hours to keep storage lean."""
    if db is None: return
    try:
        now = datetime.datetime.utcnow()
        cutoff = now - datetime.timedelta(hours=hours)
        
        # Delete old records
        docs = db.collection("aqi_readings").where("timestamp", "<", cutoff.isoformat() + "Z").stream()
        count = 0
        for doc in docs:
            doc.reference.delete()
            count += 1
        if count > 0:
            print(f"🧹 Cleaned up {count} old records (older than {hours}h).")
    except Exception as e:
        print(f"⚠️ Cleanup error: {e}")


# ──────────────────────────────────────────────────────────────────────────────
# ML Model
# ──────────────────────────────────────────────────────────────────────────────
MODEL_PATH = "models/pollution_xgboost_model.pkl"
model = None
try:
    model = joblib.load(MODEL_PATH)
    print(f"✅ ML model loaded from {MODEL_PATH}")
except Exception as e:
    print(f"⚠️  Could not load model: {e}. Predictions will use statistical fallback.")


# ──────────────────────────────────────────────────────────────────────────────
# Helper utilities
# ──────────────────────────────────────────────────────────────────────────────
AQI_BREAKPOINTS = [
    (0,   50,  "Good",                       "Air quality is satisfactory. Enjoy outdoor activities."),
    (51,  100, "Moderate",                   "Sensitive individuals should consider reducing prolonged outdoor exertion."),
    (101, 150, "Unhealthy for Sensitive Groups", "Members of sensitive groups may experience health effects. Limit outdoor exertion."),
    (151, 200, "Unhealthy",                  "Everyone may begin to experience health effects. Avoid prolonged outdoor exertion."),
    (201, 300, "Very Unhealthy",             "Health alert: everyone may experience serious health effects. Stay indoors."),
    (301, 500, "Hazardous",                  "Health warnings of emergency conditions. The entire population is at risk."),
]

def aqi_category(aqi: float):
    for lo, hi, cat, rec in AQI_BREAKPOINTS:
        if lo <= aqi <= hi:
            return cat, rec
    return "Hazardous", "Health warnings of emergency conditions."


def pm25_to_aqi(pm25: float) -> int:
    """Convert PM2.5 concentration (µg/m³) to US AQI using EPA formula."""
    breakpoints = [
        (0.0,   12.0,   0,   50),
        (12.1,  35.4,  51,  100),
        (35.5,  55.4, 101,  150),
        (55.5, 150.4, 151,  200),
        (150.5, 250.4, 201, 300),
        (250.5, 350.4, 301, 400),
        (350.5, 500.4, 401, 500),
    ]
    for c_lo, c_hi, i_lo, i_hi in breakpoints:
        if c_lo <= pm25 <= c_hi:
            aqi = ((i_hi - i_lo) / (c_hi - c_lo)) * (pm25 - c_lo) + i_lo
            return int(round(aqi))
    return 500


def get_google_traffic(lat: float, lon: float):
    """Fetch real-time traffic data using Google Maps API."""
    api_key = os.getenv("VITE_GOOGLE_MAPS_API_KEY", "")
    if not api_key:
        return {"density": 0, "status": "No API Key"}
    
    try:
        # Check a nearby point (approx 2.5km away) to gauge travel time vs normal time
        dest_lat, dest_lon = lat + 0.018, lon + 0.018
        url = (
            f"https://maps.googleapis.com/maps/api/distancematrix/json"
            f"?origins={lat},{lon}&destinations={dest_lat},{dest_lon}"
            f"&departure_time=now&traffic_model=best_guess&key={api_key}"
        )
        res = requests.get(url, timeout=5).json()
        
        if res.get("status") == "OK":
            element = res["rows"][0]["elements"][0]
            if element.get("status") == "OK":
                duration_norm = element["duration"]["value"]
                # Some API responses might omit duration_in_traffic if no delay exists
                duration_traffic = element.get("duration_in_traffic", {}).get("value", duration_norm)
                
                # We start with a baseline of 15% for urban environments (Pune)
                # Then add dynamic delay scaled by 150%
                delay_factor = (duration_traffic / duration_norm) - 1.0
                dynamic_density = max(0, int(delay_factor * 150))
                
                density = min(100, 15 + dynamic_density)
                return {"density": density, "status": "Success"}
                
    except Exception as e:
        print(f"⚠️ Google Traffic API error: {e}")
    
    return {"density": 15, "status": "Fallback"} # Urban baseline

def wind_direction_label(deg: float) -> str:
    dirs = ["North","North-East","East","South-East","South","South-West","West","North-West"]
    return dirs[int((deg / 45) + 0.5) % 8]


def compute_exposure_risk(aqi: int) -> dict:
    cat, rec = aqi_category(aqi)
    risk_map = {
        "Good": "LOW RISK",
        "Moderate": "MODERATE RISK",
        "Unhealthy for Sensitive Groups": "HIGH RISK",
        "Unhealthy": "VERY HIGH RISK",
        "Very Unhealthy": "SEVERE RISK",
        "Hazardous": "EXTREME RISK",
    }
    return {"riskLevel": risk_map.get(cat, "MODERATE RISK"), "recommendation": rec, "category": cat}


def statistical_prediction(current_aqi: int, wind_speed: float, temperature: float,
                            historical_aqi: list) -> dict:
    """Fallback statistical prediction when ML model is unavailable."""
    recent = historical_aqi[-5:] if len(historical_aqi) >= 5 else historical_aqi
    trend = (recent[-1] - recent[0]) * 0.4 if len(recent) >= 2 else 0
    predicted = current_aqi + trend
    if wind_speed > 15:
        predicted -= wind_speed * 0.5
    elif wind_speed < 5:
        predicted += 10
    if temperature > 30:
        predicted += 5
    predicted = max(0, min(500, predicted))
    variance = abs(trend)
    confidence = max(60, min(98, 95 - variance * 0.2))
    return {"predictedAqi": int(round(predicted)), "confidence": round(confidence, 1), "method": "statistical"}


# ──────────────────────────────────────────────────────────────────────────────
# Data fetching
# ──────────────────────────────────────────────────────────────────────────────
def _offline_weather_defaults(lat: float, lon: float):
    """Return safe defaults when external APIs are unreachable."""
    dt = datetime.datetime.now()
    TEMP, PRES, DEWP, WSPM, WIND_DEG, HUMIDITY = 28.0, 1013.0, 18.0, 2.0, 225.0, 55
    wind_rad = np.deg2rad(WIND_DEG)
    current_pm25 = current_pm10 = 50.0
    live_us_aqi = pm25_to_aqi(current_pm25)
    now_str = dt.strftime("%H:%M")
    trend_24h = [{"time": now_str, "aqi": live_us_aqi, "pm25": current_pm25}]
    features = [
        lat, lon, current_pm25, TEMP, PRES, DEWP, WSPM,
        WSPM * np.cos(wind_rad), WSPM * np.sin(wind_rad),
        dt.weekday(), dt.month,
        current_pm25, current_pm25, current_pm25, current_pm25,
    ]
    weather_info = {
        "temperature": TEMP, "humidity": HUMIDITY, "pressure": PRES,
        "windSpeed": WSPM * 3.6, "windDirection": WIND_DEG,
        "windDirectionLabel": wind_direction_label(WIND_DEG), "dewPoint": DEWP,
    }
    return current_pm25, current_pm10, live_us_aqi, features, weather_info, trend_24h


def get_openmeteo_data(lat: float, lon: float):
    """Fetch weather + PM2.5 data from Open-Meteo (free, no key needed)."""
    try:
        weather_url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            f"&current=temperature_2m,relative_humidity_2m,dew_point_2m,"
            f"surface_pressure,wind_speed_10m,wind_direction_10m"
        )
        w_res = requests.get(weather_url, timeout=10).json()
        curr = w_res["current"]

        TEMP = curr["temperature_2m"]
        PRES = curr["surface_pressure"]
        DEWP = curr["dew_point_2m"]
        WSPM = curr["wind_speed_10m"] / 3.6        # km/h → m/s
        WIND_DEG = curr["wind_direction_10m"]
        HUMIDITY = curr.get("relative_humidity_2m", 50)
    except Exception as e:
        print(f"⚠️  Open-Meteo weather fetch failed: {e}. Using offline defaults.")
        return _offline_weather_defaults(lat, lon)

    wind_rad = np.deg2rad(WIND_DEG)
    wind_u = WSPM * np.cos(wind_rad)
    wind_v = WSPM * np.sin(wind_rad)

    dt = datetime.datetime.now()
    day_of_week = dt.weekday()
    month = dt.month

    # Air quality
    try:
        aq_url = (
            f"https://air-quality-api.open-meteo.com/v1/air-quality"
            f"?latitude={lat}&longitude={lon}"
            f"&current=pm2_5,pm10,us_aqi&hourly=pm2_5,us_aqi&past_days=1"
        )
        aq_res = requests.get(aq_url, timeout=10).json()

        current_pm25 = aq_res["current"]["pm2_5"] or 10.0
        current_pm10 = aq_res["current"].get("pm10", 0) or 0.0
        live_us_aqi  = aq_res["current"].get("us_aqi") or pm25_to_aqi(current_pm25)

        hourly_time  = aq_res["hourly"]["time"]
        hourly_pm25  = [p if p is not None else current_pm25 for p in aq_res["hourly"]["pm2_5"]]
        hourly_aqi   = [a if a is not None else live_us_aqi  for a in aq_res["hourly"].get("us_aqi", [])]

        try:
            idx = hourly_time.index(aq_res["current"]["time"])
            pm25_lag1 = hourly_pm25[idx - 1]
            pm25_lag2 = hourly_pm25[idx - 2]
            pm25_lag3 = hourly_pm25[idx - 3]
        except Exception:
            pm25_lag1 = pm25_lag2 = pm25_lag3 = current_pm25

        pm25_roll3 = (pm25_lag1 + pm25_lag2 + pm25_lag3) / 3

        # Build 24-hr trend (last 24 hourly values)
        trend_24h = []
        if hourly_aqi:
            for i, (t, a) in enumerate(zip(hourly_time[-24:], hourly_aqi[-24:])):
                trend_24h.append({"time": t[-5:], "aqi": a, "pm25": hourly_pm25[-24:][i] if i < len(hourly_pm25) else None})

    except Exception as e:
        print(f"⚠️  Open-Meteo air quality fetch failed: {e}. Using weather-only defaults.")
        current_pm25 = current_pm10 = 50.0
        live_us_aqi = pm25_to_aqi(current_pm25)
        pm25_lag1 = pm25_lag2 = pm25_lag3 = pm25_roll3 = current_pm25
        trend_24h = [{"time": dt.strftime("%H:%M"), "aqi": live_us_aqi, "pm25": current_pm25}]

    features = [
        lat, lon, current_pm25, TEMP, PRES, DEWP, WSPM,
        wind_u, wind_v, day_of_week, month,
        pm25_lag1, pm25_lag2, pm25_lag3, pm25_roll3
    ]

    weather_info = {
        "temperature": round(TEMP, 1),
        "humidity": HUMIDITY,
        "pressure": round(PRES, 1),
        "windSpeed": round(curr["wind_speed_10m"], 1),
        "windDirection": WIND_DEG,
        "windDirectionLabel": wind_direction_label(WIND_DEG),
        "dewPoint": round(DEWP, 1),
    }

    return current_pm25, current_pm10, live_us_aqi, features, weather_info, trend_24h



def get_waqi_data(lat: float, lon: float, api_key: str):
    """Use World Air Quality Index (WAQI) API for PM2.5 and AQI, fallback to Open-Meteo."""
    current_pm25, current_pm10, live_us_aqi, features, weather_info, trend_24h = get_openmeteo_data(lat, lon)
    waqi_pm25 = current_pm25
    waqi_pm10 = current_pm10
    waqi_aqi  = live_us_aqi
    source = "Open-Meteo"

    try:
        waqi_url = f"https://api.waqi.info/feed/geo:{lat};{lon}/?token={api_key}"
        res = requests.get(waqi_url, timeout=10).json()

        if res.get("status") == "ok" and "data" in res:
            data = res["data"]
            
            # Extract AQI
            if "aqi" in data and str(data["aqi"]).isdigit():
                waqi_aqi = int(data["aqi"])
            
            # Extract PM2.5 and PM10 if available
            if "iaqi" in data:
                if "pm25" in data["iaqi"]:
                    waqi_pm25 = float(data["iaqi"]["pm25"]["v"])
                if "pm10" in data["iaqi"]:
                    waqi_pm10 = float(data["iaqi"]["pm10"]["v"])

            features[2] = waqi_pm25
            source = "World Air Quality Index (WAQI) API"

    except Exception as e:
        print(f"WAQI API error (fallback): {e}")

    return waqi_pm25, waqi_pm10, waqi_aqi, features, weather_info, trend_24h, source


def store_aqi_record(record: dict):
    """Persist AQI reading to Firestore and run cleanup."""
    if db is None:
        return
    try:
        # Pre-cleanup
        cleanup_old_records(hours=8)
        
        # Store
        db.collection("aqi_readings").add(record)
        print(f"💾 Saved record to Firebase (ID: {record.get('timestamp')})")
    except Exception as e:
        print(f"⚠️  Firestore write error: {e}")


@app.route("/api/history")
def get_history():
    """Retrieve the last 8 hours of history from Firebase."""
    if db is None:
        return jsonify({"success": False, "error": "Firebase not connected"})
    
    try:
        docs = db.collection("aqi_readings") \
                 .order_by("timestamp", direction=firestore.Query.DESCENDING) \
                 .limit(20) \
                 .stream()
        
        history = []
        for doc in docs:
            history.append(doc.to_dict())
            
        return jsonify({"success": True, "history": history[::-1]}) # Return chronological
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})


# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return jsonify({"status": "VayuCast ML API running", "version": "2.0"})


@app.route("/api/predict", methods=["POST"])
def predict():
    data = request.json or {}
    lat = float(data.get("lat", 18.5204))
    lon = float(data.get("lon", 73.8567))

    api_key = os.getenv("WAQI_API_KEY", "")

    try:
        if api_key and api_key not in ("", "your_waqi_api_key_here"):
            pm25, pm10, live_aqi, features, weather, trend_24h, source = get_waqi_data(lat, lon, api_key)
        else:
            pm25, pm10, live_aqi, features, weather, trend_24h = get_openmeteo_data(lat, lon)
            source = "Open-Meteo"

        # ── Traffic Data ───────────────────────────────────────────────────────
        traffic = get_google_traffic(lat, lon)
        traffic_density = traffic["density"]

        # ── ML prediction ──────────────────────────────────────────────────────
        if model is not None:
            # Model features (Universal set - 11 features)
            feature_names = [
                "PM2.5", "TEMP", "WSPM",
                "wind_u", "wind_v", "day_of_week", "month",
                "PM25_lag1", "PM25_lag2", "PM25_lag3", "PM25_roll3"
            ]
            
            # Match the training feature order exactly
            ml_features = [
                pm25, 
                weather["temperature"], 
                weather["windSpeed"] / 3.6, # convert to m/s 
                features[7], features[8],   # wind_u, wind_v
                features[9], features[10],  # day, month
                features[11], features[12], features[13], features[14] # lags, roll
            ]

            input_df = pd.DataFrame([ml_features], columns=feature_names)
            
            # Predict
            raw_pred = float(model.predict(input_df)[0])
            
            # Adjust based on real-time traffic density (if traffic > 40, add slight pollution bias)
            traffic_bias = max(0, (traffic_density - 30) * 0.2)
            raw_pred += traffic_bias
            
            # ── Reality Check ──────────────────────────────────────────────────
            # Since the model is trained on Beijing data but used here (e.g., Pune),
            # we apply a reality cap (±30% change per hour is high but plausible).
            # This prevents wild hallucinations (like 500 or 0) due to climate shifts.
            
            # Use a weighted average between current and model if model is very far off
            current_bias = 0.6  # Give 60% weight to current state if model is erratic
            smoothed_pm25 = (raw_pred * (1 - current_bias)) + (pm25 * current_bias)
            
            # Final clip to EPA limits + plausible bounds
            predicted_pm25 = max(pm25 * 0.5, min(pm25 * 1.5, smoothed_pm25))
            predicted_pm25 = max(5, min(500, predicted_pm25)) # Hard limits
            
            predicted_aqi  = pm25_to_aqi(predicted_pm25)
            
            # Ensure it's not exactly the same if there's any trend
            if round(predicted_aqi) == round(live_aqi) and abs(raw_pred - pm25) > 1:
                if raw_pred > pm25: predicted_aqi += 1
                else: predicted_aqi = max(0, predicted_aqi - 1)

            # Confidence based on recent variance + prediction magnitude
            recent_pm25 = [features[11], features[12], features[13], pm25]
            variance = np.std(recent_pm25)
            confidence = round(max(60, min(92, 90 - variance * 0.4)), 1)
            method = "XGBoost ML Model + Google Traffic"
        else:
            trend_aqi = [t["aqi"] for t in trend_24h if t.get("aqi") is not None]
            stat = statistical_prediction(live_aqi, weather["windSpeed"], weather["temperature"], trend_aqi or [live_aqi])
            predicted_aqi  = stat["predictedAqi"]
            predicted_pm25 = float(pm25 * (predicted_aqi / max(live_aqi, 1)))
            confidence     = stat["confidence"]
            method         = stat["method"]

        # ── Derived metrics ───────────────────────────────────────────────────
        dominant = "PM2.5" if pm25 > pm10 / 2 else "PM10"
        category, recommendation = aqi_category(live_aqi)
        exposure = compute_exposure_risk(live_aqi)

        aqi_change_pct = round(((predicted_aqi - live_aqi) / max(live_aqi, 1)) * 100, 1)

        # Wind-affected zones
        wind_dir = weather["windDirectionLabel"]
        wind_speed = weather["windSpeed"]
        affected1 = int(wind_speed * 0.8) + 5
        affected2 = int(wind_speed * 0.4) + 2

        # Factor contributions (estimated from feature magnitudes)
        traffic_factor = traffic_density
        wind_factor    = min(100, int(wind_speed * 3))
        temp_factor    = min(100, max(0, int((weather["temperature"] - 20) * 3)))

        timestamp = datetime.datetime.utcnow().isoformat() + "Z"

        result = {
            "success": True,
            "timestamp": timestamp,
            "source": source,
            "lat": lat,
            "lon": lon,

            # ── AQI ──────────────────────────────────────────────────────────
            "currentAqi": int(live_aqi),
            "predictedAqi": int(predicted_aqi),
            "aqiChangePct": aqi_change_pct,
            "confidence": confidence,
            "predictionMethod": method,
            "dominant": dominant,
            "category": category,
            "recommendation": recommendation,

            # ── PM ───────────────────────────────────────────────────────────
            "currentPm25": round(pm25, 2),
            "predictedPm25": round(predicted_pm25, 2),
            "currentPm10": round(pm10, 2),

            # ── Weather ──────────────────────────────────────────────────────
            "weather": weather,
            "trafficDensity": traffic_density,

            # ── Risk ─────────────────────────────────────────────────────────
            "exposure": exposure,

            # ── Wind impact ──────────────────────────────────────────────────
            "windImpact": {
                "direction": wind_dir,
                "affectedSector": f"Sector {wind_dir}",
                "affectedZone": f"Zone {wind_dir}",
                "sectorAqiDelta": affected1,
                "zoneAqiDelta": affected2,
            },

            # ── Factor contributions ─────────────────────────────────────────
            "factors": [
                {"name": "Traffic Density", "value": traffic_factor},
                {"name": "Wind Speed", "value": wind_factor},
                {"name": "Atmospheric Temp", "value": temp_factor},
            ],

            # ── 24h trend ────────────────────────────────────────────────────
            "trend24h": trend_24h,
        }

        # ── Persist to Firestore ──────────────────────────────────────────────
        store_aqi_record({
            "timestamp": timestamp,
            "lat": lat,
            "lon": lon,
            "currentAqi": int(live_aqi),
            "predictedAqi": int(predicted_aqi),
            "pm25": round(pm25, 2),
            "temperature": weather["temperature"],
            "windSpeed": weather["windSpeed"],
            "source": source,
            "method": method,
        })

        return jsonify(result)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e), "success": False}), 500


@app.route("/api/history", methods=["GET"])
def history():
    """Return the last N AQI readings from Firestore."""
    limit = int(request.args.get("limit", 50))
    if db is None:
        return jsonify({"success": False, "error": "Firestore not configured", "records": []}), 200

    try:
        docs = (
            db.collection("aqi_readings")
            .order_by("timestamp", direction="DESCENDING")
            .limit(limit)
            .stream()
        )
        records = [{"id": d.id, **d.to_dict()} for d in docs]
        return jsonify({"success": True, "records": records})
    except Exception as e:
        return jsonify({"success": False, "error": str(e), "records": []}), 500


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model": "loaded" if model is not None else "fallback",
        "firebase": "connected" if db is not None else "disabled",
    })


def pred_pm25_from_aqi(aqi: int) -> float:
    """Rough inverse AQI→PM2.5 for display purposes."""
    breakpoints = [
        (0,   50,   0.0,  12.0),
        (51,  100,  12.1, 35.4),
        (101, 150,  35.5, 55.4),
        (151, 200,  55.5, 150.4),
        (201, 300, 150.5, 250.4),
        (301, 500, 250.5, 500.4),
    ]
    for i_lo, i_hi, c_lo, c_hi in breakpoints:
        if i_lo <= aqi <= i_hi:
            return round(c_lo + (c_hi - c_lo) * (aqi - i_lo) / max(i_hi - i_lo, 1), 2)
    return 500.0


if __name__ == "__main__":
    app.run(debug=True, port=5000, host="0.0.0.0")
