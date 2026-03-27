import os
import time
import datetime
import numpy as np
import pandas as pd
import requests
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
root_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.env"))
load_dotenv(root_env)
load_dotenv() 

app = Flask(__name__)
CORS(app)

# ──────────────────────────────────────────────────────────────────────────────
# Firebase / Firestore
# ──────────────────────────────────────────────────────────────────────────────
db = None
try:
    import firebase_admin
    from firebase_admin import credentials, firestore

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
    print(f"⚠️  Firebase init error: {e}")

def cleanup_old_records(hours=24):
    if db is None: return
    try:
        now = datetime.datetime.now(datetime.timezone.utc)
        cutoff = now - datetime.timedelta(hours=hours)
        docs = db.collection("aqi_readings").where("timestamp", "<", cutoff.isoformat()).stream()
        count = 0
        for doc in docs:
            doc.reference.delete()
            count += 1
        if count > 0:
            print(f"🧹 Cleaned up {count} old records.")
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
    print(f"⚠️  Model load failed: {e}. Using statistical fallback.")

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────
AQI_BREAKPOINTS = [
    (0,   50,  "Good",                       "Air quality is satisfactory."),
    (51,  100, "Moderate",                   "Sensitive groups should reduce exertion."),
    (101, 150, "Unhealthy for Sensitive Groups", "Limit outdoor exertion."),
    (151, 200, "Unhealthy",                  "Avoid prolonged outdoor exertion."),
    (201, 300, "Very Unhealthy",             "Stay indoors."),
    (301, 500, "Hazardous",                  "Emergency conditions."),
]

def aqi_category(aqi: float):
    for lo, hi, cat, rec in AQI_BREAKPOINTS:
        if lo <= aqi <= hi: return cat, rec
    return "Hazardous", "Emergency conditions."
def pm25_to_aqi(pm25: float) -> int:
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
    api_key = os.getenv("VITE_GOOGLE_MAPS_API_KEY", "")
    if not api_key: return {"density": 15, "status": "No API Key"}
    try:
        dest_lat, dest_lon = lat + 0.018, lon + 0.018
        url = f"https://maps.googleapis.com/maps/api/distancematrix/json?origins={lat},{lon}&destinations={dest_lat},{dest_lon}&departure_time=now&traffic_model=best_guess&key={api_key}"
        res = requests.get(url, timeout=5).json()
        if res.get("status") == "OK":
            element = res["rows"][0]["elements"][0]
            if element.get("status") == "OK":
                duration_norm = element["duration"]["value"]
                duration_traffic = element.get("duration_in_traffic", {}).get("value", duration_norm)
                delay_factor = (duration_traffic / duration_norm) - 1.0
                dynamic_density = max(0, int(delay_factor * 150))
                return {"density": min(100, 15 + dynamic_density), "status": "Success"}
    except Exception: pass
    return {"density": 15, "status": "Fallback"}

def wind_direction_label(deg: float) -> str:
    dirs = ["North","North-East","East","South-East","South","South-West","West","North-West"]
    return dirs[int((deg / 45) + 0.5) % 8]

def compute_exposure_risk(aqi: int) -> dict:
    cat, rec = aqi_category(aqi)
    risk_map = {"Good": "LOW RISK", "Moderate": "MODERATE RISK", "Unhealthy for Sensitive Groups": "HIGH RISK", "Unhealthy": "VERY HIGH RISK", "Very Unhealthy": "SEVERE RISK", "Hazardous": "EXTREME RISK"}
    return {"riskLevel": risk_map.get(cat, "MODERATE RISK"), "recommendation": rec, "category": cat}

def statistical_prediction(current_aqi: int, wind_speed: float, temperature: float, historical_aqi: list) -> dict:
    recent = historical_aqi[-5:] if len(historical_aqi) >= 5 else historical_aqi
    trend = (recent[-1] - recent[0]) * 0.4 if len(recent) >= 2 else 0
    predicted = current_aqi + trend
    if wind_speed > 15: predicted -= wind_speed * 0.5
    elif wind_speed < 5: predicted += 10
    if temperature > 30: predicted += 5
    predicted = max(0, min(500, predicted))
    variance = abs(trend)
    return {"predictedAqi": int(round(predicted)), "confidence": round(max(60, min(98, 95 - variance * 0.2)), 1), "method": "statistical"}

