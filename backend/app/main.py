from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import endpoints
from app.core.database import create_db_and_tables

app = FastAPI(
    title="Spreadsheet-to-AI Dashboard Replacer",
    description="API para procesar hojas de cálculo y generar dashboards.",
    version="0.1.0"
)

# Configuración de CORS (permitir todo para desarrollo local)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

app.include_router(endpoints.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "API is running", "status": "ok"}
