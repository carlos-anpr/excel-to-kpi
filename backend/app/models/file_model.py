from typing import Optional, Dict, List
from sqlmodel import Field, SQLModel, JSON

class FileRecord(SQLModel, table=True):
    id: str = Field(primary_key=True)
    filename: str
    column_mapping: Optional[Dict] = Field(default=None, sa_type=JSON)
    alert_rules: Optional[List[Dict]] = Field(default=None, sa_type=JSON)
