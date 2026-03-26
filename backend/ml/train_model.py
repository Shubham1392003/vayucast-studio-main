import pandas as pd

import numpy as np
from xgboost import XGBRegressor
import joblib
import os

# Create models directory if it doesn't exist
if not os.path.exists('models'):
    os.makedirs('models')

from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

DATA_PATH = "data/final_training_dataset.csv"
MODEL_FILE = "models/pollution_xgboost_model.pkl"

# Universal features for general air quality (removed altitude/climate-locked features: latitude, longitude, PRES, DEWP)
feature_names = [
    "PM2.5", "TEMP", "WSPM",
    "wind_u", "wind_v", "day_of_week", "month",
    "PM25_lag1", "PM25_lag2", "PM25_lag3", "PM25_roll3"
]

def train_real_model():
    print(f"Loading dataset from {DATA_PATH}...")
    if not os.path.exists(DATA_PATH):
        print(f"❌ Error: {DATA_PATH} not found!")
        return

    df = pd.read_csv(DATA_PATH)
    print(f"Loaded {len(df)} rows.")

    # Target is PM25_target
    X = df[feature_names]
    y = df['PM25_target']

    # Split for evaluation
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print(f"Training XGBoost Regressor on {len(X_train)} rows...")
    model = XGBRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=6,
        subsample=0.8,
        colsample_bytree=0.8,
        n_jobs=-1,
        random_state=42
    )
    
    model.fit(X_train, y_train)

    # Evaluation
    print("Evaluating model performance...")
    y_pred = model.predict(X_test)
    
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)

    print("\n" + "="*40)
    print("MODEL ACCURACY REPORT")
    print("="*40)
    print(f"MAE (Mean Absolute Error): {mae:.4f}")
    print(f"RMSE (Root Mean Squared Error): {rmse:.4f}")
    print(f"R-squared (R2) Score: {r2:.4f}")
    print("="*40 + "\n")

    # Save
    if not os.path.exists('models'):
        os.makedirs('models')
    
    print(f"Saving model to {MODEL_FILE}...")
    joblib.dump(model, MODEL_FILE)
    print("✅ Model evaluation and training complete!")

if __name__ == "__main__":
    train_real_model()
