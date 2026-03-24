import pandas as pd
import joblib

# Load model
model = joblib.load("models/pollution_xgboost_model.pkl")

# Load processed dataset
df = pd.read_csv("data/processed/final_training_dataset.csv")

# Take last 5 rows
sample = df.tail(5)

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

X_sample = sample[features]

predictions = model.predict(X_sample)

print("Actual vs Predicted\n")

for i in range(len(sample)):
    print("Actual:", sample.iloc[i]["PM25_target"],
          " | Predicted:", predictions[i])
import matplotlib.pyplot as plt

plt.figure(figsize=(10,5))
plt.plot(sample["PM25_target"].values, label="Actual")
plt.plot(predictions, label="Predicted")
plt.legend()
plt.title("Actual vs Predicted PM2.5")
plt.show()
from xgboost import plot_importance
import matplotlib.pyplot as plt

plot_importance(model)
plt.show()