# Traffic Congestion ML API

Flask backend for the Traffic Congestion Level Prediction project.

## Run

```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

API runs at `http://localhost:5000`.

### Endpoints
- `GET /api/health`
- `GET /api/routes`
- `GET /api/eda`
- `GET /api/metrics`
- `POST /api/train` with multipart field `file`
- `POST /api/predict` with route/environment JSON
