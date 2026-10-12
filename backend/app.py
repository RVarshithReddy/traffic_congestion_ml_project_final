from flask import Flask, request, jsonify
from flask_cors import CORS
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import json
import pandas as pd
import numpy as np
import time

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import (
    RandomForestClassifier,
    GradientBoostingClassifier,
    RandomForestRegressor,
    GradientBoostingRegressor
)
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    confusion_matrix
)

BASE = Path(__file__).resolve().parents[1]
DATA_PATH = BASE / "data" / "traffic_congestion_6000.csv"
UPLOAD_DIR = BASE / "data"

app = Flask(__name__)
CORS(app)


# ---------------------------------------------------------
# ORIGINAL PROJECT ROUTES
# ---------------------------------------------------------

ROUTES = {
    "R01": {
        "origin": "Bachupally",
        "destination": "HITEC City",
        "distance_km": 18.0,
        "road_type": "Urban Arterial",
        "lanes": 3,
        "speed_limit_kmh": 50,
        "path": [
            [17.54, 78.37],
            [17.50, 78.39],
            [17.49, 78.41],
            [17.46, 78.40],
            [17.44, 78.38]
        ]
    },
    "R02": {
        "origin": "Bachupally",
        "destination": "HITEC City",
        "distance_km": 20.5,
        "road_type": "Ring Road",
        "lanes": 4,
        "speed_limit_kmh": 60,
        "path": [
            [17.54, 78.37],
            [17.51, 78.35],
            [17.48, 78.36],
            [17.46, 78.37],
            [17.44, 78.38]
        ]
    },
    "R03": {
        "origin": "Bachupally",
        "destination": "HITEC City",
        "distance_km": 17.2,
        "road_type": "Expressway",
        "lanes": 4,
        "speed_limit_kmh": 70,
        "path": [
            [17.54, 78.37],
            [17.51, 78.38],
            [17.48, 78.39],
            [17.46, 78.39],
            [17.44, 78.38]
        ]
    },
    "R04": {
        "origin": "Kukatpally",
        "destination": "HITEC City",
        "distance_km": 12.6,
        "road_type": "Urban Arterial",
        "lanes": 3,
        "speed_limit_kmh": 50,
        "path": [
            [17.49, 78.41],
            [17.47, 78.40],
            [17.45, 78.39],
            [17.44, 78.38]
        ]
    },
    "R05": {
        "origin": "Kukatpally",
        "destination": "HITEC City",
        "distance_km": 14.0,
        "road_type": "Ring Road",
        "lanes": 4,
        "speed_limit_kmh": 60,
        "path": [
            [17.49, 78.41],
            [17.47, 78.43],
            [17.46, 78.41],
            [17.44, 78.38]
        ]
    },
    "R06": {
        "origin": "Miyapur",
        "destination": "Gachibowli",
        "distance_km": 15.2,
        "road_type": "Expressway",
        "lanes": 4,
        "speed_limit_kmh": 70,
        "path": [
            [17.50, 78.36],
            [17.49, 78.36],
            [17.47, 78.36],
            [17.46, 78.36],
            [17.44, 78.35]
        ]
    },
    "R07": {
        "origin": "Miyapur",
        "destination": "Gachibowli",
        "distance_km": 17.0,
        "road_type": "Urban Arterial",
        "lanes": 3,
        "speed_limit_kmh": 50,
        "path": [
            [17.50, 78.36],
            [17.48, 78.38],
            [17.46, 78.39],
            [17.44, 78.35]
        ]
    },
    "R08": {
        "origin": "Secunderabad",
        "destination": "HITEC City",
        "distance_km": 19.5,
        "road_type": "Ring Road",
        "lanes": 4,
        "speed_limit_kmh": 60,
        "path": [
            [17.44, 78.50],
            [17.44, 78.48],
            [17.43, 78.45],
            [17.43, 78.42],
            [17.44, 78.38]
        ]
    },
    "R09": {
        "origin": "LB Nagar",
        "destination": "HITEC City",
        "distance_km": 22.0,
        "road_type": "Ring Road",
        "lanes": 4,
        "speed_limit_kmh": 60,
        "path": [
            [17.35, 78.55],
            [17.36, 78.53],
            [17.39, 78.48],
            [17.41, 78.44],
            [17.44, 78.38]
        ]
    },
    "R10": {
        "origin": "Gachibowli",
        "destination": "Banjara Hills",
        "distance_km": 10.5,
        "road_type": "Urban Arterial",
        "lanes": 3,
        "speed_limit_kmh": 50,
        "path": [
            [17.44, 78.35],
            [17.43, 78.37],
            [17.42, 78.40],
            [17.42, 78.43],
            [17.41, 78.45]
        ]
    },
    "R11": {
        "origin": "Madhapur",
        "destination": "Secunderabad",
        "distance_km": 16.8,
        "road_type": "Urban Arterial",
        "lanes": 3,
        "speed_limit_kmh": 50,
        "path": [
            [17.44, 78.39],
            [17.45, 78.41],
            [17.46, 78.43],
            [17.45, 78.47],
            [17.44, 78.50]
        ]
    },
    "R12": {
        "origin": "Banjara Hills",
        "destination": "Mehdipatnam",
        "distance_km": 8.4,
        "road_type": "Urban Arterial",
        "lanes": 3,
        "speed_limit_kmh": 50,
        "path": [
            [17.41, 78.45],
            [17.40, 78.45],
            [17.40, 78.44],
            [17.39, 78.43]
        ]
    },
    "R13": {
        "origin": "Uppal",
        "destination": "HITEC City",
        "distance_km": 24.0,
        "road_type": "Ring Road",
        "lanes": 4,
        "speed_limit_kmh": 60,
        "path": [
            [17.40, 78.56],
            [17.41, 78.54],
            [17.42, 78.51],
            [17.43, 78.48],
            [17.44, 78.44],
            [17.44, 78.38]
        ]
    },
    "R14": {
        "origin": "Kondapur",
        "destination": "Miyapur",
        "distance_km": 8.8,
        "road_type": "Urban Arterial",
        "lanes": 3,
        "speed_limit_kmh": 50,
        "path": [
            [17.46, 78.37],
            [17.47, 78.37],
            [17.48, 78.36],
            [17.49, 78.36],
            [17.50, 78.36]
        ]
    },
    "R15": {
        "origin": "Kondapur",
        "destination": "Miyapur",
        "distance_km": 10.1,
        "road_type": "Ring Road",
        "lanes": 4,
        "speed_limit_kmh": 60,
        "path": [
            [17.46, 78.37],
            [17.47, 78.39],
            [17.49, 78.38],
            [17.50, 78.36]
        ]
    }
}


