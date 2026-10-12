import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from 'recharts';

import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Popup,
  useMap
} from 'react-leaflet';

import 'leaflet/dist/leaflet.css';
import './styles.css';


const API = 'http://localhost:5000/api';

const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];


// ---------------------------------------------------------
// MAP HELPERS
// ---------------------------------------------------------

function FitRoutes({ routes }) {
  const map = useMap();

  useEffect(() => {
    if (!routes?.length) return;

    const points = routes.flatMap(
      route => route.path || []
    );

    if (points.length) {
      map.fitBounds(
        points,
        {
          padding: [30, 30]
        }
      );
    }
  }, [routes, map]);

  return null;
}


// ---------------------------------------------------------
// UI HELPERS
// ---------------------------------------------------------

function Stat({ label, value, sub }) {
  return (
    <div className="stat">
      <div className="stat-label">
        {label}
      </div>

      <div className="stat-value">
        {value}
      </div>

      <div className="stat-sub">
        {sub}
      </div>
    </div>
  );
}


function Pill({ children, type = '' }) {
  return (
    <span
      className={`pill ${String(type).toLowerCase()}`}
    >
      {children}
    </span>
  );
}


// ---------------------------------------------------------
// TRAFFIC COLORS
// ---------------------------------------------------------

function trafficColor(level) {
  const value = String(
    level || ''
  ).toLowerCase();

  if (value === 'high') {
    return '#ff4d5e';
  }

  if (
    value === 'medium' ||
    value === 'moderate'
  ) {
    return '#f5b942';
  }

  return '#39d98a';
}


// ---------------------------------------------------------
// MAIN APP
// ---------------------------------------------------------

