"""
StormSense - Severe Weather (Hail) Detection Pipeline  [SECOND pipeline]

Data: NOAA Severe Weather Data Inventory (SWDI) cell-based hail CSV, 2015
      (Kaggle: noaa/severe-weather-data-inventory -> hail-2015.csv)

Each row is ONE storm cell at ONE radar volume scan (~4-6 min apart):
    X.ZTIME  UTC timestamp (YYYYMMDDHHMMSS)
    LON/LAT  cell position
    WSR_ID   NEXRAD radar site      CELL_ID  cell identifier at that radar
    RANGE/AZIMUTH  cell position relative to radar (nm / deg)
    SEVPROB  probability of severe hail (%)
    PROB     probability of any hail (%)
    MAXSIZE  maximum expected hail size (inches, radar-derived MESH)
    Missing values use -999 sentinels (no NaNs in the raw file).

ML task (kept SEPARATE from the IBTrACS cyclone-track pipeline):
    Last 3 volume scans of a storm cell
        -> probability that the NEXT scan (~5 min ahead) has
           SEVERE hail: MAXSIZE >= 1.0 inch (NWS severe threshold)

Leakage control: chronological split -- train Jan-Aug 2015, test Sep-Dec 2015.
Model file: severe_weather_model.pkl  (stormsense_model.pkl is NOT touched).

USAGE:
    python prepare_severe_weather.py
"""

import json
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    roc_auc_score,
)
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

# kagglehub cache location printed by download_severe_weather.py
DEFAULT_CSV = os.path.join(
    os.path.expanduser("~"), ".cache", "kagglehub", "datasets", "noaa",
    "severe-weather-data-inventory", "versions", "1", "hail-2015.csv",
)
CSV_PATH = os.environ.get("SWDI_CSV", DEFAULT_CSV)
MODEL_OUT = "severe_weather_model.pkl"
REPORT_OUT = "severe_weather_report.json"

SEVERE_INCHES = 1.0          # NWS severe-hail threshold
MAX_SCAN_GAP_MIN = 30        # scans farther apart than this start a new track
LAGS = 3
TRIVIAL_KEEP_FRAC = 0.20     # keep 20% of no-signal rows for class balance
SEED = 42

TRAIN_END = pd.Timestamp("2015-09-01", tz="UTC")   # Jan-Aug train, Sep-Dec test
FEATURES = (
    [f"{v}_lag{i}" for v in ["maxsize", "prob", "sevprob", "range", "azimuth"] for i in range(1, LAGS + 1)]
    + ["month_sin", "month_cos", "hour_sin", "hour_cos"]
)


def load_swdi(path: str) -> pd.DataFrame:
    """Load the 698 MB CSV (10.8M rows) with tight dtypes, -999 -> NaN."""
    df = pd.read_csv(
        path,
        dtype={
            "X.ZTIME": "int64", "LON": "float32", "LAT": "float32",
            "RANGE": "float32", "AZIMUTH": "float32",
            "SEVPROB": "float32", "PROB": "float32", "MAXSIZE": "float32",
        },
    )
    df.columns = [c.replace("X.Z", "").replace(".", "_").lower() for c in df.columns]
    # -> time, lon, lat, wsr_id, cell_id, range, azimuth, sevprob, prob, maxsize

    df["t"] = pd.to_datetime(
        df["time"].astype("int64").astype(str), format="%Y%m%d%H%M%S", utc=True
    )
    df = df.drop(columns=["time"])
    for col in ["sevprob", "prob", "maxsize"]:
        df.loc[df[col] < 0, col] = np.nan  # -999 sentinel -> NaN
    df["wsr_id"] = df["wsr_id"].astype("category")
    df["cell_id"] = df["cell_id"].astype("category")
    return df


def build_supervised(df: pd.DataFrame) -> pd.DataFrame:
    """
    Vectorised lag features per storm-cell track.
    A track = same (radar, cell) with consecutive scans <= 30 min apart.
    Features: scans t-3, t-2, t-1 -> target: scan t (next, ~5 min ahead).
    """
    df = df.sort_values(["wsr_id", "cell_id", "t"], kind="mergesort").reset_index(drop=True)

    dt = df.groupby(["wsr_id", "cell_id"], sort=False, observed=True)["t"].diff()
    new_track = dt.isna() | (dt > pd.Timedelta(minutes=MAX_SCAN_GAP_MIN))
    df["track_id"] = new_track.cumsum()  # new id whenever a track (re)starts

    tg = df.groupby("track_id", sort=False)
    for i in range(1, LAGS + 1):
        for v in ["maxsize", "prob", "sevprob", "range", "azimuth"]:
            df[f"{v}_lag{i}"] = tg[v].shift(i)

    # Target = the NEXT scan of the same track.
    df["target_maxsize"] = tg["maxsize"].shift(-1)
    df["next_t"] = tg["t"].shift(-1)
    gap_min = (df["next_t"] - df["t"]).dt.total_seconds() / 60.0
    df = df[df["target_maxsize"].notna() & (gap_min <= MAX_SCAN_GAP_MIN)].copy()

    # Time-of-year / time-of-day cyclical features (convective seasonality).
    month = df["t"].dt.month.to_numpy()
    hour = df["t"].dt.hour.to_numpy()
    df["month_sin"] = np.sin(2 * np.pi * month / 12)
    df["month_cos"] = np.cos(2 * np.pi * month / 12)
    df["hour_sin"] = np.sin(2 * np.pi * hour / 24)
    df["hour_cos"] = np.cos(2 * np.pi * hour / 24)

    df["label"] = (df["target_maxsize"] >= SEVERE_INCHES).astype("int8")
    return df


