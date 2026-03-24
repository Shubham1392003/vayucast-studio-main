import joblib
import numpy as np

# Load model
model = joblib.load("models/pollution_xgboost_model.pkl")

# =====================================
# MANUAL INPUT EXAMPLE
# =====================================

# Example Location (india)
latitude = 39.982
longitude = 116.397

# Current Environmental Data
PM25_current = 150
TEMP = 30
PRES = 1010
DEWP = 20
WSPM = 2.5

# Wind direction example: 90 degree (East)
wind_deg = 90
wind_rad = np.deg2rad(wind_deg)

wind_u = WSPM * np.cos(wind_rad)
wind_v = WSPM * np.sin(wind_rad)

day_of_week = 2   # Wednesday
month = 6

# Lag values (previous hours)
PM25_lag1 = 145
PM25_lag2 = 140
PM25_lag3 = 138

PM25_roll3 = (PM25_lag1 + PM25_lag2 + PM25_lag3) / 3

# =====================================
# CREATE INPUT ARRAY
# =====================================

input_data = [[
    latitude,
    longitude,
    PM25_current,
    TEMP,
    PRES,
    DEWP,
    WSPM,
    wind_u,
    wind_v,
    day_of_week,
    month,
    PM25_lag1,
    PM25_lag2,
    PM25_lag3,
    PM25_roll3
]]

prediction = model.predict(input_data)

print("Current PM2.5:", PM25_current)
print("Predicted PM2.5 after 1 hour:", prediction[0])