state = {
    "df": None,
    "clf": {},
    "reg": {},
    "preprocessor": None,
    "feature_cols": None,
    "cat_cols": None,
    "num_cols": None,
    "metrics": {},
    "confusion": {},
    "importance": [],
    "train_seconds": 0.0,
    "source": "traffic_congestion_6000.csv"
}


BASE_FEATURES = [
    "route_id",
    "distance_km",
    "road_type",
    "lanes",
    "speed_limit_kmh",
    "vehicle_count",
    "avg_speed_kmh",
    "occupancy_pct",
    "rainfall_mm",
    "temperature_c",
    "incident_level",
    "holiday",
    "event_score",
    "day_of_week",
    "hour",
    "is_weekend"
]


# ---------------------------------------------------------
# DATA + ML
# ---------------------------------------------------------

def load_df(path=DATA_PATH):

    df = pd.read_csv(path)

    required = BASE_FEATURES + [
        "travel_time_min",
        "congestion_level"
    ]

    missing = [
        c for c in required
        if c not in df.columns
    ]

    if missing:
        raise ValueError(
            "Missing required columns: "
            + ", ".join(missing)
        )

    df = df.dropna(
        subset=[
            "travel_time_min",
            "congestion_level"
        ]
    ).copy()

    for c in BASE_FEATURES:

        if (
            c in df.columns
            and pd.api.types.is_numeric_dtype(df[c])
        ):
            df[c] = df[c].fillna(
                df[c].median()
            )

    for c in ["route_id", "road_type"]:
        df[c] = df[c].astype(str)

    return df


