from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlmodel import Session, select
from app.services.data_service import DataService
from app.core.database import get_session
from app.models.file_model import FileRecord
from typing import Dict, List

router = APIRouter()

@router.get("/files", response_model=List[FileRecord])
async def list_files(session: Session = Depends(get_session)):
    files = session.exec(select(FileRecord)).all()
    return files

@router.post("/upload")
async def upload_file(file: UploadFile = File(...), session: Session = Depends(get_session)):
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Formato de archivo no soportado. Use CSV o Excel.")
    
    try:
        contents = await file.read()
        file_id = DataService.save_file(contents, file.filename)
        
        # Guardar registro inicial en BD
        file_record = FileRecord(id=file_id, filename=file.filename)
        session.add(file_record)
        session.commit()
        
        preview_data = DataService.get_preview(file_id)
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
