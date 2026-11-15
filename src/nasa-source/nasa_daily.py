import csv, sys, json, collections, statistics as st
d = collections.OrderedDict()
for r in csv.DictReader(open(sys.argv[1], newline='')):
    d.setdefault(r['Controller_Time_GMT'][:10], []).append(float(r['CO2_ppm_ISS']))
out = [[k, round(st.mean(v)), int(min(v)), int(max(v)), len(v)] for k, v in d.items()]
for o in out: print(o)
rad = [[r['Date']] + [float(r[k]) for k in ('GCR_Dose_mGy_d','SAA_Dose_mGy_d','Total_Dose_mGy_d','Accumulated_Dose_mGy_d')] for r in csv.DictReader(open(sys.argv[2], newline=''))]
json.dump({'co2': [o[:4] for o in out], 'rad': rad}, open(sys.argv[3], 'w'), separators=(',', ':'))
acc = 0; bad = 0
for r in rad:
    acc += r[3]
    if abs(acc - r[4]) > 0.06: bad += 1
print('rows where running sum of Total differs from Accumulated by >0.06:', bad, 'final sum', round(acc, 2), 'vs', rad[-1][4])