def train_models(df):

    start = time.perf_counter()

    features = [
        c for c in BASE_FEATURES
        if c in df.columns
    ]

    cat = [
        c for c in ["route_id", "road_type"]
        if c in features
    ]

    num = [
        c for c in features
        if c not in cat
    ]

    X = df[features]
    y = df["congestion_level"]
    yt = df["travel_time_min"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=.2,
        random_state=42,
        stratify=y
    )

    Xt_train, Xt_test, t_train, t_test = train_test_split(
        X,
        yt,
        test_size=.2,
        random_state=42
    )

    pre = ColumnTransformer(
        [
            (
                "cat",
                OneHotEncoder(
                    handle_unknown="ignore",
                    sparse_output=False
                ),
                cat
            ),
            (
                "num",
                "passthrough",
                num
            )
        ],
        remainder="drop"
    )

    models = {

        "Random Forest":
            RandomForestClassifier(
                n_estimators=160,
                max_depth=14,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            ),

        "Gradient Boosting":
            GradientBoostingClassifier(
                n_estimators=120,
                max_depth=3,
                learning_rate=.06,
                random_state=42
            )
    }

    regs = {

        "Random Forest":
            RandomForestRegressor(
                n_estimators=150,
                max_depth=16,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            ),

        "Gradient Boosting":
            GradientBoostingRegressor(
                n_estimators=120,
                max_depth=3,
                learning_rate=.06,
                random_state=42
            )
    }

    clf_pipes = {}
    reg_pipes = {}
    metrics = {}
    cms = {}

    for name, model in models.items():

        pipe = Pipeline(
            [
                ("pre", pre),
                ("model", model)
            ]
        )

        pipe.fit(X_train, y_train)

        pred = pipe.predict(X_test)

        clf_pipes[name] = pipe

        metrics[name] = {

            "accuracy":
                accuracy_score(
                    y_test,
                    pred
                ),

            "precision":
                precision_score(
                    y_test,
                    pred,
                    average="weighted",
                    zero_division=0
                ),

            "recall":
                recall_score(
                    y_test,
                    pred,
                    average="weighted",
                    zero_division=0
                ),

            "f1":
                f1_score(
                    y_test,
                    pred,
                    average="weighted",
                    zero_division=0
                )
        }

        cms[name] = confusion_matrix(
            y_test,
            pred,
            labels=[
                "Low",
                "Medium",
                "High"
            ]
        ).tolist()

    for name, model in regs.items():

        pipe = Pipeline(
            [
                ("pre", pre),
                ("model", model)
            ]
        )

        pipe.fit(
            Xt_train,
            t_train
        )

        pred = pipe.predict(Xt_test)

        reg_pipes[name] = pipe

        metrics[name].update({

            "mae_min":
                mean_absolute_error(
                    t_test,
                    pred
                ),

            "rmse_min":
                mean_squared_error(
                    t_test,
                    pred
                ) ** .5,

            "r2":
                r2_score(
                    t_test,
                    pred
                )
        })

    fitted = clf_pipes["Random Forest"]

    names = list(
        fitted
        .named_steps["pre"]
        .get_feature_names_out()
    )

    vals = (
        fitted
        .named_steps["model"]
        .feature_importances_
    )

    importance = sorted(
        [
            {
                "feature":
                    n.replace(
                        "cat__",
                        ""
                    ).replace(
                        "num__",
                        ""
                    ),

                "importance":
                    float(v)
            }

            for n, v in zip(names, vals)
        ],

        key=lambda x:
            x["importance"],

        reverse=True
    )[:12]

    state.update({

        "df": df,

        "clf":
            clf_pipes,

        "reg":
            reg_pipes,

        "preprocessor":
            pre,

        "feature_cols":
            features,

        "cat_cols":
            cat,

        "num_cols":
            num,

        "metrics":
            metrics,

        "cm_by_model":
            cms,

        "importance":
            importance,

        "train_seconds":
            time.perf_counter() - start
    })

    return metrics


def safe(v, default=0):

    try:
        return float(v)

    except (
        TypeError,
        ValueError
    ):
        return default


# ---------------------------------------------------------
# EXTERNAL MAP SERVICES
# ---------------------------------------------------------

def http_json(url, params=None):

    if params:

        url += (
            "&" if "?" in url else "?"
        ) + urlencode(params)

    req = Request(
        url,
        headers={
            "User-Agent":
                "TrafficLensAI-StudentProject/1.0"
        }
    )

    with urlopen(
        req,
        timeout=12
    ) as response:

        return json.loads(
            response.read()
            .decode("utf-8")
        )


