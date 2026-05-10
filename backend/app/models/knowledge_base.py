from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class KnowledgeDocument(BaseModel):
    id: Optional[str] = None
    title: str
    content: str
    source: Optional[str] = None
    file_type: Optional[str] = None
    uploaded_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    chunk_count: int = 0
    is_active: bool = True


class KnowledgeDocumentCreate(BaseModel):
    title: str
    content: str
    source: Optional[str] = None


class KnowledgeDocumentResponse(BaseModel):
    id: str
    title: str
    source: Optional[str]
    file_type: Optional[str]
    uploaded_by: Optional[str]
    created_at: datetime
    chunk_count: int
    is_active: bool
