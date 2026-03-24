import pandas as pd
import numpy as np

# =====================================
# LOAD RAW DATA
# =====================================

df = pd.read_csv("data/raw/Beijing Multisite air Quality data.csv")

print("Raw Data Shape:", df.shape)

# =====================================
# CREATE DATETIME
# =====================================

df["datetime"] = pd.to_datetime(df[["year", "month", "day", "hour"]])

df = df.sort_values(["station", "datetime"])
df.reset_index(drop=True, inplace=True)

# =====================================
# REMOVE MISSING PM2.5
# =====================================

df = df.dropna(subset=["PM2.5"])

# =====================================
# ADD LATITUDE & LONGITUDE
# =====================================

station_coords = {
    "Aotizhongxin": (39.982, 116.397),
    "Changping": (40.218, 116.231),
    "Dingling": (40.292, 116.220),
    "Dongsi": (39.929, 116.417),
    "Guanyuan": (39.933, 116.339),
    "Gucheng": (39.914, 116.184),
    "Huairou": (40.357, 116.638),
    "Nongzhanguan": (39.937, 116.461),
    "Shunyi": (40.128, 116.655),
    "Tiantan": (39.886, 116.407),
    "Wanliu": (39.987, 116.305),
    "Wanshouxigong": (39.878, 116.352)
}

df["latitude"] = df["station"].map(lambda x: station_coords[x][0])
df["longitude"] = df["station"].map(lambda x: station_coords[x][1])

# =====================================
# TIME FEATURES
# =====================================

df["day_of_week"] = df["datetime"].dt.dayofweek
df["month"] = df["datetime"].dt.month

# =====================================
# WIND VECTOR CONVERSION
# =====================================

direction_map = {
    'N':0, 'NNE':22.5, 'NE':45, 'ENE':67.5,
    'E':90, 'ESE':112.5, 'SE':135, 'SSE':157.5,
    'S':180, 'SSW':202.5, 'SW':225, 'WSW':247.5,
    'W':270, 'WNW':292.5, 'NW':315, 'NNW':337.5
}

df["wind_deg"] = df["wd"].map(direction_map)
df["wind_rad"] = np.deg2rad(df["wind_deg"])

df["wind_u"] = df["WSPM"] * np.cos(df["wind_rad"])
df["wind_v"] = df["WSPM"] * np.sin(df["wind_rad"])

# =====================================
# LAG FEATURES PER STATION
# =====================================

df["PM25_lag1"] = df.groupby("station")["PM2.5"].shift(1)
df["PM25_lag2"] = df.groupby("station")["PM2.5"].shift(2)
df["PM25_lag3"] = df.groupby("station")["PM2.5"].shift(3)

df["PM25_roll3"] = (
    df.groupby("station")["PM2.5"]
    .rolling(3)
    .mean()
    .reset_index(0, drop=True)
)

# =====================================
# TARGET
# =====================================

df["PM25_target"] = df.groupby("station")["PM2.5"].shift(-1)

# =====================================
# CLEAN FINAL
# =====================================

df = df.dropna()

# =====================================
# SELECT FINAL COLUMNS
# =====================================

final_df = df[[
    "datetime",
    "station",
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
    "PM25_roll3",
    "PM25_target"
]]

# =====================================
# SAVE
# =====================================

final_df.to_csv("data/processed/final_training_dataset.csv", index=False)

print("Preprocessing Complete")
print("Final Shape:", final_df.shape)