def geocode_place(query):

    q = query.strip()

    if not q:
        return []

    return http_json(
        "https://nominatim.openstreetmap.org/search",

        {
            "q":
                f"{q}, Hyderabad, Telangana, India",

            "format":
                "jsonv2",

            "limit":
                5,

            "countrycodes":
                "in"
        }
    )


# ---------------------------------------------------------
# EDA
# ---------------------------------------------------------
def make_json_safe(value):
    if isinstance(value, dict):
        return {
            str(k): make_json_safe(v)
            for k, v in value.items()
        }

    if isinstance(value, (list, tuple)):
        return [
            make_json_safe(v)
            for v in value
        ]

    if isinstance(value, np.ndarray):
        return [
            make_json_safe(v)
            for v in value.tolist()
        ]

    if isinstance(value, np.integer):
        return int(value)

    if isinstance(value, np.floating):
        if np.isnan(value) or np.isinf(value):
            return None
        return float(value)

    if isinstance(value, np.bool_):
        return bool(value)

    return value
def eda_payload():

    df = state["df"]

    numeric = [
        "distance_km",
        "vehicle_count",
        "avg_speed_kmh",
        "occupancy_pct",
        "rainfall_mm",
        "temperature_c",
        "travel_time_min"
    ]

    summary = []

    for c in numeric:

        summary.append({

            "feature":
                c,

            "mean":
                round(
                    df[c].mean(),
                    2
                ),

            "median":
                round(
                    df[c].median(),
                    2
                ),

            "min":
                round(
                    df[c].min(),
                    2
                ),

            "max":
                round(
                    df[c].max(),
                    2
                ),

            "std":
                round(
                    df[c].std(),
                    2
                )
        })

    hourly = (
        df.groupby("hour")
        .agg(
            avg_travel_time=(
                "travel_time_min",
                "mean"
            ),
            avg_occupancy=(
                "occupancy_pct",
                "mean"
            ),
            vehicles=(
                "vehicle_count",
                "mean"
            )
        )
        .reset_index()
    )

    cong = (
        df["congestion_level"]
        .value_counts()
        .reindex(
            [
                "Low",
                "Medium",
                "High"
            ]
        )
        .fillna(0)
        .reset_index()
    )

    cong.columns = [
        "level",
        "count"
    ]

    routes = (
        df.groupby(
            [
                "route_id",
                "origin",
                "destination"
            ]
        )
        .agg(
            avg_time=(
                "travel_time_min",
                "mean"
            ),
            avg_speed=(
                "avg_speed_kmh",
                "mean"
            ),
            avg_occupancy=(
                "occupancy_pct",
                "mean"
            ),
            records=(
                "route_id",
                "size"
            )
        )
        .reset_index()
    )

    corr = (
        df[numeric]
        .corr()
        .round(3)
        .fillna(0)
    )

    return {

        "shape":
            [
                int(df.shape[0]),
                int(df.shape[1])
            ],

        "missing":
            df.isna()
            .sum()
            .to_dict(),

        "summary":
            summary,

        "hourly":
            hourly
            .round(2)
            .to_dict("records"),

        "congestion":
            cong
            .to_dict("records"),

        "routes":
            routes
            .round(2)
            .to_dict("records"),

        "correlation": {

            "columns":
                list(corr.columns),

            "matrix":
                corr.values.tolist()
        },

        "feature_importance":
            state["importance"]
    }


# ---------------------------------------------------------
# BASIC APIs
# ---------------------------------------------------------

@app.get("/api/health")
def health():

    return jsonify({

        "status":
            "ok",

        "rows":
            int(len(state["df"])),

        "source":
            state["source"]
    })


@app.get("/api/routes")
def routes():

    return jsonify({

        "routes":
            [
                {
                    "route_id": k,
                    **v
                }

                for k, v
                in ROUTES.items()
            ]
    })


@app.get("/api/eda")
def eda():
    data = eda_payload()
    return jsonify(make_json_safe(data))


@app.get("/api/metrics")
def metrics():

    return jsonify({

        "metrics":
            state["metrics"],

        "confusion":
            state.get(
                "cm_by_model",
                {}
            ),

        "train_seconds":
            state["train_seconds"],

        "rows":
            len(state["df"]),

        "features":
            state["feature_cols"],

        "source":
            state["source"]
    })


