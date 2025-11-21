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
            if found_file.endswith(".csv"):
                df = pd.read_csv(found_file)
            else:
                df = pd.read_excel(found_file)
            
            # Reemplazar NaN con None (null en JSON) para evitar errores en el frontend
            df = df.where(pd.notnull(df), None)

            preview = df.head(5).to_dict(orient="records")
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
    def get_dashboard_data(file_id: str, mapping: dict) -> dict:
        """Genera los datos para el dashboard basado en el mapeo."""
        found_file = None
        for f in os.listdir(UPLOAD_DIR):
            if f.startswith(file_id):
                found_file = os.path.join(UPLOAD_DIR, f)
                break
        
        if not found_file:
            raise FileNotFoundError("Archivo no encontrado")

        try:
            if found_file.endswith(".csv"):
                df = pd.read_csv(found_file)
            else:
                df = pd.read_excel(found_file)
            
            # Identificar columnas por tipo
            date_col = next((k for k, v in mapping.items() if v == 'date'), None)
            cat_cols = [k for k, v in mapping.items() if v == 'category']
            num_cols = [k for k, v in mapping.items() if v == 'number']

            dashboard_data = {
                "kpis": [],
                "charts": []
            }

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

            return dashboard_data

        except Exception as e:
            raise ValueError(f"Error generando dashboard: {str(e)}")