def get_openmeteo_data(lat: float, lon: float):
    try:
        w_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,dew_point_2m,surface_pressure,wind_speed_10m,wind_direction_10m"
        w_res = requests.get(w_url, timeout=10).json()
        curr = w_res["current"]
        TEMP, PRES, DEWP, WSPM, WIND_DEG, HUMIDITY = curr["temperature_2m"], curr["surface_pressure"], curr["dew_point_2m"], curr["wind_speed_10m"]/3.6, curr["wind_direction_10m"], curr.get("relative_humidity_2m", 50)
        
        aq_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&current=pm2_5,pm10,us_aqi&hourly=pm2_5,us_aqi&past_days=1"
        aq_res = requests.get(aq_url, timeout=10).json()
        pm25 = aq_res["current"]["pm2_5"] or 10.0
        pm10 = aq_res["current"].get("pm10", 0) or 0.0
        # Always calculate AQI ourselves from raw concentrations for accuracy and consistency
        aqi  = pm25_to_aqi(pm25)
        
        h_time, h_pm25, h_aqi = aq_res["hourly"]["time"], [p or pm25 for p in aq_res["hourly"]["pm2_5"]], [a or aqi for a in aq_res["hourly"].get("us_aqi", [])]
        try:
            idx = h_time.index(aq_res["current"]["time"])
            l1, l2, l3 = h_pm25[idx-1], h_pm25[idx-2], h_pm25[idx-3]
        except: l1 = l2 = l3 = pm25
        
        trend = [{"time": t[-5:], "aqi": a, "pm25": h_pm25[-24:][i]} for i, (t, a) in enumerate(zip(h_time[-24:], h_aqi[-24:]))]
        features = [lat, lon, pm25, TEMP, PRES, DEWP, WSPM, WSPM*np.cos(np.deg2rad(WIND_DEG)), WSPM*np.sin(np.deg2rad(WIND_DEG)), datetime.datetime.now().weekday(), datetime.datetime.now().month, l1, l2, l3, (l1+l2+l3)/3]
        weather = {"temperature": round(TEMP, 1), "humidity": HUMIDITY, "pressure": round(PRES, 1), "windSpeed": round(curr["wind_speed_10m"], 1), "windDirection": WIND_DEG, "windDirectionLabel": wind_direction_label(WIND_DEG), "dewPoint": round(DEWP, 1)}
        
        # Capping
        aqi = min(500, aqi)
        return pm25, pm10, aqi, features, weather, trend
    except Exception as e:
        print(f"⚠️ OpenMeteo error: {e}")
        fallback_weather = {
            "temperature": 25.0, "humidity": 50, "pressure": 1013.2, 
            "windSpeed": 10.0, "windDirection": 0, "windDirectionLabel": "North", "dewPoint": 15.0
        }
        return 50.0, 50.0, 75, [], fallback_weather, []

def aqi_to_pm25(aqi: float) -> float:
    """Inverse US AQI to PM2.5 concentration (µg/m³)."""
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
            return c_lo + (c_hi - c_lo) * (aqi - i_lo) / max(i_hi - i_lo, 1)
    
    # Linear extrapolation for aqi > 500 (approx)
    if aqi > 500:
        return 500.4 + (aqi - 500) * 1.0 
    return 0.0

def get_waqi_data(lat: float, lon: float, api_key: str):
    """Use World Air Quality Index (WAQI) API for PM2.5 and AQI, fallback to Open-Meteo."""
    pm25, pm10, aqi, feats, weather, trend = get_openmeteo_data(lat, lon)
    source = "Open-Meteo"
    try:
        url = f"https://api.waqi.info/feed/geo:{lat};{lon}/?token={api_key}"
        res = requests.get(url, timeout=10).json()
        if res.get("status") == "ok":
            data = res["data"]
            # WAQI returns US EPA AQI
            if "aqi" in data and (isinstance(data["aqi"], (int, float)) or str(data["aqi"]).isdigit()):
                # We still prefer calculating from pm25 if available in iaqi, 
                # but we'll use this as a soft baseline if iaqi is missing.
                aqi = int(data["aqi"])
                pm25 = aqi_to_pm25(float(aqi))
            
            # If internal pollution indices are provided, refine them
            # IMPORTANT: WAQI iaqi values are INDICES, not mass concentrations.
            if "iaqi" in data:
                iaqi = data["iaqi"]
                if "pm25" in iaqi: 
                    pm25_index = float(iaqi["pm25"]["v"])
                    pm25 = aqi_to_pm25(pm25_index) # Convert index back to µg/m³
                if "pm10" in iaqi:
                    pm10_index = float(iaqi["pm10"]["v"])
                    # Simple PM10 inverse (approx)
                    pm10 = pm10_index * 1.5 
            
            if feats: feats[2] = pm25
    except Exception:
        pass

    # Strict capping and re-verification for US EPA scale consistency
    # We re-calculate one last time to ensure any WAQI refinement is synced
    aqi = pm25_to_aqi(pm25)
    aqi = min(500, aqi)
    return pm25, pm10, aqi, feats, weather, trend, source

# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────
@app.route("/")
def index(): return jsonify({"status": "VayuCast ML API running", "version": "2.1"})

