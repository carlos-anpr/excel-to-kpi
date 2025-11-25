"""
Servicio de Recomendaciones de Dashboard
Genera sugerencias inteligentes de KPIs y gráficos basados en el análisis de datos.
"""
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional


def _to_native(val):
    """Convierte valores numpy/pandas a tipos nativos de Python para JSON."""
    if isinstance(val, (np.integer, np.int64, np.int32)):
        return int(val)
    elif isinstance(val, (np.floating, np.float64, np.float32)):
        return float(val)
    elif isinstance(val, np.ndarray):
        return val.tolist()
    elif pd.isna(val):
        return None
    return val


def _sanitize_dict(d: dict) -> dict:
    """Convierte recursivamente todos los valores numpy en un diccionario a tipos nativos."""
    result = {}
    for k, v in d.items():
        if isinstance(v, dict):
            result[k] = _sanitize_dict(v)
        elif isinstance(v, list):
            result[k] = [_sanitize_dict(i) if isinstance(i, dict) else _to_native(i) for i in v]
        else:
            result[k] = _to_native(v)
    return result


class RecommendationsService:
    """Genera recomendaciones inteligentes para dashboards."""
    
    # Palabras clave para detectar tipos de columnas
    DATE_KEYWORDS = ['date', 'fecha', 'time', 'tiempo', 'year', 'año', 'month', 'mes', 'day', 'dia', 'period', 'periodo', 'created', 'updated']
    CURRENCY_KEYWORDS = ['price', 'precio', 'cost', 'coste', 'revenue', 'ingreso', 'profit', 'beneficio', 'sales', 'venta', 'amount', 'importe', 'total', 'discount', 'descuento', 'budget', 'presupuesto']
    QUANTITY_KEYWORDS = ['quantity', 'cantidad', 'units', 'unidades', 'count', 'num', 'qty', 'stock']
    CATEGORY_KEYWORDS = ['category', 'categoria', 'segment', 'segmento', 'region', 'country', 'pais', 'city', 'ciudad', 'type', 'tipo', 'product', 'producto', 'customer', 'cliente', 'status', 'estado', 'channel', 'canal']
    ID_KEYWORDS = ['id', '_id', 'code', 'codigo', 'key', 'clave', 'number', 'numero', 'ref', 'reference']
    
    @staticmethod
    def get_column_analysis(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Analiza las columnas del DataFrame y clasifica cada una.
        
        Returns:
            Dict con clasificación de columnas y metadatos
        """
        analysis = {
            'date_columns': [],
            'numeric_columns': [],
            'category_columns': [],
            'id_columns': [],
            'text_columns': [],
            'column_details': {}
        }
        
        for col in df.columns:
            col_lower = col.lower()
            col_info = {
                'name': col,
                'dtype': str(df[col].dtype),
                'nunique': int(df[col].nunique()),
                'null_pct': round(float(df[col].isnull().sum() / len(df) * 100), 1),
                'sample_values': [str(v) for v in df[col].dropna().head(3).tolist()]
            }
            
            # Detectar columnas de ID (excluir de análisis)
            if any(k in col_lower for k in RecommendationsService.ID_KEYWORDS):
                analysis['id_columns'].append(col)
                col_info['type'] = 'id'
                analysis['column_details'][col] = col_info
                continue
            
            # Detectar fechas
            if pd.api.types.is_datetime64_any_dtype(df[col]):
                analysis['date_columns'].append(col)
                col_info['type'] = 'date'
            elif any(k in col_lower for k in RecommendationsService.DATE_KEYWORDS):
                try:
                    pd.to_datetime(df[col].dropna().head(100), errors='raise')
                    analysis['date_columns'].append(col)
                    col_info['type'] = 'date'
                except:
                    pass
            
            # Detectar numéricos
            if pd.api.types.is_numeric_dtype(df[col]) and col not in analysis['date_columns']:
                analysis['numeric_columns'].append(col)
                col_info['type'] = 'numeric'
                col_info['sum'] = _to_native(df[col].sum())
                col_info['mean'] = _to_native(df[col].mean())
                col_info['is_currency'] = any(k in col_lower for k in RecommendationsService.CURRENCY_KEYWORDS)
                col_info['is_quantity'] = any(k in col_lower for k in RecommendationsService.QUANTITY_KEYWORDS)
            
            # Detectar categorías
            elif df[col].dtype == 'object' or pd.api.types.is_categorical_dtype(df[col]):
                nunique = df[col].nunique()
                if 2 <= nunique <= 50:
                    analysis['category_columns'].append(col)
                    col_info['type'] = 'category'
                elif any(k in col_lower for k in RecommendationsService.CATEGORY_KEYWORDS):
                    analysis['category_columns'].append(col)
                    col_info['type'] = 'category'
                else:
                    analysis['text_columns'].append(col)
                    col_info['type'] = 'text'
            
            analysis['column_details'][col] = col_info
        
        return analysis
    
    @staticmethod
    def generate_recommendations(df: pd.DataFrame, existing_config: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Genera recomendaciones de ALTO VALOR basadas en análisis real de los datos.
        Solo recomienda visualizaciones que aporten insights significativos.
        
        Args:
            df: DataFrame con los datos
            existing_config: Configuración existente del dashboard (para evitar duplicados)
            
        Returns:
            Dict con recomendaciones de KPIs y gráficos
        """
        analysis = RecommendationsService.get_column_analysis(df)
        
        # Extraer configuración existente
        existing_kpis = set(existing_config.get('kpis', [])) if existing_config else set()
        existing_charts = existing_config.get('charts', []) if existing_config else []
        
        # Crear firmas de gráficos existentes (xAxis + métricas usadas)
        used_combinations = set()
        for chart in existing_charts:
            y_axis = chart.get('yAxis', [])
            x_axis = chart.get('xAxis', '') or ''
            breakdown = chart.get('breakdown', '') or ''
            if x_axis and y_axis:
                # Firma única: combinación completa
                for metric in y_axis:
                    used_combinations.add(f"{x_axis}|{metric}|{breakdown}")
        
        recommendations = {
            'summary': {},
            'kpi_recommendations': [],
            'chart_recommendations': [],
            'analysis': analysis
        }
        
        # --- KPIs: Solo métricas numéricas relevantes ---
        kpi_candidates = []
        for col in analysis['numeric_columns']:
            if col in existing_kpis:
                continue
            details = analysis['column_details'].get(col, {})
            
            # Solo recomendar si tiene valores significativos
            col_sum = details.get('sum', 0)
            if col_sum == 0:
                continue
                
            if details.get('is_currency') or details.get('is_quantity'):
                kpi_candidates.append({
                    'column': col,
                    'priority': 'high',
                    'reason': f"Métrica clave de negocio: {col}",
                    'preview_value': col_sum
                })
            else:
                kpi_candidates.append({
                    'column': col,
                    'priority': 'medium', 
                    'reason': f"Valor agregable: {col}",
                    'preview_value': col_sum
                })
        
        # Limitar a 3 KPIs máximo
        kpi_candidates.sort(key=lambda x: 0 if x['priority'] == 'high' else 1)
        recommendations['kpi_recommendations'] = kpi_candidates[:3]
        
        # --- GRÁFICOS DE ALTO VALOR ---
        chart_candidates = []
        
        # Analizar qué combinaciones aportan valor real
        def calculate_insight_value(x_col: str, y_col: str, breakdown_col: str = None) -> dict:
            """
            Calcula el valor de insight de una combinación.
            Retorna None si no aporta valor significativo.
            """
            try:
                if breakdown_col:
                    # Gráfico con agrupación - verificar que hay variación entre grupos
                    grouped = df.groupby([x_col, breakdown_col])[y_col].sum().unstack(fill_value=0)
                    if grouped.empty or len(grouped.columns) < 2:
                        return None
                    
                    # Calcular variación entre grupos
                    variation = grouped.std(axis=1).mean() / (grouped.mean(axis=1).mean() + 0.001)
                    if variation < 0.1:  # Menos del 10% de variación = no interesante
                        return None
                    
                    return {
                        'value': variation,
                        'insight': f"Hay diferencias significativas en {y_col} entre los diferentes {breakdown_col}",
                        'type': 'grouped'
                    }
                else:
                    # Gráfico simple - verificar que hay tendencia o distribución interesante
                    grouped = df.groupby(x_col)[y_col].sum()
                    if len(grouped) < 2:
                        return None
                    
                    # Calcular coeficiente de variación
                    cv = grouped.std() / (grouped.mean() + 0.001)
                    if cv < 0.15:  # Muy poca variación
                        return None
                    
                    return {
                        'value': cv,
                        'insight': f"Distribución variable de {y_col} por {x_col}",
                        'type': 'simple'
                    }
            except:
                return None
        
        # 1. PRIORIDAD ALTA: Gráficos con agrupación que muestran comparativas
        if analysis['category_columns'] and analysis['numeric_columns']:
            best_category = analysis['category_columns'][0]  # Mejor categoría para agrupar
            
            for date_col in analysis['date_columns'][:1]:  # Solo la fecha principal
                for num_col in analysis['numeric_columns'][:2]:  # Top 2 métricas
                    sig = f"{date_col}|{num_col}|{best_category}"
                    if sig in used_combinations:
                        continue
                    
                    insight = calculate_insight_value(date_col, num_col, best_category)
                    if insight:
                        chart_candidates.append({
                            'title': f'{num_col} por {best_category} (Tendencia)',
                            'xAxis': date_col,
                            'yAxis': [num_col],
                            'breakdown': best_category,
                            'priority': 'high',
                            'reason': insight['insight'],
                            'chart_type_suggestion': 'stacked_bar',
                            '_score': insight['value'] * 2  # Multiplicador por ser agrupado
                        })
            
            # Gráfico categórico con agrupación
            if len(analysis['category_columns']) >= 2:
                cat1 = analysis['category_columns'][0]
                cat2 = analysis['category_columns'][1]
                for num_col in analysis['numeric_columns'][:1]:
                    sig = f"{cat1}|{num_col}|{cat2}"
                    if sig in used_combinations:
                        continue
                    
                    insight = calculate_insight_value(cat1, num_col, cat2)
                    if insight:
                        chart_candidates.append({
                            'title': f'{num_col} por {cat1} y {cat2}',
                            'xAxis': cat1,
                            'yAxis': [num_col],
                            'breakdown': cat2,
                            'priority': 'high',
                            'reason': insight['insight'],
                            'chart_type_suggestion': 'grouped_bar',
                            '_score': insight['value'] * 2
                        })
        
        # 2. PRIORIDAD MEDIA: Gráficos simples pero con variación significativa
        for cat_col in analysis['category_columns'][:2]:
            for num_col in analysis['numeric_columns'][:2]:
                sig = f"{cat_col}|{num_col}|"
                if sig in used_combinations:
                    continue
                
                insight = calculate_insight_value(cat_col, num_col)
                if insight:
                    chart_candidates.append({
                        'title': f'{num_col} por {cat_col}',
                        'xAxis': cat_col,
                        'yAxis': [num_col],
                        'breakdown': None,
                        'priority': 'medium',
                        'reason': insight['insight'],
                        'chart_type_suggestion': 'bar',
                        '_score': insight['value']
                    })
        
        # 3. Gráficos temporales simples (solo si hay fecha y aporta valor)
        for date_col in analysis['date_columns'][:1]:
            for num_col in analysis['numeric_columns'][:1]:
                sig = f"{date_col}|{num_col}|"
                if sig in used_combinations:
                    continue
                
                insight = calculate_insight_value(date_col, num_col)
                if insight:
                    chart_candidates.append({
                        'title': f'Evolución de {num_col}',
                        'xAxis': date_col,
                        'yAxis': [num_col],
                        'breakdown': None,
                        'priority': 'medium',
                        'reason': insight['insight'],
                        'chart_type_suggestion': 'line',
                        '_score': insight['value']
                    })
        
        # Ordenar por score y limitar a 4 gráficos máximo
        chart_candidates.sort(key=lambda x: x.get('_score', 0), reverse=True)
        
        # Limpiar el campo interno _score antes de devolver
        for c in chart_candidates:
            c.pop('_score', None)
        
        recommendations['chart_recommendations'] = chart_candidates[:4]
        
        # --- Generar resumen ---
        total_kpis = len(recommendations['kpi_recommendations'])
        total_charts = len(recommendations['chart_recommendations'])
        
        recommendations['summary'] = {
            'total_columns': len(df.columns),
            'total_rows': len(df),
            'date_columns_found': len(analysis['date_columns']),
            'numeric_columns_found': len(analysis['numeric_columns']),
            'category_columns_found': len(analysis['category_columns']),
            'recommended_kpis': total_kpis,
            'recommended_charts': total_charts,
            'message': RecommendationsService._generate_summary_message(
                total_kpis, 
                total_charts,
                analysis
            )
        }
        
        return _sanitize_dict(recommendations)
    
    @staticmethod
    def get_next_recommendation(df: pd.DataFrame, existing_config: Dict, rec_type: str = 'chart') -> Dict:
        """
        Obtiene la siguiente mejor recomendación que no esté ya añadida.
        
        Args:
            df: DataFrame con los datos
            existing_config: Configuración actual del dashboard
            rec_type: 'kpi' o 'chart'
            
        Returns:
            Dict con 'recommendation' o 'message' si no hay más
        """
        recommendations = RecommendationsService.generate_recommendations(df, existing_config)
        
        if rec_type == 'kpi':
            recs = recommendations.get('kpi_recommendations', [])
            if recs:
                return {'recommendation': recs[0]}
            else:
                return {'message': RecommendationsService.get_no_more_recommendations_message('kpi')}
        else:
            recs = recommendations.get('chart_recommendations', [])
            if recs:
                return {'recommendation': recs[0]}
            else:
                return {'message': RecommendationsService.get_no_more_recommendations_message('chart')}
    
    @staticmethod
    def _generate_summary_message(kpi_count: int, chart_count: int, analysis: Dict) -> str:
        """Genera un mensaje descriptivo de las recomendaciones."""
        if kpi_count == 0 and chart_count == 0:
            return "✅ Ya tienes todas las visualizaciones de valor para este dataset. No hay más insights significativos que añadir."
        
        parts = []
        if kpi_count > 0:
            parts.append(f"**{kpi_count} KPI{'s' if kpi_count > 1 else ''}**")
        if chart_count > 0:
            parts.append(f"**{chart_count} gráfico{'s' if chart_count > 1 else ''}** con insights relevantes")
        
        return f"Te recomendamos añadir {' y '.join(parts)}."
    
    @staticmethod
    def get_no_more_recommendations_message(rec_type: str) -> str:
        """Mensaje cuando no hay más recomendaciones disponibles."""
        if rec_type == 'kpi':
            return "✅ No hay más KPIs de valor para añadir. Ya tienes las métricas más relevantes."
        else:
            return "✅ No hay más gráficos con insights significativos. Los datos no presentan patrones adicionales interesantes para visualizar."
