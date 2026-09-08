"""
Servicio de Insights Automáticos
Genera análisis inteligente adaptativo según el tipo de datos detectado.
"""
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime


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


class InsightsService:
    """Genera insights automáticos a partir de un DataFrame."""
    
    # Palabras clave para detectar tipos de columnas
    DATE_KEYWORDS = ['date', 'fecha', 'time', 'tiempo', 'year', 'año', 'month', 'mes', 'day', 'dia', 'period', 'periodo']
    CURRENCY_KEYWORDS = ['price', 'precio', 'cost', 'coste', 'revenue', 'ingreso', 'profit', 'beneficio', 'sales', 'venta', 'amount', 'importe', 'total', 'discount', 'descuento']
    QUANTITY_KEYWORDS = ['quantity', 'cantidad', 'units', 'unidades', 'count', 'num', 'qty']
    CATEGORY_KEYWORDS = ['category', 'categoria', 'segment', 'segmento', 'region', 'country', 'pais', 'city', 'ciudad', 'type', 'tipo', 'product', 'producto', 'customer', 'cliente']
    
    @staticmethod
    def generate_insights(df: pd.DataFrame, mapping: Optional[dict] = None) -> List[Dict[str, Any]]:
        """
        Genera insights automáticos basados en el análisis del DataFrame.
        
        Args:
            df: DataFrame con los datos
            mapping: Mapeo opcional de columnas (si existe configuración previa)
            
        Returns:
            Lista de insights con tipo, mensaje, severidad y datos adicionales
        """
        insights = []
        
        # 1. Análisis de estructura del dataset
        insights.extend(InsightsService._analyze_dataset_structure(df))
        
        # 2. Detectar y analizar columnas numéricas
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        for col in numeric_cols:
            insights.extend(InsightsService._analyze_numeric_column(df, col))
        
        # 3. Detectar y analizar columnas de fecha
        date_cols = InsightsService._detect_date_columns(df)
        for col in date_cols:
            if numeric_cols:  # Solo si hay métricas numéricas
                insights.extend(InsightsService._analyze_temporal_trends(df, col, numeric_cols))
        
        # 4. Analizar columnas categóricas con métricas
        cat_cols = InsightsService._detect_category_columns(df)
        for col in cat_cols:
            if numeric_cols:
                insights.extend(InsightsService._analyze_categorical_performance(df, col, numeric_cols))
        
        # 5. Detectar correlaciones importantes
        if len(numeric_cols) >= 2:
            insights.extend(InsightsService._analyze_correlations(df, numeric_cols))
        
        # 6. Análisis de calidad de datos
        insights.extend(InsightsService._analyze_data_quality(df))
        
        # Ordenar por prioridad (high > medium > low) y limitar a los más relevantes
        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        insights.sort(key=lambda x: priority_order.get(x.get('priority', 'low'), 2))
        
        # Sanitizar todos los valores numpy a tipos nativos de Python
        sanitized_insights = [_sanitize_dict(insight) for insight in insights[:12]]
        
        return sanitized_insights  # Máximo 12 insights para no saturar
    
    @staticmethod
    def _analyze_dataset_structure(df: pd.DataFrame) -> List[Dict]:
        """Analiza la estructura general del dataset."""
        insights = []
        
        rows, cols = df.shape
        
        # Insight sobre tamaño del dataset
        if rows > 10000:
            insights.append({
                'type': 'info',
                'icon': '📊',
                'title': 'Dataset Grande',
                'message': f'Tu dataset tiene {rows:,} registros y {cols} columnas. Los análisis pueden tardar más.',
                'priority': 'low'
            })
        elif rows < 100:
            insights.append({
                'type': 'warning',
                'icon': '⚠️',
                'title': 'Dataset Pequeño',
                'message': f'Solo hay {rows} registros. Los insights estadísticos pueden no ser representativos.',
                'priority': 'medium'
            })
        
        return insights
    
    @staticmethod
    def _analyze_numeric_column(df: pd.DataFrame, col: str) -> List[Dict]:
        """Analiza una columna numérica buscando patrones y anomalías."""
        insights = []
        series = pd.to_numeric(df[col], errors='coerce').dropna()
        
        if len(series) == 0:
            return insights
        
        mean = series.mean()
        std = series.std()
        median = series.median()
        min_val = series.min()
        max_val = series.max()
        
        # Detectar outliers (valores fuera de 2 desviaciones estándar)
        if std > 0:
            outliers_high = series[series > mean + 2 * std]
            outliers_low = series[series < mean - 2 * std]
            total_outliers = len(outliers_high) + len(outliers_low)
            
            if total_outliers > 0:
                pct = (total_outliers / len(series)) * 100
                if pct > 5:
                    insights.append({
                        'type': 'warning',
                        'icon': '🔍',
                        'title': f'Valores Atípicos en {col}',
                        'message': f'Hay {total_outliers} valores atípicos ({pct:.1f}% del total) que podrían requerir revisión.',
                        'priority': 'medium',
                        'data': {
                            'column': col,
                            'outlier_count': total_outliers,
                            'percentage': round(pct, 1)
                        }
                    })
        
        # Detectar asimetría significativa (diferencia entre media y mediana)
        if mean != 0:
            skew_ratio = abs(mean - median) / abs(mean)
            if skew_ratio > 0.3:
                direction = "valores muy altos" if mean > median else "valores muy bajos"
                insights.append({
                    'type': 'info',
                    'icon': '📈',
                    'title': f'Distribución Sesgada en {col}',
                    'message': f'Los datos están sesgados hacia {direction}. La mediana ({median:,.2f}) difiere significativamente del promedio ({mean:,.2f}).',
                    'priority': 'low',
                    'data': {
                        'column': col,
                        'mean': round(mean, 2),
                        'median': round(median, 2)
                    }
                })
        
        # Detectar rango extremo
        if min_val != 0 and max_val / abs(min_val) > 100:
            insights.append({
                'type': 'info',
                'icon': '📏',
                'title': f'Gran Variabilidad en {col}',
                'message': f'El rango va desde {min_val:,.2f} hasta {max_val:,.2f}. Considera normalizar o segmentar los datos.',
                'priority': 'low',
                'data': {
                    'column': col,
                    'min': round(min_val, 2),
                    'max': round(max_val, 2)
                }
            })
        
        # Insight de resumen para columnas tipo "ventas", "profit", etc.
        col_lower = col.lower()
        is_currency = any(k in col_lower for k in InsightsService.CURRENCY_KEYWORDS)
        
        if is_currency:
            total = series.sum()
            insights.append({
                'type': 'success',
                'icon': '💰',
                'title': f'Resumen de {col}',
                'message': f'Total: {total:,.2f} | Promedio: {mean:,.2f} | Máximo: {max_val:,.2f}',
                'priority': 'high',
                'data': {
                    'column': col,
                    'total': round(total, 2),
                    'average': round(mean, 2),
                    'max': round(max_val, 2)
                }
            })
        
        return insights
    
    @staticmethod
    def _detect_date_columns(df: pd.DataFrame) -> List[str]:
        """Detecta columnas que contienen fechas."""
        date_cols = []
        
        for col in df.columns:
            # Si ya es datetime
            if pd.api.types.is_datetime64_any_dtype(df[col]):
                date_cols.append(col)
                continue
            
            # Detectar por nombre
            col_lower = col.lower()
            if any(k in col_lower for k in InsightsService.DATE_KEYWORDS):
                # Intentar convertir
                try:
                    pd.to_datetime(df[col], errors='raise')
                    date_cols.append(col)
                except (ValueError, TypeError):
                    pass
                continue
            
            # Intentar conversión automática para columnas object
            if df[col].dtype == 'object':
                try:
                    converted = pd.to_datetime(df[col], errors='coerce')
                    if converted.notna().sum() / len(df) > 0.8:  # 80% convertible
                        date_cols.append(col)
                except (ValueError, TypeError):
                    pass
        
        return date_cols
    
    @staticmethod
    def _detect_category_columns(df: pd.DataFrame) -> List[str]:
        """Detecta columnas categóricas útiles para análisis."""
        cat_cols = []
        
        for col in df.columns:
            # Excluir columnas numéricas y de fecha ya detectadas
            if pd.api.types.is_numeric_dtype(df[col]):
                continue
            if pd.api.types.is_datetime64_any_dtype(df[col]):
                continue
                
            # Columnas con pocos valores únicos son buenas categorías
            nunique = df[col].nunique()
            if 2 <= nunique <= 50:  # Entre 2 y 50 categorías
                cat_cols.append(col)
            # O si el nombre sugiere categoría
            elif any(k in col.lower() for k in InsightsService.CATEGORY_KEYWORDS):
                cat_cols.append(col)
        
        return cat_cols
    
    @staticmethod
    def _analyze_temporal_trends(df: pd.DataFrame, date_col: str, numeric_cols: List[str]) -> List[Dict]:
        """Analiza tendencias temporales."""
        insights = []
        
        try:
            df_temp = df.copy()
            df_temp[date_col] = pd.to_datetime(df_temp[date_col], errors='coerce')
            df_temp = df_temp.dropna(subset=[date_col])
            
            if len(df_temp) < 10:
                return insights
            
            # Ordenar por fecha
            df_temp = df_temp.sort_values(date_col)
            
            # Analizar la primera métrica numérica relevante
            for num_col in numeric_cols[:2]:  # Solo las primeras 2 métricas
                if num_col not in df_temp.columns:
                    continue
                    
                series = pd.to_numeric(df_temp[num_col], errors='coerce')
                
                # Dividir en primera y segunda mitad para comparar
                mid_point = len(series) // 2
                first_half = series.iloc[:mid_point].mean()
                second_half = series.iloc[mid_point:].mean()
                
                if first_half > 0:
                    change_pct = ((second_half - first_half) / first_half) * 100
                    
                    if abs(change_pct) > 10:  # Cambio significativo (>10%)
                        trend = "creciente 📈" if change_pct > 0 else "decreciente 📉"
                        color = "success" if change_pct > 0 else "warning"
                        
                        insights.append({
                            'type': color,
                            'icon': '📈' if change_pct > 0 else '📉',
                            'title': f'Tendencia en {num_col}',
                            'message': f'Se detecta una tendencia {trend} del {abs(change_pct):.1f}% comparando el período inicial vs final.',
                            'priority': 'high',
                            'data': {
                                'column': num_col,
                                'date_column': date_col,
                                'change_percent': round(change_pct, 1),
                                'trend': 'up' if change_pct > 0 else 'down'
                            }
                        })
                
                # Detectar el mejor/peor período
                df_temp['_period'] = df_temp[date_col].dt.to_period('M')
                monthly = df_temp.groupby('_period')[num_col].sum()
                
                if len(monthly) >= 3:
                    best_period = monthly.idxmax()
                    worst_period = monthly.idxmin()
                    
                    insights.append({
                        'type': 'info',
                        'icon': '🗓️',
                        'title': f'Períodos Destacados ({num_col})',
                        'message': f'Mejor período: {best_period} ({monthly[best_period]:,.2f}). Peor período: {worst_period} ({monthly[worst_period]:,.2f}).',
                        'priority': 'medium',
                        'data': {
                            'column': num_col,
                            'best_period': str(best_period),
                            'worst_period': str(worst_period)
                        }
                    })
                    break  # Solo un insight de períodos
                    
        except Exception as e:
            pass
        
        return insights
    
    @staticmethod
    def _analyze_categorical_performance(df: pd.DataFrame, cat_col: str, numeric_cols: List[str]) -> List[Dict]:
        """Analiza el rendimiento por categorías."""
        insights = []
        
        try:
            # Usar la primera métrica numérica relevante
            metric_col = None
            for col in numeric_cols:
                col_lower = col.lower()
                if any(k in col_lower for k in InsightsService.CURRENCY_KEYWORDS + InsightsService.QUANTITY_KEYWORDS):
                    metric_col = col
                    break
            
            if not metric_col:
                metric_col = numeric_cols[0]
            
            # Agrupar y calcular
            grouped = df.groupby(cat_col)[metric_col].agg(['sum', 'mean', 'count']).reset_index()
            grouped = grouped.sort_values('sum', ascending=False)
            
            if len(grouped) < 2:
                return insights
            
            # Top performer
            top = grouped.iloc[0]
            total_sum = grouped['sum'].sum()
            top_pct = (top['sum'] / total_sum) * 100 if total_sum > 0 else 0
            
            # Concentración (si el top representa mucho del total)
            if top_pct > 30:
                insights.append({
                    'type': 'success',
                    'icon': '🏆',
                    'title': f'Top {cat_col}',
                    'message': f'"{top[cat_col]}" lidera con {top["sum"]:,.2f} en {metric_col} ({top_pct:.1f}% del total).',
                    'priority': 'high',
                    'data': {
                        'category_column': cat_col,
                        'metric_column': metric_col,
                        'top_category': str(top[cat_col]),
                        'value': round(top['sum'], 2),
                        'percentage': round(top_pct, 1)
                    }
                })
            
            # Bottom performer (si hay varios)
            if len(grouped) >= 5:
                bottom = grouped.iloc[-1]
                insights.append({
                    'type': 'warning',
                    'icon': '⬇️',
                    'title': f'Bajo Rendimiento en {cat_col}',
                    'message': f'"{bottom[cat_col]}" tiene el menor {metric_col}: {bottom["sum"]:,.2f}. Considera revisar esta categoría.',
                    'priority': 'medium',
                    'data': {
                        'category_column': cat_col,
                        'metric_column': metric_col,
                        'bottom_category': str(bottom[cat_col]),
                        'value': round(bottom['sum'], 2)
                    }
                })
            
            # Concentración del mercado (Top 3 vs resto)
            if len(grouped) >= 5:
                top3_sum = grouped.head(3)['sum'].sum()
                top3_pct = (top3_sum / total_sum) * 100 if total_sum > 0 else 0
                
                if top3_pct > 70:
                    insights.append({
                        'type': 'info',
                        'icon': '🎯',
                        'title': f'Alta Concentración en {cat_col}',
                        'message': f'El Top 3 de {cat_col} representa el {top3_pct:.1f}% del total de {metric_col}.',
                        'priority': 'medium',
                        'data': {
                            'category_column': cat_col,
                            'concentration': round(top3_pct, 1)
                        }
                    })
                    
        except Exception as e:
            pass
        
        return insights
    
    @staticmethod
    def _analyze_correlations(df: pd.DataFrame, numeric_cols: List[str]) -> List[Dict]:
        """Analiza correlaciones entre columnas numéricas."""
        insights = []
        
        try:
            # Limitar a las primeras 5 columnas numéricas
            cols_to_analyze = numeric_cols[:5]
            
            if len(cols_to_analyze) < 2:
                return insights
            
            # Calcular matriz de correlación
            corr_matrix = df[cols_to_analyze].corr()
            
            # Buscar correlaciones fuertes (excluyendo la diagonal)
            for i, col1 in enumerate(cols_to_analyze):
                for j, col2 in enumerate(cols_to_analyze):
                    if i >= j:  # Evitar duplicados y diagonal
                        continue
                    
                    corr = corr_matrix.loc[col1, col2]
                    
                    if abs(corr) > 0.7:  # Correlación fuerte
                        direction = "positiva" if corr > 0 else "negativa"
                        icon = "🔗" if corr > 0 else "↔️"
                        
                        insights.append({
                            'type': 'info',
                            'icon': icon,
                            'title': 'Correlación Detectada',
                            'message': f'Existe una correlación {direction} fuerte ({corr:.2f}) entre "{col1}" y "{col2}".',
                            'priority': 'medium',
                            'data': {
                                'column1': col1,
                                'column2': col2,
                                'correlation': round(corr, 2)
                            }
                        })
                        
        except Exception as e:
            pass
        
        return insights
    
    @staticmethod
    def _analyze_data_quality(df: pd.DataFrame) -> List[Dict]:
        """Analiza la calidad de los datos."""
        insights = []
        
        # Detectar columnas con muchos valores nulos
        null_percentages = (df.isnull().sum() / len(df)) * 100
        high_null_cols = null_percentages[null_percentages > 20]
        
        if len(high_null_cols) > 0:
            cols_list = ', '.join(high_null_cols.index[:3])  # Máximo 3
            insights.append({
                'type': 'warning',
                'icon': '🔴',
                'title': 'Datos Faltantes Detectados',
                'message': f'Las columnas [{cols_list}] tienen más del 20% de valores vacíos. Esto puede afectar el análisis.',
                'priority': 'medium',
                'data': {
                    'columns_with_nulls': list(high_null_cols.index),
                    'percentages': {col: round(pct, 1) for col, pct in high_null_cols.items()}
                }
            })
        
        # Detectar posibles duplicados
        duplicate_count = df.duplicated().sum()
        if duplicate_count > 0:
            dup_pct = (duplicate_count / len(df)) * 100
            if dup_pct > 5:
                insights.append({
                    'type': 'warning',
                    'icon': '📋',
                    'title': 'Registros Duplicados',
                    'message': f'Se detectaron {duplicate_count} registros potencialmente duplicados ({dup_pct:.1f}%).',
                    'priority': 'medium',
                    'data': {
                        'duplicate_count': duplicate_count,
                        'percentage': round(dup_pct, 1)
                    }
                })
        
        return insights