# ---------------------------------------------------------
# LOCATION SEARCH
# ---------------------------------------------------------

@app.get("/api/geocode")
def geocode():

    query = request.args.get(
        "q",
        ""
    ).strip()

    if len(query) < 2:

        return jsonify({
            "results": []
        })

    try:

        results = geocode_place(
            query
        )

        return jsonify({

            "results":

                [
                    {
                        "display_name":
                            r.get(
                                "display_name",
                                ""
                            ),

                        "lat":
                            float(
                                r["lat"]
                            ),

                        "lon":
                            float(
                                r["lon"]
                            )
                    }

                    for r in results
                ]
        })

    except Exception as e:

        return jsonify({

            "error":
                f"Location search failed: {e}"
        }), 502


# ---------------------------------------------------------
# REAL ROAD ROUTING
# ---------------------------------------------------------

@app.post("/api/route")
def route():

    body = request.get_json(
        force=True
    ) or {}

    try:

        olat = float(
            body["origin"]["lat"]
        )

        olon = float(
            body["origin"]["lon"]
        )

        dlat = float(
            body["destination"]["lat"]
        )

        dlon = float(
            body["destination"]["lon"]
        )

    except (
        KeyError,
        TypeError,
        ValueError
    ):

        return jsonify({

            "error":
                "Valid origin and destination coordinates are required."
        }), 400

    try:

        data = http_json(

            "https://router.project-osrm.org/"
            f"route/v1/driving/"
            f"{olon},{olat};{dlon},{dlat}",

            {
                "overview":
                    "full",

                "geometries":
                    "geojson",

                "alternatives":
                    "true",

                "steps":
                    "false"
            }
        )

        if (
            data.get("code") != "Ok"
            or not data.get("routes")
        ):

            return jsonify({

                "error":
                    "No drivable route was found between these locations."
            }), 404

        routes_out = []

        for i, r in enumerate(
            data["routes"]
        ):

            coords = (
                r["geometry"]
                ["coordinates"]
            )

            path = [
                [
                    float(lat),
                    float(lon)
                ]

                for lon, lat
                in coords
            ]

            routes_out.append({

                "route_id":
                    f"LIVE-{i + 1}",

                "distance_km":
                    round(
                        float(
                            r["distance"]
                        ) / 1000,
                        2
                    ),

                "routing_duration_min":
                    round(
                        float(
                            r["duration"]
                        ) / 60,
                        1
                    ),

                "path":
                    path
            })

        return jsonify({

            "routes":
                routes_out
        })

    except Exception as e:

        return jsonify({

            "error":
                f"Route service failed: {e}"
        }), 502


# ---------------------------------------------------------
# DATASET TRAINING
# ---------------------------------------------------------

@app.post("/api/train")
def train():

    if "file" not in request.files:

        return jsonify({

            "error":
                "Attach a CSV file using field name file."
        }), 400

    f = request.files["file"]

    if not f.filename.lower().endswith(".csv"):

        return jsonify({

            "error":
                "Only CSV files are supported."
        }), 400

    path = (
        UPLOAD_DIR /
        "uploaded_traffic_dataset.csv"
    )

    f.save(path)

    try:

        df = load_df(path)

        train_models(df)

        state["source"] = f.filename

        return jsonify({

            "message":
                "Dataset uploaded and both models retrained.",

            "rows":
                len(df),

            "metrics":
                state["metrics"],

            "train_seconds":
                state["train_seconds"]
        })

    except Exception as e:

        return jsonify({
            "error":
                str(e)
        }), 400


# ---------------------------------------------------------
# ML PREDICTION FOR REAL ROUTES
# ---------------------------------------------------------

