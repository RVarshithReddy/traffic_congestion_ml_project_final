import pandas as pd, numpy as np
from datetime import datetime, timedelta
from pathlib import Path

rng = np.random.default_rng(42)
N = 6000
routes = [
    ("R01","Bachupally","HITEC City",18.0,"Urban Arterial",3,50,29.0,36.0,[(17.54,78.37),(17.50,78.39),(17.49,78.41),(17.46,78.40),(17.44,78.38)]),
    ("R02","Bachupally","HITEC City",20.5,"Ring Road",4,60,27.0,42.0,[(17.54,78.37),(17.51,78.35),(17.48,78.36),(17.46,78.37),(17.44,78.38)]),
    ("R03","Bachupally","HITEC City",17.2,"Expressway",4,70,23.5,45.0,[(17.54,78.37),(17.51,78.38),(17.48,78.39),(17.46,78.39),(17.44,78.38)]),
    ("R04","Kukatpally","HITEC City",12.6,"Urban Arterial",3,50,20.8,32.0,[(17.49,78.41),(17.47,78.40),(17.45,78.39),(17.44,78.38)]),
    ("R05","Kukatpally","HITEC City",14.0,"Ring Road",4,60,18.8,40.0,[(17.49,78.41),(17.47,78.43),(17.46,78.41),(17.44,78.38)]),
    ("R06","Miyapur","Gachibowli",15.2,"Expressway",4,70,19.0,35.0,[(17.50,78.36),(17.49,78.36),(17.47,78.36),(17.46,78.36),(17.44,78.35)]),
    ("R07","Miyapur","Gachibowli",17.0,"Urban Arterial",3,50,22.0,30.0,[(17.50,78.36),(17.48,78.38),(17.46,78.39),(17.44,78.35)]),
    ("R08","Secunderabad","HITEC City",19.5,"Ring Road",4,60,19.5,42.0,[(17.44,78.50),(17.44,78.48),(17.43,78.45),(17.43,78.42),(17.44,78.38)]),
    ("R09","LB Nagar","HITEC City",22.0,"Ring Road",4,60,22.0,42.0,[(17.35,78.55),(17.36,78.53),(17.39,78.48),(17.41,78.44),(17.44,78.38)]),
    ("R10","Gachibowli","Banjara Hills",10.5,"Urban Arterial",3,50,12.6,28.0,[(17.44,78.35),(17.43,78.37),(17.42,78.40),(17.42,78.43),(17.41,78.45)]),
    ("R11","Madhapur","Secunderabad",16.8,"Urban Arterial",3,50,20.2,32.0,[(17.44,78.39),(17.45,78.41),(17.46,78.43),(17.45,78.47),(17.44,78.50)]),
    ("R12","Banjara Hills","Mehdipatnam",8.4,"Urban Arterial",3,50,10.1,28.0,[(17.41,78.45),(17.40,78.45),(17.40,78.44),(17.39,78.43)]),
    ("R13","Uppal","HITEC City",24.0,"Ring Road",4,60,24.0,45.0,[(17.40,78.56),(17.41,78.54),(17.42,78.51),(17.43,78.48),(17.44,78.44),(17.44,78.38)]),
    ("R14","Kondapur","Miyapur",8.8,"Urban Arterial",3,50,11.0,30.0,[(17.46,78.37),(17.47,78.37),(17.48,78.36),(17.49,78.36),(17.50,78.36)]),
    ("R15","Kondapur","Miyapur",10.1,"Ring Road",4,60,12.0,38.0,[(17.46,78.37),(17.47,78.39),(17.49,78.38),(17.50,78.36)]),
]
rows=[]
start=datetime(2025,1,1,0,0)
for i in range(N):
    rid, origin, dest, dist, road, lanes, limit, base_tt, capacity, coords = routes[i % len(routes)]
    day_offset = int(rng.integers(0, 365))
    hour = int(rng.choice(np.arange(0,24), p=(lambda a: a/a.sum())(np.array([.02,.01,.01,.01,.01,.02,.03,.07,.08,.05,.04,.04,.04,.04,.04,.05,.06,.09,.10,.08,.07,.06,.05,.04]))))
    minute = int(rng.choice([0,10,20,30,40,50]))
    ts = start + timedelta(days=day_offset, hours=hour, minutes=minute)
    dow=ts.weekday(); weekend=int(dow>=5)
    peak = 1 if hour in [7,8,9,17,18,19,20] else 0
    holiday=int(rng.random()<0.035)
    event=int(rng.choice([0,1,2,3], p=[.68,.18,.10,.04]))
    rain=float(max(0, rng.normal(1.5 if rng.random()<.18 else 0.15, 1.8)))
    temp=float(rng.normal(28 if 7<=hour<=20 else 25, 4))
    weather_factor=min(1.5, 1 + rain/18)
    demand = 0.45 + 0.30*peak + 0.10*(not weekend) + 0.05*event + rng.normal(0,.08)
    demand=max(.18,min(1.25,demand))
    vehicle=int(max(80, capacity*5.5*demand*(1+rng.normal(0,.08))))
    occupancy=float(max(10,min(98, 25 + 62*demand + 5*event + 4*rain + rng.normal(0,6))))
    incident=int(rng.choice([0,1,2,3], p=[.80,.12,.06,.02]))
    speed=max(8, limit*(1 - 0.52*(occupancy/100)**1.35 - .05*incident - .025*rain + rng.normal(0,.05)))
    speed=min(limit*1.02, speed)
    delay_factor = 1 + 0.72*(occupancy/100)**1.65 + 0.10*incident + .025*rain + .06*event + rng.normal(0,.035)
    travel_time=float(max(3, base_tt*delay_factor))
    free_time=dist/limit*60
    delay_pct=(travel_time/free_time-1)*100
    if delay_pct < 25: cong="Low"
    elif delay_pct < 60: cong="Medium"
    else: cong="High"
    rows.append({
        "timestamp":ts.isoformat(timespec='minutes'),"route_id":rid,"origin":origin,"destination":dest,
        "distance_km":round(dist,2),"road_type":road,"lanes":lanes,"speed_limit_kmh":limit,
        "vehicle_count":vehicle,"avg_speed_kmh":round(speed,2),"occupancy_pct":round(occupancy,2),
        "rainfall_mm":round(rain,2),"temperature_c":round(temp,2),"incident_level":incident,
        "holiday":holiday,"event_score":event,"travel_time_min":round(travel_time,2),"congestion_level":cong,
        "day_of_week":dow,"hour":hour,"is_weekend":weekend
    })

df=pd.DataFrame(rows)
path=Path('/mnt/data/traffic_congestion_project/data/traffic_congestion_6000.csv')
df.to_csv(path,index=False)
print(path, df.shape)
print(df.head(3).to_string())
print(df['congestion_level'].value_counts())
