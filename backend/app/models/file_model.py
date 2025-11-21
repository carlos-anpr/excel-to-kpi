from typing import Optional, Dict
from sqlmodel import Field, SQLModel, JSON

class FileRecord(SQLModel, table=True):
    id: str = Field(primary_key=True)
    filename: str
    column_mapping: Optional[Dict] = Field(default=None, sa_type=JSON)