@app.post("/api/predict")
def predict():

    body = request.get_json(
        force=True
    ) or {}

    hour = int(
        body.get(
            "hour",
            time.localtime().tm_hour
        )
    )

    dow = int(
        body.get(
            "day_of_week",
            time.localtime().tm_wday
        )
    )

    rain = safe(
        body.get(
            "rainfall_mm",
            0
        )
    )

    temp = safe(
        body.get(
            "temperature_c",
            28
        )
    )

    incident = int(
        body.get(
            "incident_level",
            0
        )
    )

    event = int(
        body.get(
            "event_score",
            0
        )
    )

    holiday = int(
        body.get(
            "holiday",
            0
        )
    )

    vehicles = safe(
        body.get(
            "vehicle_count",
            140
        )
    )

    weekend = int(
        dow >= 5
    )

    routes_in = (
        body.get("routes")
        or []
    )

    origin_name = body.get(
        "origin_name",
        "Origin"
    )

    destination_name = body.get(
        "destination_name",
        "Destination"
    )

    if not routes_in:

        return jsonify({

            "error":
                "No route was supplied. Search the origin and destination first."
        }), 400

    candidates = []

    for r in routes_in:

        distance = safe(
            r.get(
                "distance_km"
            )
        )

        base_duration = safe(
            r.get(
                "routing_duration_min"
            )
        )

        if distance <= 0:
            continue

        avg_speed = max(
            10.0,
            min(
                65.0,
                distance /
                max(
                    base_duration,
                    1 / 60
                ) * 60
            )
        )

        lanes = (
            4
            if distance >= 15
            else 3
        )

        speed_limit = (
            60
            if avg_speed >= 40
            else 50
        )

        occupancy = max(
            28.0,
            min(
                98.0,
                35.0 +
                vehicles / 3.0
            )
        )

        row = {

            "route_id":
                str(
                    r.get(
                        "route_id",
                        "LIVE-1"
                    )
                ),

            "distance_km":
                distance,

            "road_type":
                "Urban Arterial",

            "lanes":
                lanes,

            "speed_limit_kmh":
                speed_limit,

            "vehicle_count":
                vehicles,

            "avg_speed_kmh":
                avg_speed,

            "occupancy_pct":
                occupancy,

            "rainfall_mm":
                rain,

            "temperature_c":
                temp,

            "incident_level":
                incident,

            "holiday":
                holiday,

            "event_score":
                event,

            "day_of_week":
                dow,

            "hour":
                hour,

            "is_weekend":
                weekend
        }

        X = pd.DataFrame(
            [row]
        )[
            state["feature_cols"]
        ]

        predictions = []

        for name in [
            "Random Forest",
            "Gradient Boosting"
        ]:

            cong = (
                state["clf"][name]
                .predict(X)[0]
            )

            ml_time = max(
                1.0,
                float(
                    state["reg"][name]
                    .predict(X)[0]
                )
            )

            predictions.append({

                "model":
                    name,

                "congestion":
                    cong,

                "travel_time_min":
                    round(
                        ml_time,
                        2
                    )
            })

        ml_time = float(
            np.mean(
                [
                    p["travel_time_min"]
                    for p in predictions
                ]
            )
        )

        order = {
            "Low": 0,
            "Medium": 1,
            "High": 2
        }

        congestion = max(
            predictions,
            key=lambda p:
                order.get(
                    p["congestion"],
                    0
                )
        )["congestion"]

        candidates.append({

            "route_id":
                r.get(
                    "route_id",
                    "LIVE-1"
                ),

            "origin":
                origin_name,

            "destination":
                destination_name,

            "distance_km":
                round(
                    distance,
                    2
                ),

            "routing_duration_min":
                round(
                    base_duration,
                    1
                ),

            "predictions":
                predictions,

            "ensemble_travel_time_min":
                round(
                    ml_time,
                    1
                ),

            "estimated_arrival_min":
                round(
                    ml_time,
                    1
                ),

            "ensemble_congestion":
                congestion,

            "path":
                r.get(
                    "path",
                    []
                ),

            "road_type":
                "Urban Arterial"
        })

    if not candidates:

        return jsonify({

            "error":
                "Unable to create a prediction for this route."
        }), 400

    candidates.sort(
        key=lambda x:
            x["ensemble_travel_time_min"]
    )

    for i, c in enumerate(
        candidates
    ):

        c["rank"] = i + 1

    return jsonify({

        "requested": {

            "origin":
                origin_name,

            "destination":
                destination_name,

            "hour":
                hour,

            "day_of_week":
                dow
        },

        "routes":
            candidates,

        "selected_route":
            candidates[0]
    })


# ---------------------------------------------------------
# STARTUP TRAINING
# ---------------------------------------------------------

try:

    _df = load_df(
        DATA_PATH
    )

    train_models(
        _df
    )

except Exception as e:

    print(
        "Startup training failed:",
        e
    )


if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False,
        threaded=True
    )