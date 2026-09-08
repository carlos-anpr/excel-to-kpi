import pandas as pd
import numpy as np
import os
import uuid
import json
import math

UPLOAD_DIR = "uploads"

# Keywords para detectar métricas que deberían usar PROMEDIO en lugar de SUMA
AVERAGE_KEYWORDS = ['age', 'edad', 'height', 'altura', 'weight', 'peso', 'score', 'puntuacion', 
                    'rating', 'calificacion', 'rate', 'tasa', 'percentage', 'porcentaje', 'percent',
                    'average', 'promedio', 'mean', 'media', 'ratio', 'index', 'indice',
                    'temperature', 'temperatura', 'speed', 'velocidad', 'duration', 'duracion']

# Keywords para detectar columnas que son identificadores/categorías (usar COUNT)
COUNT_KEYWORDS = ['id', 'name', 'nombre', 'country', 'pais', 'city', 'ciudad', 'region', 
                  'category', 'categoria', 'type', 'tipo', 'status', 'estado', 'code', 'codigo',
                  'nationality', 'nacionalidad', 'sport', 'deporte', 'team', 'equipo',
                  'product', 'producto', 'customer', 'cliente', 'segment', 'segmento']


def detect_aggregation(column_name: str, dtype, df: pd.DataFrame = None) -> str:
    """
    Detecta automáticamente la función de agregación apropiada.
    Returns: 'sum', 'avg', 'count', 'countd' (count distinct)
    """
    col_lower = column_name.lower()
    
    # Si es string/object, usar conteo
    if dtype == 'object' or dtype == 'string':
        return 'count'
    
    # Si el nombre sugiere promedio
    if any(keyword in col_lower for keyword in AVERAGE_KEYWORDS):
        return 'avg'
    
    # Si el nombre sugiere categoría/ID, usar conteo
    if any(keyword in col_lower for keyword in COUNT_KEYWORDS):
        return 'count'
    
    # Por defecto para numéricos: suma
    return 'sum'


def should_use_average(column_name: str) -> bool:
    """Determina si una columna debería usar promedio en lugar de suma."""
    col_lower = column_name.lower()
    return any(keyword in col_lower for keyword in AVERAGE_KEYWORDS)


def apply_aggregation(series: pd.Series, agg_type: str) -> float:
    """Aplica la función de agregación especificada a una serie."""
    if agg_type == 'sum':
        return series.sum()
    elif agg_type == 'avg':
        return round(series.mean(), 2)
    elif agg_type == 'count':
        return len(series)
    elif agg_type == 'countd':
        return series.nunique()
    elif agg_type == 'min':
        return series.min()
    elif agg_type == 'max':
        return series.max()
    else:
        return series.sum()


def get_agg_label(agg_type: str, column_name: str) -> str:
    """Genera la etiqueta apropiada según el tipo de agregación."""
    labels = {
        'sum': f'Total {column_name}',
        'avg': f'Promedio {column_name}',
        'count': f'Cantidad {column_name}',
        'countd': f'Únicos {column_name}',
        'min': f'Mínimo {column_name}',
        'max': f'Máximo {column_name}'
    }
    return labels.get(agg_type, f'{column_name}')


def sanitize_for_json(obj):
    """
    Recursively sanitize data for JSON serialization.
    Handles NaN, Infinity, -Infinity and converts them to None or valid values.
    """
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(item) for item in obj]
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, (np.floating, np.integer)):
        val = float(obj)
        if math.isnan(val) or math.isinf(val):
            return None
        return val
    elif pd.isna(obj):
        return None
    return obj


