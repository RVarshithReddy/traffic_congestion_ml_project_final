from pathlib import Path
import pandas as pd
p=Path(__file__).resolve().parents[1]/'data'/'traffic_congestion_6000.csv'
df=pd.read_csv(p)
print('Rows:',len(df),'Columns:',len(df.columns),'Routes:',df.route_id.nunique())
print('\nClass distribution:\n',df.congestion_level.value_counts())
print('\nMissing values:\n',df.isna().sum()[df.isna().sum()>0])
print('\nRoute pairs:\n',df.groupby(['route_id','origin','destination']).size().to_string())
