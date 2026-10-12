# Traffic Congestion Level Prediction Using Random Forest and Gradient-Boosted Trees

A full-stack ML project based on the submitted KL University Machine Learning project material. It combines:
- 6,000-row route-aware traffic dataset
- EDA and feature analysis
- Random Forest classification + regression
- Gradient Boosting classification + regression
- route comparison and model-selected travel time
- interactive road-map visualization
- CSV upload + retraining
- model benchmark metrics
- React/Vite frontend + Flask/scikit-learn backend

## Project team
- P. Laxman Reddy — 2520030097
- R. Varshith Reddy — 2520030250
- Section 9
- Guide: M. Rani

## Folder structure
```
traffic_congestion_project/
├── data/traffic_congestion_6000.csv
├── backend/app.py
├── backend/requirements.txt
├── backend/README.md
└── frontend/
    ├── package.json
    ├── index.html
    └── src/
        ├── main.jsx
        └── styles.css
```

## 1. Start backend
Open a terminal in `backend`:

```bash
python -m venv .venv
# Windows
.venv\\Scripts\\activate
# macOS/Linux
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Backend: http://localhost:5000

## 2. Start frontend
Open a second terminal in `frontend`:

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

## 3. What to demonstrate
1. Show the 6,000-row dataset upload.
2. Select Bachupally → HITEC City to display three route alternatives.
3. Change the hour, vehicle count, rainfall and incident severity.
4. Click Compare Routes.
5. Explain RF and Gradient Boosting travel-time estimates separately.
6. Explain the ensemble route ranking and congestion label.
7. Open the EDA graphs: hourly trend, class balance, route time and feature importance.
8. Upload the CSV again to demonstrate automatic retraining.

## Dataset note
The included dataset is a project-ready synthetic/curated dataset designed around the project's route prediction use case. It is not presented as live traffic data. Route geometries are demonstration paths and the model outputs are based on the dataset, not a live Google/Map routing engine.