class DataService:
    @staticmethod
    def save_file(file_contents: bytes, filename: str) -> str:
        """Guarda el archivo en disco y devuelve el ID único generado."""
        file_ext = os.path.splitext(filename)[1]
        file_id = str(uuid.uuid4())
        saved_filename = f"{file_id}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, saved_filename)
        
        with open(file_path, "wb") as f:
            f.write(file_contents)
            
        return file_id

    @staticmethod
    def find_file(file_id: str):
        """Devuelve la ruta física del archivo subido con ese ID, o None si no existe."""
        for f in os.listdir(UPLOAD_DIR):
            if f.startswith(file_id):
                return os.path.join(UPLOAD_DIR, f)
        return None

    @staticmethod
    def delete_file(file_id: str) -> bool:
        """Elimina el archivo físico del disco."""
        file_path = DataService.find_file(file_id)
        if not file_path:
            return False
        try:
            os.remove(file_path)
            return True
        except OSError:
            return False

    @staticmethod
    def _load_dataframe(file_path: str) -> pd.DataFrame:
        """Helper to load DataFrame with robust error handling for CSVs."""
        if file_path.lower().endswith(('.xls', '.xlsx')):
            return pd.read_excel(file_path)
            
        # CSV Handling with fallbacks
        encodings = ['utf-8', 'latin-1', 'cp1252']
        separators = [',', ';', '\t']
        
        # Try combinations
        for encoding in encodings:
            for sep in separators:
                try:
                    # on_bad_lines='skip' ignores rows with too many fields
                    df = pd.read_csv(file_path, encoding=encoding, sep=sep, on_bad_lines='skip')
                    if len(df.columns) > 1: # Basic validation
                        return df
                except Exception:
                    continue
        
        # If strict parsing fails, try one last time with default comma and latin-1 (common for Excel CSVs)
        # allowing 1 column if that's all there is
        try:
            return pd.read_csv(file_path, encoding='latin-1', on_bad_lines='skip')
        except Exception:
            # Fallback to python engine
            return pd.read_csv(file_path, sep=None, engine='python', encoding='latin-1', on_bad_lines='skip')

    @staticmethod
    def _sanitize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
        """Sanitize DataFrame by replacing non-JSON-serializable values."""
        # Replace inf/-inf with NaN first, then NaN with None
        df = df.replace([np.inf, -np.inf], np.nan)
        return df

    @staticmethod
    def get_preview(file_id: str) -> dict:
        """Lee el archivo guardado y devuelve una previsualización (primeras 5 filas)."""
        found_file = DataService.find_file(file_id)
        
        if not found_file:
            raise FileNotFoundError("Archivo no encontrado")

        try:
            df = DataService._load_dataframe(found_file)
            
            # Sanitize the dataframe
            df = DataService._sanitize_dataframe(df)
            
            # Reemplazar NaN con None (null en JSON) para evitar errores en el frontend
            df = df.where(pd.notnull(df), None)

            preview = df.head(20).to_dict(orient="records")
            # Sanitize preview data for JSON
            preview = sanitize_for_json(preview)
            
            # Ensure columns are all strings
            columns = [str(col) for col in df.columns if col is not None]
            
            return {
                "file_id": file_id,
                "filename": os.path.basename(found_file),
                "columns": columns,
                "preview": preview,
                "total_rows": len(df)
            }
        except Exception as e:
            raise ValueError(f"Error al procesar el archivo: {str(e)}")

    @staticmethod
    def get_dashboard_data(file_id: str, mapping: dict, alert_rules: list = None) -> dict:
        """Genera los datos para el dashboard basado en el mapeo y evalúa alertas."""
        found_file = DataService.find_file(file_id)

        if not found_file:
            raise FileNotFoundError("Archivo no encontrado")

        try:
            df = DataService._load_dataframe(found_file)

            # Identificar si es configuración nueva (DashboardBuilder) o antigua (Mapeo simple)
            is_new_config = "charts" in mapping and isinstance(mapping["charts"], list)

            dashboard_data = {
                "kpis": [],
                "charts": [],
                "alerts": []
            }

            if is_new_config:
                dashboard_data["kpis"] = DataService._build_kpis(df, mapping.get("kpis", []))
                dashboard_data["charts"] = DataService._build_charts(df, mapping.get("charts", []))
            else:
                DataService._build_legacy_dashboard(dashboard_data, df, mapping)

            if alert_rules:
                dashboard_data["alerts"] = DataService._eval_alerts(df, alert_rules)

            # Sanitize all data before returning to ensure JSON compatibility
            return sanitize_for_json(dashboard_data)

        except Exception as e:
            raise ValueError(f"Error generando dashboard: {str(e)}")

    @staticmethod
    def _build_kpis(df: pd.DataFrame, kpi_config: list) -> list:
        """Genera KPIs. Soporta configuración con agregación."""
        kpis = []
        for kpi_item in kpi_config:
            # Soportar tanto string simple como objeto {column, aggregation}
            if isinstance(kpi_item, dict):
                col = kpi_item.get('column')
                agg_type = kpi_item.get('aggregation', 'auto')
            else:
                col = kpi_item
                agg_type = 'auto'

            if col and col in df.columns:
                try:
                    # Detectar tipo de dato
                    dtype = str(df[col].dtype)

                    # Auto-detectar agregación si no se especificó
                    if agg_type == 'auto':
                        agg_type = detect_aggregation(col, dtype, df)

                    # Calcular valor según tipo de agregación
                    if agg_type == 'count':
                        value = len(df[col].dropna())
                        label = f"Cantidad {col}"
                    elif agg_type == 'countd':
                        value = df[col].nunique()
                        label = f"Únicos {col}"
                    elif agg_type == 'avg':
                        numeric_series = pd.to_numeric(df[col], errors='coerce')
                        value = numeric_series.mean()
                        value = round(value, 1) if pd.notnull(value) else 0
                        label = f"Promedio {col}"
                    elif agg_type == 'min':
                        numeric_series = pd.to_numeric(df[col], errors='coerce')
                        value = numeric_series.min()
                        label = f"Mínimo {col}"
                    elif agg_type == 'max':
                        numeric_series = pd.to_numeric(df[col], errors='coerce')
                        value = numeric_series.max()
                        label = f"Máximo {col}"
                    else:  # sum
                        numeric_series = pd.to_numeric(df[col], errors='coerce')
                        if numeric_series.isna().all():
                            # Es texto, contar únicos
                            value = df[col].nunique()
                            label = f"Únicos {col}"
                            agg_type = 'countd'
                        else:
                            value = numeric_series.sum()
                            label = f"Total {col}"

                    kpis.append({
                        "label": label,
                        "value": float(value) if pd.notnull(value) else 0,
                        "type": agg_type,
                        "column": col
                    })
                except Exception as e:
                    print(f"Error procesando KPI {col}: {e}")
        return kpis

    @staticmethod
    def _build_charts(df: pd.DataFrame, charts_config: list) -> list:
        """Genera la lista de gráficos configurados, tolerando errores por gráfico."""
        charts = []
        for chart in charts_config:
            chart_data = DataService._build_chart(df, chart)
            if chart_data is not None:
                charts.append(chart_data)
        return charts

    @staticmethod
    def _build_chart(df: pd.DataFrame, chart: dict):
        """Genera un gráfico individual. Devuelve None si no es generable o falla."""
        chart_id = chart.get("id")
        x_col = chart.get("xAxis")
        y_cols = chart.get("yAxis", [])
        breakdown_col = chart.get("breakdown")
        title = chart.get("title", "Gráfico")
        order = chart.get("order", 0)
        orientation = chart.get("orientation", "vertical")
        col_span = chart.get("colSpan", 1)
        # Nueva: agregación por métrica (puede ser string o dict por columna)
        aggregations = chart.get("aggregations", {})  # {column_name: 'sum'|'avg'|'count'|'auto'}

        if not (x_col and y_cols and x_col in df.columns):
            return None

        try:
            # Crear una copia de trabajo con solo las columnas necesarias para no corromper el DF original
            needed_cols = [x_col] + [col for col in y_cols if col in df.columns]
            if breakdown_col and breakdown_col in df.columns:
                needed_cols.append(breakdown_col)

            # Eliminar duplicados en needed_cols
            needed_cols = list(set(needed_cols))

            chart_df = df[needed_cols].copy()

            # Determinar agregaciones para cada columna Y
            agg_funcs = {}
            for y_col in y_cols:
                if y_col in chart_df.columns:
                    # Obtener agregación configurada o auto-detectar
                    agg_type = aggregations.get(y_col, 'auto')
                    if agg_type == 'auto':
                        dtype = str(chart_df[y_col].dtype)
                        agg_type = detect_aggregation(y_col, dtype, chart_df)

                    # Convertir a función pandas
                    if agg_type == 'count':
                        agg_funcs[y_col] = 'count'
                    elif agg_type == 'countd':
                        agg_funcs[y_col] = 'nunique'
                    elif agg_type == 'avg':
                        agg_funcs[y_col] = 'mean'
                    elif agg_type == 'min':
                        agg_funcs[y_col] = 'min'
                    elif agg_type == 'max':
                        agg_funcs[y_col] = 'max'
                    else:  # sum
                        agg_funcs[y_col] = 'sum'

                    # Convertir a numérico si no es count
                    if agg_type not in ['count', 'countd']:
                        chart_df[y_col] = pd.to_numeric(chart_df[y_col], errors='coerce')

            # --- DETECCIÓN DE TIPOS DE EJE X ---
            is_date = False
            is_numeric_x = False

            try:
                if pd.api.types.is_numeric_dtype(chart_df[x_col]):
                    is_numeric_x = True
                    # No convertimos numéricos a fecha para evitar errores con "Month Number" etc.
                elif pd.api.types.is_datetime64_any_dtype(chart_df[x_col]):
                    is_date = True
                else:
                    # Es string/object, intentamos convertir a fecha
                    temp_series = pd.to_datetime(chart_df[x_col], errors='coerce')
                    if not temp_series.isna().all():
                        chart_df[x_col] = temp_series
                        is_date = True
            except Exception as e:
                print(f"Date conversion warning for {x_col}: {e}")

            if breakdown_col and breakdown_col in chart_df.columns:
                # --- LÓGICA DE AGRUPACIÓN (BREAKDOWN) ---
                metric = y_cols[0]
                agg_func = agg_funcs.get(metric, 'sum')

                # Drop rows where x_col is NaT/NaN if it's a date
                if is_date:
                    chart_df = chart_df.dropna(subset=[x_col])

                grouped_df = chart_df.groupby([x_col, breakdown_col])[metric].agg(agg_func).reset_index()

                # Redondear si es promedio
                if agg_func == 'mean':
                    grouped_df[metric] = grouped_df[metric].round(1)

                # Pivotar para que los valores de breakdown sean columnas
                pivot_df = grouped_df.pivot(index=x_col, columns=breakdown_col, values=metric).reset_index()
                pivot_df = pivot_df.fillna(0)

                # Las nuevas series son las columnas pivotadas (excluyendo x_col)
                new_series = [c for c in pivot_df.columns if c != x_col]

                if is_date:
                    pivot_df = pivot_df.sort_values(x_col)
                    pivot_df[x_col] = pivot_df[x_col].dt.strftime('%Y-%m-%d')
                elif is_numeric_x:
                    pivot_df = pivot_df.sort_values(x_col).head(50)

                # Título con indicación de agregación
                agg_labels = {'mean': 'Promedio', 'count': 'Cantidad', 'nunique': 'Únicos', 'sum': 'Total', 'min': 'Mín', 'max': 'Máx'}
                agg_label = agg_labels.get(agg_func, '')
                chart_title = f"{title} (por {breakdown_col})"
                if agg_label and agg_func != 'sum':
                    chart_title = f"{title} - {agg_label} (por {breakdown_col})"

                return {
                    "id": chart_id,
                    "type": "bar",
                    "title": chart_title,
                    "xAxis": x_col,
                    "data": pivot_df.to_dict(orient="records"),
                    "bars": new_series,
                    "order": order,
                    "orientation": orientation,
                    "colSpan": col_span,
                    "aggregation": agg_func
                }

            # --- LÓGICA SIMPLE (SIN AGRUPACIÓN) ---
            if is_date:
                chart_df = chart_df.dropna(subset=[x_col])

            # Usar las agregaciones ya calculadas
            grouped_df = chart_df.groupby(x_col).agg(agg_funcs).reset_index()

            # Redondear métricas que usan promedio
            for y_col in y_cols:
                if agg_funcs.get(y_col) == 'mean':
                    grouped_df[y_col] = grouped_df[y_col].round(1)

            if is_date:
                grouped_df = grouped_df.sort_values(x_col)
                grouped_df[x_col] = grouped_df[x_col].dt.strftime('%Y-%m-%d')
            elif is_numeric_x:
                grouped_df = grouped_df.sort_values(x_col).head(50)
            else:
                grouped_df = grouped_df.sort_values(y_cols[0], ascending=False).head(20)

            # Determinar tipo por defecto (Línea si es fecha, Barra si no)
            x_col_lower = x_col.lower()
            date_keywords = ['date', 'fecha', 'time', 'tiempo', 'year', 'año', 'month', 'mes', 'day', 'dia']
            is_date_by_name = any(k in x_col_lower for k in date_keywords)

            chart_type = "line" if (is_date or is_date_by_name) else "bar"

            # Ajustar título según agregación usada
            agg_labels = {'mean': 'Promedio', 'count': 'Cantidad', 'nunique': 'Únicos'}
            chart_title = title
            primary_agg = agg_funcs.get(y_cols[0], 'sum') if y_cols else 'sum'
            if primary_agg in agg_labels and primary_agg not in title.lower():
                chart_title = f"{title} ({agg_labels[primary_agg]})"

            return {
                "id": chart_id,
                "type": chart_type,
                "title": chart_title,
                "xAxis": x_col,
                "yAxis": y_cols,  # Para predicción
                "data": grouped_df.to_dict(orient="records"),
                "lines": y_cols if chart_type == "line" else None,
                "bars": y_cols if chart_type == "bar" else None,
                "order": order,
                "orientation": orientation,
                "colSpan": col_span,
                "aggregations": {y: agg_funcs.get(y, 'sum') for y in y_cols}
            }
        except Exception as e:
            print(f"Error generando gráfico {title}: {e}")
            import traceback
            traceback.print_exc()
            return None

    @staticmethod
    def _build_legacy_dashboard(dashboard_data: dict, df: pd.DataFrame, mapping: dict) -> None:
        """Lógica antigua (retrocompatibilidad) con mapeo simple date/category/number."""
        date_col = next((k for k, v in mapping.items() if v == 'date'), None)
        cat_cols = [k for k, v in mapping.items() if v == 'category']
        num_cols = [k for k, v in mapping.items() if v == 'number']

        # 1. Generar KPIs (Suma total de columnas numéricas)
        for col in num_cols:
            if col in df.columns:
                total = float(df[col].sum())
                dashboard_data["kpis"].append({
                    "label": f"Total {col}",
                    "value": total,
                    "type": "sum"
                })

        # 2. Generar Gráfico de Línea (Tendencia Temporal)
        if date_col and num_cols:
            # Intentar convertir a datetime
            try:
                df[date_col] = pd.to_datetime(df[date_col])
                # Agrupar por mes (o fecha si son pocas)
                # Para simplificar MVP: Agrupar por fecha tal cual y ordenar
                trend_df = df.groupby(date_col)[num_cols].sum().reset_index()
                trend_df = trend_df.sort_values(date_col)

                # Formatear fecha a string para JSON
                trend_df[date_col] = trend_df[date_col].dt.strftime('%Y-%m-%d')

                dashboard_data["charts"].append({
                    "type": "line",
                    "title": f"Tendencia por {date_col}",
                    "xAxis": date_col,
                    "yAxis": num_cols,  # Para predicción
                    "data": trend_df.to_dict(orient="records"),
                    "lines": num_cols
                })
            except Exception as e:
                print(f"No se pudo procesar fechas: {e}")

        # 3. Generar Gráficos de Barras (Por Categoría)
        for cat_col in cat_cols:
            if cat_col in df.columns and num_cols:
                # Top 10 categorías por la primera métrica numérica
                metric = num_cols[0]
                bar_df = df.groupby(cat_col)[metric].sum().reset_index()
                bar_df = bar_df.sort_values(metric, ascending=False).head(10)

                dashboard_data["charts"].append({
                    "type": "bar",
                    "title": f"{metric} por {cat_col}",
                    "xAxis": cat_col,
                    "yAxis": [metric],  # Para predicción
                    "data": bar_df.to_dict(orient="records"),
                    "bars": [metric]
                })

    @staticmethod
    def _eval_alerts(df: pd.DataFrame, alert_rules: list) -> list:
        """Evalúa las reglas de alerta sobre el DataFrame."""
        alerts = []
        for rule in alert_rules:
            column = rule.get("column")
            threshold = float(rule.get("threshold", 0))
            operator = rule.get("operator", ">")

            if column in df.columns:
                if operator == ">":
                    matches = df[df[column] > threshold]
                elif operator == "<":
                    matches = df[df[column] < threshold]
                else:
                    matches = []

                if len(matches) > 0:
                    alerts.append({
                        "rule": f"{column} {operator} {threshold}",
                        "count": len(matches),
                        "message": f"Alerta: {len(matches)} registros tienen '{column}' {operator} {threshold}"
                    })
        return alerts