function App() {

  const now = new Date();

  const [routes, setRoutes] =
    useState([]);

  const [eda, setEda] =
    useState(null);

  const [metrics, setMetrics] =
    useState(null);

  const [prediction, setPrediction] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [file, setFile] =
    useState(null);

  const [message, setMessage] =
    useState('');


  // -------------------------------------------------------
  // LOCATION INPUT
  // -------------------------------------------------------

  const [origin, setOrigin] =
    useState('');

  const [destination, setDestination] =
    useState('');

  const [originPlace, setOriginPlace] =
    useState(null);

  const [destinationPlace, setDestinationPlace] =
    useState(null);

  const [searching, setSearching] =
    useState('');


  // -------------------------------------------------------
  // ML INPUTS
  // -------------------------------------------------------

  const [hour, setHour] =
    useState(
      now.getHours()
    );

  const [day, setDay] =
    useState(
      now.getDay() === 0
        ? 6
        : now.getDay() - 1
    );

  const [vehicles, setVehicles] =
    useState(140);

  const [rain, setRain] =
    useState(0);

  const [temp, setTemp] =
    useState(28);

  const [incident, setIncident] =
    useState(0);

  const [event, setEvent] =
    useState(0);

  const [holiday, setHoliday] =
    useState(0);


  // -------------------------------------------------------
  // LOAD INITIAL DASHBOARD DATA
  // -------------------------------------------------------

  useEffect(() => {

    Promise.all([

      fetch(
        API + '/routes'
      ).then(
        r => r.json()
      ),

      fetch(
        API + '/eda'
      ).then(
        r => r.json()
      ),

      fetch(
        API + '/metrics'
      ).then(
        r => r.json()
      )

    ])
      .then(
        ([routeData, edaData, metricsData]) => {

          setRoutes(
            routeData.routes || []
          );

          setEda(
            edaData
          );

          setMetrics(
            metricsData
          );

        }
      )
      .catch(
        () => {

          setMessage(
            'Start the Flask backend on port 5000 to load the dashboard.'
          );

        }
      );

  }, []);


  // -------------------------------------------------------
  // LOCATION SEARCH
  // -------------------------------------------------------

  const searchPlace = async (
    type
  ) => {

    const query =
      type === 'origin'
        ? origin
        : destination;

    if (
      query.trim().length < 2
    ) {

      setMessage(
        `Enter a ${type} first.`
      );

      return;
    }


    setSearching(
      type
    );

    setMessage(
      `Finding ${type}...`
    );


    try {

      const response =
        await fetch(
          `${API}/geocode?q=${encodeURIComponent(query)}`
        );

      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.error ||
          'Location search failed.'
        );

      }


      if (
        !data.results ||
        !data.results.length
      ) {

        throw new Error(
          `No location found for "${query}". Try a more specific Hyderabad location.`
        );

      }


      const place =
        data.results[0];


      if (
        type === 'origin'
      ) {

        setOriginPlace(
          place
        );

        setOrigin(
          place.display_name
            .split(',')[0]
        );

      } else {

        setDestinationPlace(
          place
        );

        setDestination(
          place.display_name
            .split(',')[0]
        );

      }


      setMessage(
        `${type === 'origin'
          ? 'Origin'
          : 'Destination'} found.`
      );


    } catch (error) {

      setMessage(
        error.message
      );

    } finally {

      setSearching(
        ''
      );

    }
  };


  // -------------------------------------------------------
  // ROUTE + ML PREDICTION
  // -------------------------------------------------------

  const submitPrediction = async () => {

    if (!origin.trim()) {
      setMessage('Please enter an origin.');
      return;
    }

    if (!destination.trim()) {
      setMessage('Please enter a destination.');
      return;
    }

    setLoading(true);
    setPrediction(null);

    try {

      // --------------------------------------------------
      // 1. FIND ORIGIN AUTOMATICALLY
      // --------------------------------------------------

      let finalOrigin = originPlace;

      if (!finalOrigin) {

        setMessage('Finding origin...');

        const originResponse =
          await fetch(
            `${API}/geocode?q=${encodeURIComponent(origin)}`
          );

        const originData =
          await originResponse.json();

        if (!originResponse.ok) {
          throw new Error(
            originData.error ||
            'Could not find the origin.'
          );
        }

        if (
          !originData.results ||
          !originData.results.length
        ) {
          throw new Error(
            `Could not find "${origin}". Try a more specific location.`
          );
        }

        finalOrigin =
          originData.results[0];

        setOriginPlace(
          finalOrigin
        );

        setOrigin(
          finalOrigin.display_name
            .split(',')[0]
        );
      }


      // --------------------------------------------------
      // 2. FIND DESTINATION AUTOMATICALLY
      // --------------------------------------------------

      let finalDestination =
        destinationPlace;

      if (!finalDestination) {

        setMessage(
          'Finding destination...'
        );

        const destinationResponse =
          await fetch(
            `${API}/geocode?q=${encodeURIComponent(destination)}`
          );

        const destinationData =
          await destinationResponse.json();

        if (!destinationResponse.ok) {
          throw new Error(
            destinationData.error ||
            'Could not find the destination.'
          );
        }

        if (
          !destinationData.results ||
          !destinationData.results.length
        ) {
          throw new Error(
            `Could not find "${destination}". Try a more specific location.`
          );
        }

        finalDestination =
          destinationData.results[0];

        setDestinationPlace(
          finalDestination
        );

        setDestination(
          finalDestination.display_name
            .split(',')[0]
        );
      }


      // --------------------------------------------------
      // 3. CHECK SAME LOCATION
      // --------------------------------------------------

      const sameLocation =
        Number(finalOrigin.lat) ===
          Number(finalDestination.lat) &&
        Number(finalOrigin.lon) ===
          Number(finalDestination.lon);

      if (sameLocation) {
        throw new Error(
          'Origin and destination cannot be the same.'
        );
      }


      // --------------------------------------------------
      // 4. CALCULATE REAL ROAD ROUTE
      // --------------------------------------------------

      setMessage(
        'Calculating real road distance and ETA...'
      );

      const routeResponse =
        await fetch(
          API + '/route',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body: JSON.stringify({
              origin:
                finalOrigin,

              destination:
                finalDestination
            })
          }
        );


      const routeData =
        await routeResponse.json();


      if (!routeResponse.ok) {
        throw new Error(
          routeData.error ||
          `Route calculation failed (${routeResponse.status}).`
        );
      }


      if (
        !routeData.routes ||
        !routeData.routes.length
      ) {
        throw new Error(
          'No road route was found between the selected locations.'
        );
      }


      // --------------------------------------------------
      // 5. RUN MACHINE LEARNING
      // --------------------------------------------------

      setMessage(
        'Route found. Running Random Forest + Gradient Boosting...'
      );


      const predictionResponse =
        await fetch(
          API + '/predict',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body: JSON.stringify({

              origin_name:
                finalOrigin.display_name
                  .split(',')[0],

              destination_name:
                finalDestination.display_name
                  .split(',')[0],

              hour:
                hour,

              day_of_week:
                day,

              vehicle_count:
                vehicles,

              rainfall_mm:
                rain,

              temperature_c:
                temp,

              incident_level:
                incident,

              event_score:
                event,

              holiday:
                holiday,

              routes:
                routeData.routes
            })
          }
        );


      const predictionData =
        await predictionResponse.json();


      if (!predictionResponse.ok) {
        throw new Error(
          predictionData.error ||
          `ML prediction failed (${predictionResponse.status}).`
        );
      }


      // --------------------------------------------------
      // 6. SHOW RESULT
      // --------------------------------------------------

      setPrediction(
        predictionData
      );

      setMessage(
        'Complete! Distance, ETA and traffic level calculated.'
      );


    } catch (error) {

      console.error(
        'Traffic prediction error:',
        error
      );

      setMessage(
        error.message ||
        'Something went wrong while calculating the route.'
      );

    } finally {

      setLoading(
        false
      );

    }
  };


  // -------------------------------------------------------
  // CSV UPLOAD
  // -------------------------------------------------------

  const upload = async () => {

    if (!file)
      return;


    setLoading(
      true
    );

    setMessage(
      'Uploading dataset and retraining models...'
    );


    const formData =
      new FormData();

    formData.append(
      'file',
      file
    );


    try {

      const response =
        await fetch(
          API + '/train',
          {
            method: 'POST',
            body: formData
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.error ||
          'Dataset upload failed.'
        );

      }


      setMessage(
        `Retrained on ${data.rows.toLocaleString()} rows in ${data.train_seconds.toFixed(2)}s.`
      );


      const [
        updatedEda,
        updatedMetrics
      ] = await Promise.all([

        fetch(
          API + '/eda'
        ).then(
          r => r.json()
        ),

        fetch(
          API + '/metrics'
        ).then(
          r => r.json()
        )

      ]);


      setEda(
        updatedEda
      );

      setMetrics(
        updatedMetrics
      );


      if (
        originPlace &&
        destinationPlace
      ) {

        await submitPrediction();

      }


    } catch (error) {

      setMessage(
        error.message
      );

    } finally {

      setLoading(
        false
      );

    }
  };


  // -------------------------------------------------------
  // MAP DATA
  // -------------------------------------------------------

  const mapRoutes =
    prediction?.routes || [];

  const selected =
    prediction?.selected_route;


  return (

    <div className="app">


      {/* ==================================================
          HEADER
      ================================================== */}

      <header className="topbar">

        <div className="brand">

          <div className="logo">
            TL
          </div>

          <div>

            <div className="brand-name">
              TrafficLens AI
            </div>

            <div className="brand-sub">
              Congestion intelligence lab
            </div>

          </div>

        </div>


        <div className="header-meta">

          <span className="live-dot"></span>

          ML pipeline online

          <span className="divider"></span>

          Team 2

        </div>

      </header>


      <main>


        {/* ==================================================
            HERO
        ================================================== */}

        <section className="hero">

          <div>

            <div className="eyebrow">
              MACHINE LEARNING • SMART MOBILITY
            </div>


            <h1>

              Traffic Congestion Level

              <br />

              <span>
                Prediction Engine
              </span>

            </h1>


            <p>
              Enter any Hyderabad origin and destination.
              The system finds a real road route, calculates
              distance and routing time, then predicts traffic
              congestion using Random Forest and Gradient Boosting.
            </p>


            <div className="teamline">

              <b>
                P. Laxman Reddy
              </b>

              · 2520030097

              <span>
                and
              </span>

              <b>
                R. Varshith Reddy
              </b>

              · 2520030250

            </div>

          </div>


          <div className="hero-card">

            <div className="mini-label">
              PROJECT TARGET
            </div>

            <div className="target">

              Low

              <i>·</i>

              Medium

              <i>·</i>

              High

            </div>

            <div className="mini-note">

              Road routing + supervised machine learning

            </div>

          </div>

        </section>


        {/* ==================================================
            MESSAGE
        ================================================== */}

        {message && (

          <div className="notice">

            {message}

          </div>

        )}


        {/* ==================================================
            TOP STATS
        ================================================== */}

        <section className="stats-grid">

          <Stat
            label="Dataset rows"
            value={
              metrics?.rows?.toLocaleString() ||
              '—'
            }
            sub="project traffic observations"
          />


          <Stat
            label="Input features"
            value={
              metrics?.features?.length ||
              '—'
            }
            sub="after preprocessing"
          />


          <Stat
            label="Models"
            value="2 + 2"
            sub="classification + travel-time regression"
          />


          <Stat
            label="Training time"
            value={
              metrics
                ? `${metrics.train_seconds.toFixed(2)}s`
                : '—'
            }
            sub="on current machine"
          />

        </section>


        {/* ==================================================
            ROUTE WORKSPACE
        ================================================== */}

        <section className="workspace">


          {/* ------------------------------------------------
              INPUT PANEL
          ------------------------------------------------ */}

          <div className="panel controls">

            <div className="panel-head">

              <div>

                <div className="section-kicker">
                  01 · LIVE ROUTE LAB
                </div>

                <h2>
                  Enter your journey
                </h2>

              </div>


              <Pill>
                Live routing
              </Pill>

            </div>


            <div className="field-grid">


              {/* ORIGIN */}

              <label>

                Origin

                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    marginTop: 6
                  }}
                >

                  <input
                    value={origin}
                    placeholder="e.g. Beeramguda"

                    onChange={(e) => {

                      setOrigin(
                        e.target.value
                      );

                      setOriginPlace(
                        null
                      );

                    }}

                    onKeyDown={(e) => {

                      if (
                        e.key === 'Enter'
                      ) {

                        e.preventDefault();

                        searchPlace(
                          'origin'
                        );

                      }

                    }}
                  />


                  <button
                    type="button"

                    onClick={() =>
                      searchPlace(
                        'origin'
                      )
                    }

                    disabled={
                      searching === 'origin'
                    }

                    style={{
                      border: 'none',
                      borderRadius: 10,
                      padding: '0 16px',
                      fontWeight: 800,
                      cursor:
                        searching === 'origin'
                          ? 'not-allowed'
                          : 'pointer'
                    }}
                  >

                    {searching === 'origin'
                      ? '...'
                      : 'Find'}

                  </button>

                </div>


                {originPlace && (

                  <small
                    style={{
                      display: 'block',
                      marginTop: 6,
                      color: '#39d98a'
                    }}
                  >
                    ✓ {originPlace.display_name}
                  </small>

                )}

              </label>


              {/* DESTINATION */}

              <label>

                Destination

                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    marginTop: 6
                  }}
                >

                  <input
                    value={destination}
                    placeholder="e.g. Gachibowli"

                    onChange={(e) => {

                      setDestination(
                        e.target.value
                      );

                      setDestinationPlace(
                        null
                      );

                    }}

                    onKeyDown={(e) => {

                      if (
                        e.key === 'Enter'
                      ) {

                        e.preventDefault();

                        searchPlace(
                          'destination'
                        );

                      }

                    }}
                  />


                  <button
                    type="button"

                    onClick={() =>
                      searchPlace(
                        'destination'
                      )
                    }

                    disabled={
                      searching ===
                      'destination'
                    }

                    style={{
                      border: 'none',
                      borderRadius: 10,
                      padding: '0 16px',
                      fontWeight: 800,
                      cursor:
                        searching ===
                        'destination'
                          ? 'not-allowed'
                          : 'pointer'
                    }}
                  >

                    {searching ===
                    'destination'
                      ? '...'
                      : 'Find'}

                  </button>

                </div>


                {destinationPlace && (

                  <small
                    style={{
                      display: 'block',
                      marginTop: 6,
                      color: '#ff4d5e'
                    }}
                  >
                    ✓ {destinationPlace.display_name}
                  </small>

                )}

              </label>


              {/* HOUR */}

              <label>

                Hour

                <span>
                  {String(hour).padStart(2, '0')}:00
                </span>

                <input
                  type="range"
                  min="0"
                  max="23"
                  value={hour}

                  onChange={(e) =>
                    setHour(
                      Number(
                        e.target.value
                      )
                    )
                  }
                />

              </label>


              {/* DAY */}

              <label>

                Day

                <select
                  value={day}

                  onChange={(e) =>
                    setDay(
                      Number(
                        e.target.value
                      )
                    )
                  }
                >

                  {DAY_NAMES.map(
                    (name, index) => (

                      <option
                        key={name}
                        value={index}
                      >
                        {name}
                      </option>

                    )
                  )}

                </select>

              </label>


              {/* VEHICLES */}

              <label>

                Vehicles

                <input
                  type="number"
                  min="50"
                  max="500"
                  value={vehicles}

                  onChange={(e) =>
                    setVehicles(
                      Number(
                        e.target.value
                      )
                    )
                  }
                />

              </label>


              {/* RAINFALL */}

              <label>

                Rainfall (mm)

                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={rain}

                  onChange={(e) =>
                    setRain(
                      Number(
                        e.target.value
                      )
                    )
                  }
                />

              </label>


              {/* TEMPERATURE */}

              <label>

                Temperature °C

                <input
                  type="number"
                  value={temp}

                  onChange={(e) =>
                    setTemp(
                      Number(
                        e.target.value
                      )
                    )
                  }
                />

              </label>


              {/* INCIDENT */}

              <label>

                Incident

                <select
                  value={incident}

                  onChange={(e) =>
                    setIncident(
                      Number(
                        e.target.value
                      )
                    )
                  }
                >

                  <option value="0">
                    None
                  </option>

                  <option value="1">
                    Minor
                  </option>

                  <option value="2">
                    Moderate
                  </option>

                  <option value="3">
                    Major
                  </option>

                </select>

              </label>


              {/* EVENT */}

              <label>

                Special event

                <select
                  value={event}

                  onChange={(e) =>
                    setEvent(
                      Number(
                        e.target.value
                      )
                    )
                  }
                >

                  <option value="0">
                    None
                  </option>

                  <option value="1">
                    Low
                  </option>

                  <option value="2">
                    Medium
                  </option>

                  <option value="3">
                    High
                  </option>

                </select>

              </label>


              {/* HOLIDAY */}

              <label>

                Holiday

                <select
                  value={holiday}

                  onChange={(e) =>
                    setHoliday(
                      Number(
                        e.target.value
                      )
                    )
                  }
                >

                  <option value="0">
                    No
                  </option>

                  <option value="1">
                    Yes
                  </option>

                </select>

              </label>

            </div>


            {/* CALCULATE BUTTON */}

            <button
              className="primary"

              onClick={
                submitPrediction
              }

              disabled={loading}
            >

              {loading
                ? 'Calculating route + traffic...'
                : 'Calculate Distance, ETA & Traffic →'}

            </button>


            <div className="logic">

              <span>
                How it works
              </span>

              Search origin

              {' → '}

              search destination

              {' → '}

              road route

              {' → '}

              distance + ETA

              {' → '}

              ML models

              {' → '}

              traffic level.

            </div>

          </div>


          {/* ------------------------------------------------
              MAP PANEL
          ------------------------------------------------ */}

          <div className="panel map-panel">

            <div className="panel-head">

              <div>

                <div className="section-kicker">
                  02 · ROAD MAP
                </div>

                <h2>
                  Route geometry & congestion
                </h2>

              </div>


              {/* MAP LEGEND */}

              <div
                className="map-legend"
                style={{
                  display: 'flex',
                  gap: 12,
                  flexWrap: 'wrap'
                }}
              >

                <span>

                  <span
                    style={{
                      color: '#39d98a',
                      fontSize: 20
                    }}
                  >
                    ━
                  </span>

                  {' '}Low

                </span>


                <span>

                  <span
                    style={{
                      color: '#f5b942',
                      fontSize: 20
                    }}
                  >
                    ━
                  </span>

                  {' '}Medium

                </span>


                <span>

                  <span
                    style={{
                      color: '#ff4d5e',
                      fontSize: 20
                    }}
                  >
                    ━
                  </span>

                  {' '}High

                </span>

              </div>

            </div>


            {/* MAP */}

            <div
              className="map-wrap"
              style={{
                height: 520,
                width: '100%',
                overflow: 'hidden',
                borderRadius: 16
              }}
            >

              <MapContainer

                center={[
                  17.45,
                  78.41
                ]}

                zoom={11}

                scrollWheelZoom={true}

                style={{
                  height: '100%',
                  width: '100%'
                }}

              >

                <TileLayer

                  attribution="&copy; OpenStreetMap contributors"

                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

                />


                {/* ROUTES */}

                {mapRoutes.map(
                  (route, index) => (

                    <Polyline

                      key={
                        route.route_id ||
                        `route-${index}`
                      }

                      positions={
                        route.path || []
                      }

                      pathOptions={{

                        color:
                          trafficColor(
                            route.ensemble_congestion
                          ),

                        weight:
                          index === 0
                            ? 8
                            : 5,

                        opacity:
                          index === 0
                            ? 0.98
                            : 0.58,

                        lineCap:
                          'round',

                        lineJoin:
                          'round'

                      }}

                    >

                      <Popup>

                        <div
                          style={{
                            minWidth: 180
                          }}
                        >

                          <strong>
                            {route.origin}
                            {' → '}
                            {route.destination}
                          </strong>

                          <br />

                          Route:
                          {' '}
                          {route.route_id}

                          <br />

                          Distance:
                          {' '}
                          {route.distance_km}
                          {' km'}

                          <br />

                          Base ETA:
                          {' '}
                          {route.routing_duration_min}
                          {' min'}

                          <br />

                          Predicted time:
                          {' '}
                          {route.ensemble_travel_time_min}
                          {' min'}

                          <br />

                          Traffic:
                          {' '}
                          <strong
                            style={{
                              color:
                                trafficColor(
                                  route.ensemble_congestion
                                )
                            }}
                          >
                            {route.ensemble_congestion}
                          </strong>

                        </div>

                      </Popup>

                    </Polyline>

                  )
                )}


                {/* ORIGIN MARKER */}

                {originPlace && (

                  <CircleMarker

                    center={[
                      Number(
                        originPlace.lat
                      ),

                      Number(
                        originPlace.lon
                      )
                    ]}

                    radius={9}

                    pathOptions={{

                      color:
                        '#ffffff',

                      fillColor:
                        '#39d98a',

                      fillOpacity:
                        1,

                      weight:
                        3

                    }}

                  >

                    <Popup>

                      <strong>
                        Origin
                      </strong>

                      <br />

                      {originPlace.display_name}

                    </Popup>

                  </CircleMarker>

                )}


                {/* DESTINATION MARKER */}

                {destinationPlace && (

                  <CircleMarker

                    center={[
                      Number(
                        destinationPlace.lat
                      ),

                      Number(
                        destinationPlace.lon
                      )
                    ]}

                    radius={9}

                    pathOptions={{

                      color:
                        '#ffffff',

                      fillColor:
                        '#ff4d5e',

                      fillOpacity:
                        1,

                      weight:
                        3

                    }}

                  >

                    <Popup>

                      <strong>
                        Destination
                      </strong>

                      <br />

                      {destinationPlace.display_name}

                    </Popup>

                  </CircleMarker>

                )}


                {/* AUTO FIT */}

                <FitRoutes
                  routes={
                    mapRoutes
                  }
                />

              </MapContainer>

            </div>

          </div>

        </section>


        {/* ==================================================
            TRIP RESULT
        ================================================== */}

        {selected && (

          <section
            className="results"
            style={{
              marginTop: 24
            }}
          >

            <div className="section-kicker">
              03 · TRIP RESULT
            </div>


            <div className="results-head">

              <div>

                <h2>
                  {selected.origin}
                  {' → '}
                  {selected.destination}
                </h2>

                <p>
                  Road routing and machine-learning
                  predictions are shown together so
                  the user can compare the base ETA
                  with the predicted travel time.
                </p>

              </div>


              {/* TRAFFIC BADGE */}

              <div

                className="selected-badge"

                style={{
                  borderColor:
                    trafficColor(
                      selected.ensemble_congestion
                    ),

                  color:
                    trafficColor(
                      selected.ensemble_congestion
                    ),

                  background:
                    `${trafficColor(
                      selected.ensemble_congestion
                    )}15`,

                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px'
                }}

              >

                <span
                  style={{
                    fontSize: 17
                  }}
                >
                  ●
                </span>

                {
                  selected.ensemble_congestion
                }

                {' TRAFFIC'}

              </div>

            </div>


            {/* MAIN TRIP STATS */}

            <div className="stats-grid">

              <Stat

                label="Distance"

                value={
                  `${selected.distance_km} km`
                }

                sub="actual road-route distance"

              />


              <Stat

                label="Base ETA"

                value={
                  `${selected.routing_duration_min} min`
                }

                sub="road-routing estimate"

              />


              <Stat

                label="Predicted Time"

                value={
                  `${selected.ensemble_travel_time_min} min`
                }

                sub="ML ensemble estimate"

              />


              <div

                className="stat"

                style={{
                  borderColor:
                    trafficColor(
                      selected.ensemble_congestion
                    ),

                  boxShadow:
                    `0 0 25px ${trafficColor(
                      selected.ensemble_congestion
                    )}18`
                }}

              >

                <div className="stat-label">
                  Predicted Traffic
                </div>

                <div

                  className="stat-value"

                  style={{
                    color:
                      trafficColor(
                        selected.ensemble_congestion
                      )
                  }}

                >

                  {
                    selected.ensemble_congestion
                  }

                </div>

                <div className="stat-sub">
                  Random Forest + Gradient Boosting
                </div>

              </div>

            </div>


            {/* TRAFFIC ASSESSMENT */}

            <div

              style={{

                marginTop: 18,

                padding: 22,

                borderRadius: 18,

                border:
                  `1px solid ${trafficColor(
                    selected.ensemble_congestion
                  )}55`,

                background:
                  `linear-gradient(
                    135deg,
                    ${trafficColor(
                      selected.ensemble_congestion
                    )}12,
                    rgba(8,16,22,.96)
                  )`,

                display: 'flex',

                justifyContent:
                  'space-between',

                alignItems:
                  'center',

                gap: 20,

                flexWrap: 'wrap'

              }}

            >

              <div>

                <div

                  style={{
                    fontSize: 10,
                    letterSpacing: '.14em',
                    color: '#758995',
                    fontWeight: 800,
                    textTransform: 'uppercase'
                  }}

                >

                  Traffic assessment

                </div>


                <div

                  style={{
                    fontSize: 30,
                    fontWeight: 800,
                    marginTop: 6,
                    color:
                      trafficColor(
                        selected.ensemble_congestion
                      )
                  }}

                >

                  {
                    selected.ensemble_congestion
                  }

                  {' TRAFFIC'}

                </div>


                <div

                  style={{
                    color: '#71838d',
                    fontSize: 11,
                    marginTop: 5
                  }}

                >

                  Prediction generated from the
                  selected route and traffic conditions.

                </div>

              </div>


              {/* MODEL CARDS */}

              <div

                style={{
                  display: 'flex',
                  gap: 10,
                  flexWrap: 'wrap'
                }}

              >

                {(
                  selected.predictions || []
                ).map(
                  model => (

                    <div

                      key={
                        model.model
                      }

                      style={{

                        padding:
                          '13px 15px',

                        borderRadius:
                          12,

                        background:
                          '#0b151b',

                        border:
                          '1px solid #203039',

                        minWidth:
                          165

                      }}

                    >

                      <div

                        style={{
                          fontSize: 9,
                          color: '#667983',
                          textTransform: 'uppercase'
                        }}

                      >

                        {model.model}

                      </div>


                      <div

                        style={{
                          marginTop: 6,
                          fontSize: 21,
                          fontWeight: 800
                        }}

                      >

                        {
                          Number(
                            model.travel_time_min
                          ).toFixed(1)
                        }

                        <span

                          style={{
                            fontSize: 10,
                            color: '#6d7e88',
                            marginLeft: 4
                          }}

                        >
                          min
                        </span>

                      </div>


                      <Pill
                        type={
                          model.congestion
                        }
                      >

                        {
                          model.congestion
                        }

                      </Pill>

                    </div>

                  )
                )}

              </div>

            </div>


            {/* ROUTE COMPARISON */}

            <div
              className="route-cards"
              style={{
                marginTop: 18
              }}
            >

              {(prediction?.routes || [])
                .map(
                  (route, index) => (

                    <div

                      className={
                        `route-card ${
                          index === 0
                            ? 'winner'
                            : ''
                        }`
                      }

                      key={
                        route.route_id
                      }

                    >

                      <div className="route-top">

                        <div>

                          <span className="rank">
                            #{index + 1}
                          </span>

                          <b>
                            {route.route_id}
                          </b>

                          {' '}

                          <Pill
                            type={
                              route.ensemble_congestion
                            }
                          >
                            {
                              route.ensemble_congestion
                            }
                          </Pill>

                        </div>


                        <span>

                          {
                            route.distance_km
                          }

                          {' km'}

                        </span>

                      </div>


                      <div className="route-title">

                        {route.origin}

                        {' → '}

                        {route.destination}

                      </div>


                      <div className="model-times">


                        {/* RF */}

                        <div>

                          <small>
                            Random Forest
                          </small>

                          <strong>

                            {
                              Number(
                                route
                                  .predictions?.[0]
                                  ?.travel_time_min
                              ).toFixed(1)
                            }

                            <em>
                              {' min'}
                            </em>

                          </strong>


                          <Pill
                            type={
                              route
                                .predictions?.[0]
                                ?.congestion
                            }
                          >

                            {
                              route
                                .predictions?.[0]
                                ?.congestion ||
                              '—'
                            }

                          </Pill>

                        </div>


                        {/* GB */}

                        <div>

                          <small>
                            Gradient Boosting
                          </small>

                          <strong>

                            {
                              Number(
                                route
                                  .predictions?.[1]
                                  ?.travel_time_min
                              ).toFixed(1)
                            }

                            <em>
                              {' min'}
                            </em>

                          </strong>


                          <Pill
                            type={
                              route
                                .predictions?.[1]
                                ?.congestion
                            }
                          >

                            {
                              route
                                .predictions?.[1]
                                ?.congestion ||
                              '—'
                            }

                          </Pill>

                        </div>


                        {/* ENSEMBLE */}

                        <div>

                          <small>
                            Ensemble estimate
                          </small>

                          <strong>

                            {
                              Number(
                                route
                                  .ensemble_travel_time_min
                              ).toFixed(1)
                            }

                            <em>
                              {' min'}
                            </em>

                          </strong>


                          <Pill
                            type={
                              route.ensemble_congestion
                            }
                          >

                            {
                              route.ensemble_congestion
                            }

                          </Pill>

                        </div>

                      </div>


                      <div className="route-foot">

                        <span>
                          Real road route
                        </span>


                        <span>

                          Base ETA:

                          {' '}

                          {
                            route.routing_duration_min
                          }

                          {' min'}

                        </span>

                      </div>

                    </div>

                  )
                )}

            </div>

          </section>

        )}


        {/* ==================================================
            DATA PIPELINE
        ================================================== */}

        <section className="upload panel">

          <div>

            <div className="section-kicker">
              04 · DATA PIPELINE
            </div>


            <h2>
              Bring your own CSV
            </h2>


            <p>
              Upload a replacement dataset with
              the project schema. The backend validates
              it, retrains both models and refreshes
              the EDA dashboard.
            </p>


            <div className="schema">

              Required:

              route_id · distance_km · road_type ·
              lanes · speed_limit_kmh · vehicle_count ·
              avg_speed_kmh · occupancy_pct ·
              rainfall_mm · temperature_c ·
              incident_level · holiday · event_score ·
              travel_time_min · congestion_level ·
              day_of_week · hour · is_weekend

            </div>

          </div>


          <div className="upload-box">

            <input

              type="file"

              accept=".csv"

              onChange={
                e =>
                  setFile(
                    e.target.files[0]
                  )
              }

            />


            <div className="file-name">

              {
                file
                  ? file.name
                  : 'Choose traffic CSV'
              }

            </div>


            <button

              className="secondary"

              onClick={
                upload
              }

              disabled={
                !file ||
                loading
              }

            >

              Upload & retrain

            </button>

          </div>

        </section>


        {/* ==================================================
            EDA
        ================================================== */}

        <section className="analytics">

          <div className="section-kicker">
            05 · EDA REPORT
          </div>


          <div className="analytics-grid">


            {/* HOURLY */}

            <div className="panel chart">

              <h3>
                Hourly travel-time profile
              </h3>


              <ResponsiveContainer
                width="100%"
                height={260}
              >

                <AreaChart
                  data={
                    eda?.hourly || []
                  }
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="hour"
                  />

                  <YAxis />

                  <Tooltip />

                  <Legend />

                  <Area

                    type="monotone"

                    dataKey="avg_travel_time"

                    name="Avg travel time (min)"

                    fillOpacity={0.12}

                    strokeWidth={2}

                  />

                </AreaChart>

              </ResponsiveContainer>

            </div>


            {/* CONGESTION BALANCE */}

            <div className="panel chart">

              <h3>
                Congestion class balance
              </h3>


              <ResponsiveContainer
                width="100%"
                height={260}
              >

                <BarChart
                  data={
                    eda?.congestion || []
                  }
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="level"
                  />

                  <YAxis />

                  <Tooltip />

                  <Legend />

                  <Bar
                    dataKey="count"
                    name="Records"
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>


            {/* ROUTE TIME */}

            <div className="panel chart">

              <h3>
                Average travel time by route
              </h3>


              <ResponsiveContainer
                width="100%"
                height={300}
              >

                <BarChart

                  data={
                    (
                      eda?.routes || []
                    ).slice(
                      0,
                      15
                    )
                  }

                  layout="vertical"

                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    type="number"
                  />

                  <YAxis

                    type="category"

                    dataKey="route_id"

                    width={45}

                  />

                  <Tooltip />

                  <Legend />

                  <Bar

                    dataKey="avg_time"

                    name="Minutes"

                  />

                </BarChart>

              </ResponsiveContainer>

            </div>


            {/* FEATURE IMPORTANCE */}

            <div className="panel chart">

              <h3>
                Random Forest feature importance
              </h3>


              <ResponsiveContainer
                width="100%"
                height={300}
              >

                <BarChart

                  data={
                    (
                      eda?.feature_importance || []
                    ).slice(
                      0,
                      10
                    )
                  }

                  layout="vertical"

                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    type="number"
                  />

                  <YAxis

                    type="category"

                    dataKey="feature"

                    width={125}

                  />

                  <Tooltip />

                  <Legend />

                  <Bar

                    dataKey="importance"

                    name="Importance"

                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          </div>

        </section>


        {/* ==================================================
            MODEL BENCHMARK
        ================================================== */}

        <section className="lower-grid">


          <div className="panel">

            <div className="section-kicker">
              06 · MODEL BENCHMARK
            </div>


            <h2>
              Random Forest vs Gradient Boosting
            </h2>


            <div className="benchmark-table">

              <div className="thead">

                <span>
                  Metric
                </span>

                <span>
                  Random Forest
                </span>

                <span>
                  Gradient Boosting
                </span>

              </div>


              {[
                'accuracy',
                'precision',
                'recall',
                'f1',
                'mae_min',
                'rmse_min',
                'r2'
              ].map(
                metric => (

                  <div
                    className="trow"
                    key={metric}
                  >

                    <span>

                      {metric
                        .replace(
                          '_min',
                          ' (min)'
                        )
                        .toUpperCase()}

                    </span>


                    <span>

                      {
                        metrics
                          ?.metrics
                          ?.['Random Forest']
                          ?.[
                            metric
                          ] !== undefined

                          ?

                          (

                            metric.includes(
                              'mae'
                            ) ||

                            metric.includes(
                              'rmse'
                            )

                              ?

                              metrics
                                .metrics
                                ['Random Forest']
                                [metric]
                                .toFixed(2)

                              :

                              metric === 'r2'

                                ?

                                metrics
                                  .metrics
                                  ['Random Forest']
                                  [metric]
                                  .toFixed(3)

                                :

                                (
                                  metrics
                                    .metrics
                                    ['Random Forest']
                                    [metric] *
                                  100
                                ).toFixed(2) + '%'

                          )

                          :

                          '—'
                      }

                    </span>


                    <span>

                      {
                        metrics
                          ?.metrics
                          ?.['Gradient Boosting']
                          ?.[
                            metric
                          ] !== undefined

                          ?

                          (

                            metric.includes(
                              'mae'
                            ) ||

                            metric.includes(
                              'rmse'
                            )

                              ?

                              metrics
                                .metrics
                                ['Gradient Boosting']
                                [metric]
                                .toFixed(2)

                              :

                              metric === 'r2'

                                ?

                                metrics
                                  .metrics
                                  ['Gradient Boosting']
                                  [metric]
                                  .toFixed(3)

                                :

                                (
                                  metrics
                                    .metrics
                                    ['Gradient Boosting']
                                    [metric] *
                                  100
                                ).toFixed(2) + '%'

                          )

                          :

                          '—'
                      }

                    </span>

                  </div>

                )
              )}

            </div>

          </div>


          {/* PROJECT FIT */}

          <div className="panel">

            <div className="section-kicker">
              07 · PROJECT FIT
            </div>


            <h2>
              What this project demonstrates
            </h2>


            <ul className="checklist">

              <li>

                <b>
                  Real location input
                </b>

                <span>
                  Origin and destination are
                  entered by the user instead of
                  being limited to predefined routes.
                </span>

              </li>


              <li>

                <b>
                  Road routing
                </b>

                <span>
                  The system calculates an actual
                  road route, distance and base ETA.
                </span>

              </li>


              <li>

                <b>
                  Traffic classification
                </b>

                <span>
                  Random Forest and Gradient Boosting
                  classify the route into Low, Medium
                  or High congestion.
                </span>

              </li>


              <li>

                <b>
                  Travel-time regression
                </b>

                <span>
                  Both models also estimate travel
                  time for the selected route.
                </span>

              </li>


              <li>

                <b>
                  Ensemble prediction
                </b>

                <span>
                  The two model travel-time estimates
                  are combined for the final prediction.
                </span>

              </li>


              <li>

                <b>
                  Evaluation
                </b>

                <span>
                  Accuracy, precision, recall, F1,
                  MAE, RMSE and R² are displayed.
                </span>

              </li>


              <li>

                <b>
                  Deployment
                </b>

                <span>
                  Flask backend + React dashboard +
                  interactive OpenStreetMap visualization.
                </span>

              </li>

            </ul>

          </div>

        </section>


        {/* ==================================================
            FOOTER
        ================================================== */}

        <footer>

          <span>
            TrafficLens AI · KL University ·
            Machine Learning [25SC2107E]
          </span>

          <span>
            Guided by M. Rani · Section 9
          </span>

        </footer>

      </main>

    </div>
  );
}


// ---------------------------------------------------------
// RENDER
// ---------------------------------------------------------

createRoot(
  document.getElementById('root')
).render(
  <App />
);