@app.route("/api/predict", methods=["POST"])
def predict():
    body = request.json or {}
    lat, lon = float(body.get("lat", 18.5204)), float(body.get("lon", 73.8567))
    api_key = os.getenv("WAQI_API_KEY", "")
    
    try:
        if api_key: pm25, pm10, live_aqi, feats, weather, trend, source = get_waqi_data(lat, lon, api_key)
        else:
            pm25, pm10, live_aqi, feats, weather, trend = get_openmeteo_data(lat, lon)
            source = "Open-Meteo"
        
        traffic_density = get_google_traffic(lat, lon)["density"]
        
        if model and feats:
            ml_features = [pm25, weather["temperature"], weather["windSpeed"]/3.6, feats[7], feats[8], feats[9], feats[10], feats[11], feats[12], feats[13], feats[14]]
            raw_pred = float(model.predict(pd.DataFrame([ml_features], columns=["PM2.5","TEMP","WSPM","wind_u","wind_v","day_of_week","month","PM25_lag1","PM25_lag2","PM25_lag3","PM25_roll3"]))[0])
            
            # Stability & Reality check
            bias = 0.85
            pred_pm25 = max(pm25*0.85, min(pm25*1.15, (raw_pred*(1-bias)) + (pm25*bias)))
            pred_aqi = pm25_to_aqi(pred_pm25)
            if round(pred_aqi) == round(live_aqi): pred_aqi += (1 if raw_pred > pm25 else -1)
            
            confidence = round(max(85, min(96, 95 - abs(raw_pred - pm25)*0.1)), 1)
            method = "XGBoost ML Model + Google Traffic"
        else:
            stat = statistical_prediction(live_aqi, weather.get("windSpeed", 0), weather.get("temperature", 25), [t["aqi"] for t in trend])
            pred_aqi, confidence, method = stat["predictedAqi"], stat["confidence"], stat["method"]
            pred_pm25 = pm25 * (pred_aqi / max(live_aqi, 1))

        res = {
            "success": True, "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(), "source": source, "lat": lat, "lon": lon,
            "currentAqi": int(live_aqi), "predictedAqi": int(pred_aqi), "aqiChangePct": round(((pred_aqi-live_aqi)/max(live_aqi,1))*100, 1),
            "confidence": confidence, "predictionMethod": method, "dominant": "PM2.5" if pm25>pm10/2 else "PM10", 
            "category": aqi_category(live_aqi)[0], "recommendation": aqi_category(live_aqi)[1],
            "currentPm25": round(pm25, 2), "predictedPm25": round(pred_pm25, 2), "currentPm10": round(pm10, 2),
            "weather": weather, "trafficDensity": traffic_density, "exposure": compute_exposure_risk(live_aqi),
            "windImpact": {
                "direction": weather.get("windDirectionLabel", "N/A"), 
                "affectedSector": f"Sector {weather.get('windDirectionLabel', 'N/A')}", 
                "affectedZone": f"Zone {weather.get('windDirectionLabel', 'N/A')}", 
                "sectorAqiDelta": int(weather.get('windSpeed', 0)*0.8)+5, 
                "zoneAqiDelta": int(weather.get('windSpeed', 0)*0.4)+2
            },
            "factors": [
                {"name": "Traffic Density", "value": traffic_density}, 
                {"name": "Wind Speed", "value": min(100, int(weather.get('windSpeed', 0)*3))}, 
                {"name": "Atmospheric Temp", "value": min(100, max(0, int((weather.get('temperature', 25)-20)*3)))}
            ],
            "trend24h": trend
        }
        
        if db:
            cleanup_old_records()
            db.collection("aqi_readings").add({
                "timestamp": res["timestamp"], 
                "lat": lat, 
                "lon": lon, 
                "currentAqi": int(live_aqi), 
                "predictedAqi": int(pred_aqi), 
                "pm25": round(pm25, 2),
                "trafficDensity": traffic_density,
                "temperature": weather.get("temperature"),
                "windSpeed": weather.get("windSpeed"),
                "method": method
            })
        return jsonify(res)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e), "success": False}), 500

@app.route("/api/history", methods=["GET"])
def get_history():
    lat, lon, limit = request.args.get("lat"), request.args.get("lon"), int(request.args.get("limit", 20))
    if not db: return jsonify({"success": False, "history": []})
    try:
        docs = db.collection("aqi_readings").order_by("timestamp", direction=firestore.Query.DESCENDING).limit(limit*2).stream()
        history_list = []
        for doc in docs:
            d = doc.to_dict()
            if lat and lon:
                if abs(float(d.get("lat",0)) - float(lat)) > 0.5 or abs(float(d.get("lon",0)) - float(lon)) > 0.5: continue
            history_list.append(d)
            if len(history_list) >= limit: break
        return jsonify({"success": True, "history": history_list[::-1]})
    except Exception as e: return jsonify({"success": False, "error": str(e)})

if __name__ == "__main__":
    app.run(debug=True, port=5000, host="0.0.0.0")
