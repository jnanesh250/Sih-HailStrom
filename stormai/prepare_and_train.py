"""
StormSense - Cyclone Track/Intensity Predictor
Trains on IBTrACS North Indian Ocean basin data (Bay of Bengal + Arabian Sea).

USAGE:
    python prepare_and_train.py --input ibtracs_NI.csv --model_out stormsense_model.pkl

Input CSV: download the North Indian (NI) basin file from
https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/csv/
(look for a filename containing "NI" -- North Indian basin)
"""

import argparse
import joblib
import numpy as np
import pandas as pd
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error

# How many past track points feed into one prediction.
LAG_STEPS = 3
FEATURE_COLS = ["LAT", "LON", "WMO_WIND", "WMO_PRES"]
TARGET_COLS = ["LAT", "LON", "WMO_WIND", "WMO_PRES"]  # predicting next timestep of these


def load_ibtracs(path: str) -> pd.DataFrame:
    """IBTrACS CSVs have a units row right after the header -- skip it."""
    df = pd.read_csv(path, skiprows=[1], low_memory=False)

    # Keep only the columns we need if present
    needed = ["SID", "ISO_TIME"] + FEATURE_COLS
    missing = [c for c in needed if c not in df.columns]
    if missing:
        raise ValueError(
            f"Expected columns missing from CSV: {missing}. "
            f"Check you downloaded the IBTrACS NI basin file, not a different subset."
        )

    df = df[needed].copy()
    df["ISO_TIME"] = pd.to_datetime(df["ISO_TIME"], errors="coerce")
    for col in FEATURE_COLS:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # Drop rows with no usable data
    df = df.dropna(subset=["ISO_TIME"] + FEATURE_COLS)
    df = df.sort_values(["SID", "ISO_TIME"]).reset_index(drop=True)
    return df


def build_lag_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    For each storm (SID), turn the track into supervised rows:
    lag-1/lag-2/lag-3 position+intensity -> next timestep's position+intensity.
    This is what actually makes it a *prediction* dataset instead of a log.
    """
    frames = []
    for sid, storm in df.groupby("SID"):
        storm = storm.reset_index(drop=True)
        if len(storm) <= LAG_STEPS:
            continue  # not enough history for this storm

        row_data = {}
        for lag in range(1, LAG_STEPS + 1):
            shifted = storm[FEATURE_COLS].shift(lag)
            for col in FEATURE_COLS:
                row_data[f"{col}_lag{lag}"] = shifted[col]

        for col in TARGET_COLS:
            row_data[f"target_{col}"] = storm[col]

        row_data["SID"] = storm["SID"]
        row_data["ISO_TIME"] = storm["ISO_TIME"]
        frame = pd.DataFrame(row_data).dropna().reset_index(drop=True)
        frames.append(frame)

    if not frames:
        raise ValueError("No storm had enough track points to build lag features.")
    return pd.concat(frames, ignore_index=True)


def time_based_split(features: pd.DataFrame, test_frac: float = 0.2):
    """Split by TIME, not randomly -- prevents future storms leaking into training."""
    features = features.sort_values("ISO_TIME").reset_index(drop=True)
    cutoff = int(len(features) * (1 - test_frac))
    return features.iloc[:cutoff], features.iloc[cutoff:]


def train(features: pd.DataFrame):
    lag_cols = [c for c in features.columns if "_lag" in c]
    target_cols = [c for c in features.columns if c.startswith("target_")]

    train_df, test_df = time_based_split(features)
    X_train, X_test = train_df[lag_cols], test_df[lag_cols]

    models = {}
    print(f"\nTraining rows: {len(train_df)}  |  Test rows: {len(test_df)}\n")
    for target in target_cols:
        model = XGBRegressor(
            n_estimators=300,
            max_depth=4,
            learning_rate=0.05,
            n_jobs=-1,          # uses all CPU cores -- fine on an i5, no GPU needed
            random_state=42,
        )
        model.fit(X_train, train_df[target])
        preds = model.predict(X_test)
        mae = mean_absolute_error(test_df[target], preds)
        print(f"  {target:20s} MAE: {mae:.3f}")
        models[target] = model

    return models, lag_cols


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Path to IBTrACS NI basin CSV")
    parser.add_argument("--model_out", default="stormsense_model.pkl")
    args = parser.parse_args()

    print("Loading data...")
    df = load_ibtracs(args.input)
    print(f"  {df['SID'].nunique()} storms, {len(df)} track points")

    print("Building lag features...")
    features = build_lag_features(df)
    print(f"  {len(features)} supervised training rows")

    print("Training models (one per predicted variable)...")
    models, lag_cols = train(features)

    joblib.dump({"models": models, "lag_cols": lag_cols, "lag_steps": LAG_STEPS}, args.model_out)
    print(f"\nSaved model bundle to {args.model_out}")


if __name__ == "__main__":
    main()
