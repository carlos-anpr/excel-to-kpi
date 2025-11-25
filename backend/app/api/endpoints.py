from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlmodel import Session, select
from app.services.data_service import DataService
from app.services.insights_service import InsightsService
from app.services.recommendations_service import RecommendationsService
from app.core.database import get_session
from app.models.file_model import FileRecord
from typing import Dict, List
import os
import pandas as pd

router = APIRouter()

@router.get("/files", response_model=List[FileRecord])
async def list_files(session: Session = Depends(get_session)):
    files = session.exec(select(FileRecord)).all()
    return files

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), session: Session = Depends(get_session)):
    if not file.filename.lower().endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Formato de archivo no soportado. Use CSV o Excel.")
    
    try:
        contents = await file.read()
        file_id = DataService.save_file(contents, file.filename)
        
        # Guardar registro inicial en BD
        file_record = FileRecord(id=file_id, filename=file.filename)
        session.add(file_record)
        session.commit()
        
        preview_data = DataService.get_preview(file_id)
        preview_data["filename"] = file.filename
        return preview_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/files/{file_id}/preview")
async def get_file_preview(file_id: str, session: Session = Depends(get_session)):
    file_record = session.get(FileRecord, file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    try:
        preview_data = DataService.get_preview(file_id)
        preview_data["filename"] = file_record.filename
        return preview_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/files/{file_id}")
async def delete_file(file_id: str, session: Session = Depends(get_session)):
    file_record = session.get(FileRecord, file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    # Eliminar archivo físico
    DataService.delete_file(file_id)
    
    # Eliminar registro de BD
    session.delete(file_record)
    session.commit()
    
    return {"message": "Archivo eliminado correctamente"}

@router.post("/files/{file_id}/map")
async def map_columns(file_id: str, mapping: Dict, session: Session = Depends(get_session)):
    file_record = session.get(FileRecord, file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    file_record.column_mapping = mapping
    session.add(file_record)
    session.commit()
    
    return {"message": "Mapeo guardado correctamente", "file_id": file_id}

@router.post("/files/{file_id}/alerts")
async def save_alerts(file_id: str, rules: List[Dict], session: Session = Depends(get_session)):
    file_record = session.get(FileRecord, file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    file_record.alert_rules = rules
    session.add(file_record)
    session.commit()
    
    return {"message": "Alertas guardadas correctamente", "file_id": file_id}

@router.get("/dashboard/{file_id}")
async def get_dashboard(file_id: str, session: Session = Depends(get_session)):
    file_record = session.get(FileRecord, file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    if not file_record.column_mapping:
        raise HTTPException(status_code=400, detail="El archivo no tiene mapeo de columnas")
        
    try:
        dashboard_data = DataService.get_dashboard_data(
            file_id, 
            file_record.column_mapping,
            file_record.alert_rules
        )
        return dashboard_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/dashboard/{file_id}/preview")
async def preview_dashboard(file_id: str, mapping: Dict, session: Session = Depends(get_session)):
    file_record = session.get(FileRecord, file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
        
    try:
        # Usamos el mapeo enviado en el body, no el guardado
        dashboard_data = DataService.get_dashboard_data(
            file_id, 
            mapping,
            file_record.alert_rules
        )
        return dashboard_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/files/{file_id}/insights")
async def get_insights(file_id: str, session: Session = Depends(get_session)):
    """Genera insights automáticos para un archivo."""
    file_record = session.get(FileRecord, file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    # Buscar el archivo físico
    upload_dir = "uploads"
    found_file = None
    for f in os.listdir(upload_dir):
        if f.startswith(file_id):
            found_file = os.path.join(upload_dir, f)
            break
    
    if not found_file:
        raise HTTPException(status_code=404, detail="Archivo físico no encontrado")
    
    try:
        # Cargar el DataFrame
        df = DataService._load_dataframe(found_file)
        
        # Generar insights
        insights = InsightsService.generate_insights(df, file_record.column_mapping)
        
        return {
            "file_id": file_id,
            "filename": file_record.filename,
            "insights": insights,
            "total_insights": len(insights)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando insights: {str(e)}")


@router.get("/files/{file_id}/recommendations")
async def get_recommendations(file_id: str, session: Session = Depends(get_session)):
    """Genera recomendaciones de KPIs y gráficos para un archivo."""
    file_record = session.get(FileRecord, file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    # Buscar el archivo físico
    upload_dir = "uploads"
    found_file = None
    for f in os.listdir(upload_dir):
        if f.startswith(file_id):
            found_file = os.path.join(upload_dir, f)
            break
    
    if not found_file:
        raise HTTPException(status_code=404, detail="Archivo físico no encontrado")
    
    try:
        # Cargar el DataFrame
        df = DataService._load_dataframe(found_file)
        
        # Generar recomendaciones (sin configuración existente para el mapeo inicial)
        recommendations = RecommendationsService.generate_recommendations(df, None)
        
        return {
            "file_id": file_id,
            "filename": file_record.filename,
            **recommendations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando recomendaciones: {str(e)}")


@router.post("/files/{file_id}/recommendations/next")
async def get_next_recommendation(file_id: str, body: Dict, session: Session = Depends(get_session)):
    """
    Obtiene la siguiente recomendación basada en la configuración actual.
    Body: { "existing_config": {...}, "type": "kpi" | "chart" }
    """
    file_record = session.get(FileRecord, file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    upload_dir = "uploads"
    found_file = None
    for f in os.listdir(upload_dir):
        if f.startswith(file_id):
            found_file = os.path.join(upload_dir, f)
            break
    
    if not found_file:
        raise HTTPException(status_code=404, detail="Archivo físico no encontrado")
    
    try:
        df = DataService._load_dataframe(found_file)
        existing_config = body.get("existing_config", {})
        rec_type = body.get("type", "chart")
        
        result = RecommendationsService.get_next_recommendation(df, existing_config, rec_type)
        
        if 'recommendation' in result:
            return {
                "success": True,
                "recommendation": result['recommendation']
            }
        else:
            return {
                "success": False,
                "message": result.get('message', f"No hay más recomendaciones de {rec_type} disponibles")
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo recomendación: {str(e)}")
