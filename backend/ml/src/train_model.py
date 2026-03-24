import pandas as pd
import numpy as np
import joblib
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# =====================================
# LOAD PROCESSED DATA
# =====================================

df = pd.read_csv("data/processed/final_training_dataset.csv")

print("Loaded Data Shape:", df.shape)

# =====================================
# DEFINE FEATURES & TARGET
# =====================================

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

# =====================================
# CHRONOLOGICAL SPLIT
# =====================================

split = int(len(df) * 0.8)

X_train = X[:split]
X_test = X[split:]

y_train = y[:split]
y_test = y[split:]

print("Train Shape:", X_train.shape)
print("Test Shape:", X_test.shape)

# =====================================
# TRAIN XGBOOST MODEL
# =====================================

model = XGBRegressor(
    n_estimators=500,
    learning_rate=0.05,
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    objective='reg:squarederror',
    random_state=42
)

model.fit(X_train, y_train)

# =====================================
# EVALUATION
# =====================================

y_pred = model.predict(X_test)

mae = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
r2 = r2_score(y_test, y_pred)

print("\nModel Evaluation:")
print("MAE:", mae)
print("RMSE:", rmse)
print("R2 Score:", r2)

# =====================================
# SAVE MODEL
# =====================================

joblib.dump(model, "models/pollution_xgboost_model.pkl")

print("\nModel saved successfully.")