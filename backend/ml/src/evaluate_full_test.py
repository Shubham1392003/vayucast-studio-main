import pandas as pd
import numpy as np
import joblib
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import matplotlib.pyplot as plt

# =====================================
# LOAD MODEL
# =====================================

model = joblib.load("models/pollution_xgboost_model.pkl")

# =====================================
# LOAD DATA
# =====================================

df = pd.read_csv("data/processed/final_training_dataset.csv")

features = [
    "latitude",
    "longitude",
    "PM2.5",
    "TEMP",
    "PRES",
    "DEWP",
    "WSPM",
    "wind_u",
    "wind_v",
    "day_of_week",
    "month",
    "PM25_lag1",
    "PM25_lag2",
    "PM25_lag3",
    "PM25_roll3"
]

X = df[features]
y = df["PM25_target"]

# Chronological split
split = int(len(df) * 0.8)

X_test = X[split:]
y_test = y[split:]

# =====================================
# PREDICT FULL TEST DATA
# =====================================

y_pred = model.predict(X_test)

# =====================================
# METRICS
# =====================================

mae = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
r2 = r2_score(y_test, y_pred)

print("\nFull Test Dataset Evaluation:")
print("MAE:", mae)
print("RMSE:", rmse)
print("R2 Score:", r2)

# =====================================
# VISUALIZATION
# =====================================

plt.figure(figsize=(12,6))
plt.plot(y_test.values[:200], label="Actual")
plt.plot(y_pred[:200], label="Predicted")
plt.legend()
plt.title("Actual vs Predicted PM2.5 (First 200 Test Points)")
plt.show()