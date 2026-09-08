"""
Servicio de Predicción de Series Temporales
============================================
Utiliza Holt-Winters y Regresión Lineal para predecir valores futuros.
Auto-detecta el mejor método según los datos.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
import re


class ForecastService:
    """Servicio de predicción automática para series temporales."""
    
    # Palabras clave para detectar columnas temporales
    TEMPORAL_KEYWORDS = [
        'date', 'fecha', 'time', 'tiempo', 'year', 'año', 'month', 'mes',
        'day', 'dia', 'week', 'semana', 'quarter', 'trimestre', 'period',
        'periodo', 'datetime', 'timestamp', 'created', 'updated', 'hora'
    ]
    
    # Palabras clave para columnas que NO deberían predecirse
    NON_PREDICTABLE_KEYWORDS = [
        'id', 'name', 'nombre', 'code', 'codigo', 'key', 'clave',
        'description', 'descripcion', 'category', 'categoria', 'type', 'tipo',
        'status', 'estado', 'country', 'pais', 'city', 'ciudad', 'region'
    ]
    
    @staticmethod
    def is_temporal_column(column_name: str, sample_values: List[Any] = None) -> bool:
        """Detecta si una columna es temporal basándose en nombre y valores."""
        col_lower = column_name.lower().strip()
        
        # Verificar por nombre
        for keyword in ForecastService.TEMPORAL_KEYWORDS:
            if keyword in col_lower:
                return True
        
        # Verificar por valores si están disponibles
        if sample_values:
            try:
                # Intentar parsear como fecha
                non_null_values = [v for v in sample_values if v is not None and str(v).strip()]
                if non_null_values:
                    test_values = non_null_values[:10]
                    parsed_count = 0
                    for val in test_values:
                        try:
                            pd.to_datetime(val)
                            parsed_count += 1
                        except (ValueError, TypeError):
                            pass
                    # Si más del 70% se parsean como fecha, es temporal
                    if parsed_count / len(test_values) > 0.7:
                        return True
            except (ValueError, TypeError):
                pass
        
        return False
    
    @staticmethod
    def is_predictable_metric(column_name: str, dtype: str) -> bool:
        """Determina si una columna métrica puede ser predicha."""
        col_lower = column_name.lower().strip()
        
        # Debe ser numérica
        if 'int' not in dtype.lower() and 'float' not in dtype.lower():
            return False
        
        # No debe ser una columna de identificación
        for keyword in ForecastService.NON_PREDICTABLE_KEYWORDS:
            if keyword in col_lower:
                return False
        
        return True
    
    @staticmethod
    def analyze_predictability(df: pd.DataFrame, x_col: str, y_col: str) -> Dict:
        """
        Analiza si un par X-Y puede tener predicción y con qué confianza.
        
        Returns:
            {
                "can_predict": bool,
                "reason": str,
                "confidence_level": "high" | "medium" | "low" | None,
                "r_squared": float | None,
                "data_points": int,
                "trend": "up" | "down" | "stable" | None,
                "recommended_periods": int
            }
        """
        result = {
            "can_predict": False,
            "reason": "",
            "confidence_level": None,
            "r_squared": None,
            "data_points": 0,
            "trend": None,
            "recommended_periods": 0
        }
        
        # Verificar que las columnas existen
        if x_col not in df.columns or y_col not in df.columns:
            result["reason"] = "Columnas no encontradas"
            return result
        
        # Verificar que X es temporal
        x_sample = df[x_col].head(10).tolist()
        if not ForecastService.is_temporal_column(x_col, x_sample):
            result["reason"] = "Eje X no es temporal"
            return result
        
        # Verificar que Y es numérica (sin mutar el df original)
        if not pd.api.types.is_numeric_dtype(df[y_col]):
            y_numeric = pd.to_numeric(df[y_col], errors='coerce')
            if y_numeric.isna().all():
                result["reason"] = "Métrica no es numérica"
                return result
        
        # Obtener datos válidos
        try:
            work_df = df[[x_col, y_col]].copy()
            work_df[y_col] = pd.to_numeric(work_df[y_col], errors='coerce')
            work_df = work_df.dropna()
            
            # Intentar ordenar por fecha si es posible
            try:
                work_df[x_col] = pd.to_datetime(work_df[x_col], errors='coerce')
                work_df = work_df.dropna()
                work_df = work_df.sort_values(x_col)
            except (ValueError, TypeError):
                pass
            
            data_points = len(work_df)
            result["data_points"] = data_points
            
            # Mínimo 5 puntos
            if data_points < 5:
                result["reason"] = f"Insuficientes datos ({data_points}/5 mínimo)"
                return result
            
            # Verificar variación
            y_values = work_df[y_col].values
            if np.std(y_values) == 0:
                result["reason"] = "Datos constantes (sin variación)"
                return result
            
            # Calcular R² (correlación con índice temporal)
            X = np.arange(len(y_values)).reshape(-1, 1)
            y = y_values
            
            # Regresión lineal simple
            from sklearn.linear_model import LinearRegression
            model = LinearRegression()
            model.fit(X, y)
            r_squared = model.score(X, y)
            
            result["r_squared"] = round(r_squared, 3)
            
            # Determinar tendencia
            slope = model.coef_[0]
            if abs(slope) < np.std(y_values) * 0.01:
                result["trend"] = "stable"
            elif slope > 0:
                result["trend"] = "up"
            else:
                result["trend"] = "down"
            
            # Determinar nivel de confianza
            if r_squared < 0.2:
                result["reason"] = f"Patrón muy débil (R²={r_squared:.2f})"
                result["confidence_level"] = "low"
                result["can_predict"] = True  # Permitir pero advertir
            elif r_squared < 0.5:
                result["confidence_level"] = "medium"
                result["can_predict"] = True
                result["reason"] = f"Patrón moderado (R²={r_squared:.2f})"
            else:
                result["confidence_level"] = "high"
                result["can_predict"] = True
                result["reason"] = f"Patrón fuerte (R²={r_squared:.2f})"
            
            # Recomendar períodos a predecir (máximo 30% de los datos)
            result["recommended_periods"] = max(3, min(int(data_points * 0.3), 12))
            
        except Exception as e:
            result["reason"] = f"Error al analizar: {str(e)}"
            return result
        
        return result
    
    @staticmethod
    def generate_forecast(
        df: pd.DataFrame, 
        x_col: str, 
        y_col: str, 
        periods: int = None,
        method: str = "auto"
    ) -> Dict:
        """
        Genera predicción para una serie temporal.
        
        Args:
            df: DataFrame con los datos
            x_col: Columna del eje X (temporal)
            y_col: Columna del eje Y (métrica)
            periods: Número de períodos a predecir (auto si None)
            method: "auto", "linear", "holt_winters", "exponential"
            
        Returns:
            {
                "success": bool,
                "error": str | None,
                "method_used": str,
                "original_data": [...],
                "forecast_data": [...],
                "confidence_interval": {"lower": [...], "upper": [...]},
                "metrics": {
                    "r_squared": float,
                    "trend": str,
                    "trend_value": float (% cambio),
                    "confidence": float (0-1)
                }
            }
        """
        result = {
            "success": False,
            "error": None,
            "method_used": None,
            "original_data": [],
            "forecast_data": [],
            "confidence_interval": {"lower": [], "upper": []},
            "metrics": {}
        }
        
        try:
            # Preparar datos
            work_df = df[[x_col, y_col]].copy()
            work_df[y_col] = pd.to_numeric(work_df[y_col], errors='coerce')
            
            # Intentar parsear X como fecha
            is_date = False
            try:
                work_df[x_col] = pd.to_datetime(work_df[x_col], errors='coerce')
                if not work_df[x_col].isna().all():
                    is_date = True
                    work_df = work_df.dropna()
                    work_df = work_df.sort_values(x_col)
            except (ValueError, TypeError):
                work_df = work_df.dropna()
            
            y_values = work_df[y_col].values.astype(float)
            x_values = work_df[x_col].values
            n = len(y_values)
            
            if n < 5:
                result["error"] = "Insuficientes datos (mínimo 5)"
                return result
            
            # Determinar períodos si no se especificó
            if periods is None:
                periods = max(3, min(int(n * 0.3), 12))
            
            # Preparar datos originales para respuesta
            for i in range(n):
                x_val = x_values[i]
                if is_date:
                    x_label = pd.Timestamp(x_val).strftime('%Y-%m-%d')
                else:
                    x_label = str(x_val)
                result["original_data"].append({
                    "x": x_label,
                    "y": float(y_values[i]),
                    "type": "historical"
                })
            
            # Seleccionar método
            forecast_values = None
            confidence_lower = None
            confidence_upper = None
            method_used = method
            
            if method == "auto":
                # Intentar Holt-Winters primero, fallback a lineal
                try:
                    forecast_values, confidence_lower, confidence_upper, method_used = \
                        ForecastService._holt_winters_forecast(y_values, periods)
                except Exception as e:
                    print(f"Holt-Winters falló, usando lineal: {e}")
                    forecast_values, confidence_lower, confidence_upper, method_used = \
                        ForecastService._linear_forecast(y_values, periods)
            elif method == "holt_winters":
                forecast_values, confidence_lower, confidence_upper, method_used = \
                    ForecastService._holt_winters_forecast(y_values, periods)
            elif method == "exponential":
                forecast_values, confidence_lower, confidence_upper, method_used = \
                    ForecastService._exponential_forecast(y_values, periods)
            else:  # linear
                forecast_values, confidence_lower, confidence_upper, method_used = \
                    ForecastService._linear_forecast(y_values, periods)
            
            # Generar etiquetas X para predicción
            if is_date:
                last_date = pd.Timestamp(x_values[-1])
                # Detectar frecuencia
                if n >= 2:
                    date_diffs = pd.Series([pd.Timestamp(x_values[i+1]) - pd.Timestamp(x_values[i]) 
                                           for i in range(min(5, n-1))])
                    avg_diff = date_diffs.mean()
                else:
                    avg_diff = timedelta(days=30)
                
                for i in range(periods):
                    future_date = last_date + avg_diff * (i + 1)
                    x_label = future_date.strftime('%Y-%m-%d')
                    result["forecast_data"].append({
                        "x": x_label,
                        "y": float(forecast_values[i]),
                        "type": "forecast"
                    })
                    result["confidence_interval"]["lower"].append({
                        "x": x_label,
                        "y": float(confidence_lower[i])
                    })
                    result["confidence_interval"]["upper"].append({
                        "x": x_label,
                        "y": float(confidence_upper[i])
                    })
            else:
                # Usar índices numéricos
                for i in range(periods):
                    x_label = f"P+{i+1}"
                    result["forecast_data"].append({
                        "x": x_label,
                        "y": float(forecast_values[i]),
                        "type": "forecast"
                    })
                    result["confidence_interval"]["lower"].append({
                        "x": x_label,
                        "y": float(confidence_lower[i])
                    })
                    result["confidence_interval"]["upper"].append({
                        "x": x_label,
                        "y": float(confidence_upper[i])
                    })
            
            # Calcular métricas
            from sklearn.linear_model import LinearRegression
            X = np.arange(n).reshape(-1, 1)
            model = LinearRegression().fit(X, y_values)
            r_squared = model.score(X, y_values)
            
            trend_pct = ((forecast_values[-1] - y_values[-1]) / y_values[-1] * 100) if y_values[-1] != 0 else 0
            
            result["metrics"] = {
                "r_squared": round(r_squared, 3),
                "trend": "up" if trend_pct > 1 else ("down" if trend_pct < -1 else "stable"),
                "trend_value": round(trend_pct, 1),
                "confidence": round(max(0.0, min(0.95, r_squared + 0.1)), 2),
                "periods_predicted": periods
            }
            
            result["method_used"] = method_used
            result["success"] = True
            
        except Exception as e:
            result["error"] = str(e)
        
        return result
    
    @staticmethod
    def _linear_forecast(y_values: np.ndarray, periods: int) -> Tuple[np.ndarray, np.ndarray, np.ndarray, str]:
        """Predicción usando regresión lineal."""
        from sklearn.linear_model import LinearRegression
        
        n = len(y_values)
        X = np.arange(n).reshape(-1, 1)
        model = LinearRegression().fit(X, y_values)
        
        X_future = np.arange(n, n + periods).reshape(-1, 1)
        forecast = model.predict(X_future)
        
        # Calcular intervalo de confianza basado en error estándar
        residuals = y_values - model.predict(X)
        std_error = np.std(residuals)
        
        confidence_lower = forecast - 1.96 * std_error
        confidence_upper = forecast + 1.96 * std_error
        
        return forecast, confidence_lower, confidence_upper, "linear"
    
    @staticmethod
    def _holt_winters_forecast(y_values: np.ndarray, periods: int) -> Tuple[np.ndarray, np.ndarray, np.ndarray, str]:
        """Predicción usando Holt-Winters (Suavizado Exponencial)."""
        from statsmodels.tsa.holtwinters import ExponentialSmoothing
        
        # Usar Holt-Winters sin estacionalidad (más robusto para datos pequeños)
        model = ExponentialSmoothing(
            y_values, 
            trend='add',  # Tendencia aditiva
            seasonal=None,  # Sin estacionalidad para robustez
            damped_trend=True  # Amortiguar tendencia para no extrapolar demasiado
        )
        fitted = model.fit(optimized=True)
        
        forecast = fitted.forecast(periods)
        
        # Calcular intervalo de confianza
        residuals = y_values - fitted.fittedvalues
        std_error = np.std(residuals)
        
        # Aumentar incertidumbre con el tiempo
        uncertainty_factor = np.array([1 + 0.1 * i for i in range(periods)])
        
        confidence_lower = forecast - 1.96 * std_error * uncertainty_factor
        confidence_upper = forecast + 1.96 * std_error * uncertainty_factor
        
        return forecast, confidence_lower, confidence_upper, "holt_winters"
    
    @staticmethod
    def _exponential_forecast(y_values: np.ndarray, periods: int) -> Tuple[np.ndarray, np.ndarray, np.ndarray, str]:
        """Predicción usando regresión exponencial."""
        from sklearn.linear_model import LinearRegression
        
        n = len(y_values)
        
        # Transformar a log para regresión exponencial
        # Manejar valores <= 0
        y_positive = np.maximum(y_values, 0.001)
        y_log = np.log(y_positive)
        
        X = np.arange(n).reshape(-1, 1)
        model = LinearRegression().fit(X, y_log)
        
        X_future = np.arange(n, n + periods).reshape(-1, 1)
        forecast_log = model.predict(X_future)
        forecast = np.exp(forecast_log)
        
        # Intervalo de confianza
        residuals_log = y_log - model.predict(X)
        std_error_log = np.std(residuals_log)
        
        confidence_lower = np.exp(forecast_log - 1.96 * std_error_log)
        confidence_upper = np.exp(forecast_log + 1.96 * std_error_log)
        
        return forecast, confidence_lower, confidence_upper, "exponential"
    
    @staticmethod
    def get_predictable_charts(df: pd.DataFrame, charts_config: List[Dict]) -> List[Dict]:
        """
        Analiza qué gráficos pueden tener predicción.
        
        Args:
            df: DataFrame con los datos
            charts_config: Lista de configuraciones de gráficos
            
        Returns:
            Lista de gráficos con info de predictabilidad añadida
        """
        results = []
        
        for chart in charts_config:
            chart_result = {
                "chart_id": chart.get("id"),
                "title": chart.get("title", ""),
                "predictable_metrics": []
            }
            
            x_col = chart.get("xAxis")
            y_cols = chart.get("yAxis", [])
            
            if not x_col or not y_cols:
                results.append(chart_result)
                continue
            
            # Verificar si X es temporal
            x_sample = df[x_col].head(10).tolist() if x_col in df.columns else []
            if not ForecastService.is_temporal_column(x_col, x_sample):
                results.append(chart_result)
                continue
            
            # Analizar cada métrica Y
            for y_col in y_cols:
                if y_col not in df.columns:
                    continue
                    
                analysis = ForecastService.analyze_predictability(df, x_col, y_col)
                if analysis["can_predict"]:
                    chart_result["predictable_metrics"].append({
                        "column": y_col,
                        "confidence_level": analysis["confidence_level"],
                        "r_squared": analysis["r_squared"],
                        "trend": analysis["trend"],
                        "recommended_periods": analysis["recommended_periods"],
                        "reason": analysis["reason"]
                    })
            
            results.append(chart_result)
        
        return results
