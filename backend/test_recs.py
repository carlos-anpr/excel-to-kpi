from app.services.recommendations_service import RecommendationsService
import pandas as pd

# Simular datos
df = pd.DataFrame({
    'Date': ['2024-01-01']*10,
    'Segment': ['A','B']*5,
    'Manufacturing Price': [100,200,150,180,120,90,110,130,140,160],
    'Sale Price': [150,250,200,220,180,140,160,180,190,210]
})

# Config con gráficos existentes
existing = {
    'kpis': [],
    'charts': [
        {'xAxis': 'Date', 'yAxis': ['Manufacturing Price'], 'breakdown': None},
        {'xAxis': 'Date', 'yAxis': ['Manufacturing Price'], 'breakdown': 'Segment'},
    ]
}

print("=== TEST 1: Con gráficos existentes ===")
recs = RecommendationsService.generate_recommendations(df, existing)
print(f"Charts recomendados: {len(recs['chart_recommendations'])}")
for c in recs['chart_recommendations']:
    print(f"  - {c['title']}: X={c['xAxis']}, Y={c['yAxis']}, Breakdown={c['breakdown']}")

print("\n=== TEST 2: Sin gráficos existentes ===")
recs2 = RecommendationsService.generate_recommendations(df, {'kpis': [], 'charts': []})
print(f"Charts recomendados: {len(recs2['chart_recommendations'])}")
for c in recs2['chart_recommendations']:
    print(f"  - {c['title']}: X={c['xAxis']}, Y={c['yAxis']}, Breakdown={c['breakdown']}")

print("\n=== TEST 3: Llamadas sucesivas simulando clicks ===")
config = {'kpis': [], 'charts': []}
for i in range(5):
    result = RecommendationsService.get_next_recommendation(df, config, 'chart')
    if 'recommendation' in result:
        rec = result['recommendation']
        print(f"Click {i+1}: {rec['title']} - X={rec['xAxis']}, Y={rec['yAxis']}, Breakdown={rec['breakdown']}")
        # Añadir al config
        config['charts'].append({
            'xAxis': rec['xAxis'],
            'yAxis': rec['yAxis'],
            'breakdown': rec['breakdown']
        })
    else:
        print(f"Click {i+1}: {result['message']}")
        break