def subsample_trivials(df: pd.DataFrame) -> pd.DataFrame:
    """Drop most rows where the previous scan showed zero storm signal."""
    no_signal = (df["maxsize_lag1"].fillna(0) == 0) & (df["prob_lag1"].fillna(0) == 0)
    rng = np.random.default_rng(SEED)
    keep = ~no_signal | (rng.random(len(df)) < TRIVIAL_KEEP_FRAC)
    return df[keep]


def cyc(d):
    return {k: (float(v) if np.isscalar(v) else v) for k, v in d.items()}


def report_metrics(y_true, proba):
    pred = (proba >= 0.5).astype(int)
    return {
        "roc_auc": float(roc_auc_score(y_true, proba)),
        "pr_auc": float(average_precision_score(y_true, proba)),
        "brier": float(brier_score_loss(y_true, proba)),
        "precision_at_0.5": float((pred & (y_true == 1)).sum() / max(pred.sum(), 1)),
        "recall_at_0.5": float((pred & (y_true == 1)).sum() / max((y_true == 1).sum(), 1)),
        "alert_rate_at_0.5": float(pred.mean()),
    }


def main():
    if not os.path.exists(CSV_PATH):
        raise SystemExit(f"SWDI CSV not found at {CSV_PATH} -- run download_severe_weather.py first")

    print("Loading SWDI hail-2015 (698 MB, 10.8M rows)...", flush=True)
    df = load_swdi(CSV_PATH)
    print(f"  {len(df):,} cell-scan rows", flush=True)

    print("Building per-cell tracks and lag features...", flush=True)
    df = build_supervised(df)
    print(f"  {len(df):,} supervised rows "
          f"({int(df['label'].sum()):,} positive next-scan severe)", flush=True)

    print("Subsampling trivial no-signal rows...", flush=True)
    df = subsample_trivials(df)
    n_pos = int(df["label"].sum())
    n_neg = int((df["label"] == 0).sum())
    print(f"  {len(df):,} rows kept | positive: {n_pos:,} ({100*n_pos/len(df):.1f}%) "
          f"| negative: {n_neg:,}", flush=True)

    train = df[df["t"] < TRAIN_END]
    test = df[df["t"] >= TRAIN_END]
    print(f"Chronological split: train {train['t'].min()} -> {train['t'].max()} "
          f"({len(train):,} rows, {int(train['label'].sum()):,} pos)")
    print(f"                     test  {test['t'].min()} -> {test['t'].max()} "
          f"({len(test):,} rows, {int(test['label'].sum()):,} pos)", flush=True)

    X_tr, y_tr = train[FEATURES].to_numpy(dtype=np.float32), train["label"].to_numpy()
    X_te, y_te = test[FEATURES].to_numpy(dtype=np.float32), test["label"].to_numpy()

    metrics = {"train_period": [str(train["t"].min()), str(train["t"].max())],
               "test_period": [str(test["t"].min()), str(test["t"].max())],
               "train_rows": int(len(train)), "test_rows": int(len(test)),
               "train_pos": int(train["label"].sum()), "test_pos": int(test["label"].sum())}

    # ---- Baseline 1: Logistic Regression (subsample for speed) ----
    print("Training LogisticRegression baseline on a 1.2M-row subsample...", flush=True)
    rng = np.random.default_rng(SEED)
    sub = rng.choice(len(X_tr), size=min(1_200_000, len(X_tr)), replace=False)
    # LR cannot handle NaN (from -999 sentinels); impute 0 = "no hail signal".
    # XGBoost keeps NaN natively and learns the missing-vs-zero distinction.
    lr = make_pipeline(
        SimpleImputer(strategy="constant", fill_value=0.0),
        StandardScaler(),
        LogisticRegression(max_iter=300, C=1.0),
    )
    lr.fit(X_tr[sub], y_tr[sub])
    lr_metrics = report_metrics(y_te, lr.predict_proba(X_te)[:, 1])
    print("  LogisticRegression:", cyc(lr_metrics), flush=True)
    metrics["logistic_regression"] = lr_metrics

    # ---- Main model: XGBoost (hist), balanced with scale_pos_weight ----
    print("Training XGBoost classifier...", flush=True)
    xgb = XGBClassifier(
        n_estimators=200, max_depth=5, learning_rate=0.08,
        subsample=0.85, colsample_bytree=0.85,
        scale_pos_weight=n_neg / max(n_pos, 1),
        tree_method="hist", n_jobs=-1, random_state=SEED,
        eval_metric="aucpr",
    )
    xgb.fit(X_tr, y_tr)
    print("Evaluating on the held-out Sep-Dec 2015 period...", flush=True)
    xgb_metrics = report_metrics(y_te, xgb.predict_proba(X_te)[:, 1])
    print("  XGBoost:", cyc(xgb_metrics), flush=True)
    metrics["xgboost"] = xgb_metrics

    joblib.dump({
        "model": xgb,
        "features": FEATURES,
        "lag_steps": LAGS,
        "severe_inches": SEVERE_INCHES,
        "max_scan_gap_min": MAX_SCAN_GAP_MIN,
        "metrics": metrics,
    }, MODEL_OUT)
    with open(REPORT_OUT, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print(f"\nSaved model bundle to {MODEL_OUT}")
    print(f"Saved metrics report to {REPORT_OUT}")
    print("DONE")


if __name__ == "__main__":
    main()
