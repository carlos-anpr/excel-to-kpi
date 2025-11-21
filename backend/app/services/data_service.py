import pandas as pd
import os
import uuid
import json

UPLOAD_DIR = "uploads"

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
    def delete_file(file_id: str) -> bool:
        """Elimina el archivo físico del disco."""
        for f in os.listdir(UPLOAD_DIR):
            if f.startswith(file_id):
                file_path = os.path.join(UPLOAD_DIR, f)
                try:
                    os.remove(file_path)
                    return True
                except OSError:
                    return False
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
    def get_preview(file_id: str) -> dict:
        """Lee el archivo guardado y devuelve una previsualización (primeras 5 filas)."""
        # Buscar el archivo con ese ID (puede ser .csv o .xlsx)
        # En un sistema real, guardaríamos la extensión en la BD.
        # Aquí buscamos el archivo que empiece con el ID.
        
        found_file = None
        for f in os.listdir(UPLOAD_DIR):
            if f.startswith(file_id):
                found_file = os.path.join(UPLOAD_DIR, f)
                break
        
        if not found_file:
            raise FileNotFoundError("Archivo no encontrado")

        try:
            df = DataService._load_dataframe(found_file)
            
            # Reemplazar NaN con None (null en JSON) para evitar errores en el frontend
            df = df.where(pd.notnull(df), None)

            preview = df.head(20).to_dict(orient="records")
            columns = list(df.columns)
            
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
        found_file = None
        for f in os.listdir(UPLOAD_DIR):
            if f.startswith(file_id):
                found_file = os.path.join(UPLOAD_DIR, f)
                break
        
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
                # --- LÓGICA NUEVA (DashboardBuilder) ---
                kpi_cols = mapping.get("kpis", [])
                charts_config = mapping.get("charts", [])

                # 1. Generar KPIs
                for col in kpi_cols:
                    if col in df.columns:
                        # Intentar limpiar y convertir a numérico si es necesario
                        try:
                            numeric_series = pd.to_numeric(df[col], errors='coerce')
                            
                            # Si la conversión resulta en todo NaN (es texto), contamos únicos
                            if numeric_series.isna().all():
                                total = df[col].nunique()
                                label = f"Unique {col}"
                            else:
                                total = numeric_series.sum()
                                label = f"Total {col}"

                            dashboard_data["kpis"].append({
                                "label": label,
                                "value": float(total) if pd.notnull(total) else 0,
                                "type": "sum"
                            })
                        except:
                            pass

                # 2. Generar Gráficos Configurados
                for chart in charts_config:
                    chart_id = chart.get("id")
                    x_col = chart.get("xAxis")
                    y_cols = chart.get("yAxis", [])
                    breakdown_col = chart.get("breakdown")
                    title = chart.get("title", "Gráfico")

                    if x_col and y_cols and x_col in df.columns:
                        try:
                            # Crear una copia de trabajo con solo las columnas necesarias para no corromper el DF original
                            needed_cols = [x_col] + [col for col in y_cols if col in df.columns]
                            if breakdown_col and breakdown_col in df.columns:
                                needed_cols.append(breakdown_col)
                            
                            # Eliminar duplicados en needed_cols
                            needed_cols = list(set(needed_cols))
                            
                            chart_df = df[needed_cols].copy()

                            # Asegurar que las columnas Y sean numéricas en la copia
                            for y_col in y_cols:
                                if y_col in chart_df.columns:
                                    chart_df[y_col] = pd.to_numeric(chart_df[y_col], errors='coerce')

                            # Si X parece fecha, intentar ordenar cronológicamente
                            is_date = False
                            try:
                                if chart_df[x_col].dtype == 'object':
                                    chart_df[x_col] = pd.to_datetime(chart_df[x_col])
                                    is_date = True
                            except:
                                pass 

                            if breakdown_col and breakdown_col in chart_df.columns:
                                # --- LÓGICA DE AGRUPACIÓN (BREAKDOWN) ---
                                # Agrupar por [X, Breakdown] y sumar la primera métrica Y
                                metric = y_cols[0]
                                grouped_df = chart_df.groupby([x_col, breakdown_col])[metric].sum().reset_index()
                                
                                # Pivotar para que los valores de breakdown sean columnas
                                pivot_df = grouped_df.pivot(index=x_col, columns=breakdown_col, values=metric).reset_index()
                                pivot_df = pivot_df.fillna(0)
                                
                                # Las nuevas series son las columnas pivotadas (excluyendo x_col)
                                new_series = [c for c in pivot_df.columns if c != x_col]
                                
                                if is_date:
                                    pivot_df = pivot_df.sort_values(x_col)
                                    pivot_df[x_col] = pivot_df[x_col].dt.strftime('%Y-%m-%d')
                                
                                dashboard_data["charts"].append({
                                    "id": chart_id,
                                    "type": "bar", # Default a barras apiladas o agrupadas
                                    "title": f"{title} (por {breakdown_col})",
                                    "xAxis": x_col,
                                    "data": pivot_df.to_dict(orient="records"),
                                    "bars": new_series # Usamos 'bars' para que ChartCard las pinte
                                })
                                
                            else:
                                # --- LÓGICA SIMPLE (SIN AGRUPACIÓN) ---
                                grouped_df = chart_df.groupby(x_col)[y_cols].sum().reset_index()
                                
                                if is_date:
                                    grouped_df = grouped_df.sort_values(x_col)
                                    grouped_df[x_col] = grouped_df[x_col].dt.strftime('%Y-%m-%d')
                                else:
                                    grouped_df = grouped_df.sort_values(y_cols[0], ascending=False).head(20)

                                # Determinar tipo por defecto (Línea si es fecha, Barra si no)
                                # Si el nombre de la columna sugiere fecha, forzar línea
                                x_col_lower = x_col.lower()
                                date_keywords = ['date', 'fecha', 'time', 'tiempo', 'year', 'año', 'month', 'mes', 'day', 'dia']
                                is_date_by_name = any(k in x_col_lower for k in date_keywords)
                                
                                chart_type = "line" if (is_date or is_date_by_name) else "bar"

                                dashboard_data["charts"].append({
                                    "id": chart_id,
                                    "type": chart_type,
                                    "title": title,
                                    "xAxis": x_col,
                                    "data": grouped_df.to_dict(orient="records"),
                                    "lines": y_cols if chart_type == "line" else None,
                                    "bars": y_cols if chart_type == "bar" else None
                                })
                        except Exception as e:
                            print(f"Error generando gráfico {title}: {e}")

            else:
                # --- LÓGICA ANTIGUA (Retrocompatibilidad) ---
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
                            "data": bar_df.to_dict(orient="records"),
                            "bars": [metric]
                        })

            # 4. Evaluar Alertas (Común para ambos)
            if alert_rules:
                for rule in alert_rules:
                    column = rule.get("column")
                    threshold = float(rule.get("threshold", 0))
                    operator = rule.get("operator", ">")
                    
                    if column in df.columns:
                        triggered = False
                        count = 0
                        
                        if operator == ">":
                            matches = df[df[column] > threshold]
                        elif operator == "<":
                            matches = df[df[column] < threshold]
                        else:
                            matches = []

                        if len(matches) > 0:
                            dashboard_data["alerts"].append({
                                "rule": f"{column} {operator} {threshold}",
                                "count": len(matches),
                                "message": f"Alerta: {len(matches)} registros tienen '{column}' {operator} {threshold}"
                            })

            return dashboard_data

        except Exception as e:
            raise ValueError(f"Error generando dashboard: {str(e)}")
