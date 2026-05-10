from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List
from app.models.knowledge_base import (
    KnowledgeDocumentCreate, KnowledgeDocumentResponse
)
from app.database import knowledge_base_collection
from app.auth import require_admin
from app.services.knowledge_service import KnowledgeService
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/api/knowledge", tags=["Knowledge Base"])
knowledge_service = KnowledgeService()


@router.post("/documents", response_model=KnowledgeDocumentResponse)
async def add_document(
    doc_data: KnowledgeDocumentCreate,
    current_user: dict = Depends(require_admin),
):
    """Add a text document to the knowledge base."""
    # Process and store in vector DB
    chunk_count = await knowledge_service.add_document(
        title=doc_data.title,
        content=doc_data.content,
        source=doc_data.source,
    )

    doc = {
        "title": doc_data.title,
        "content": doc_data.content,
        "source": doc_data.source,
        "file_type": "text",
        "uploaded_by": current_user["id"],
        "created_at": datetime.utcnow(),
        "chunk_count": chunk_count,
        "is_active": True,
    }

    result = await knowledge_base_collection.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return KnowledgeDocumentResponse(**doc)


@router.post("/upload", response_model=KnowledgeDocumentResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_admin),
):
    """Upload a PDF or text file to the knowledge base."""
    if file.content_type not in ["application/pdf", "text/plain", "text/markdown"]:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, TXT, and MD files are supported"
        )

    content = await file.read()

    if file.content_type == "application/pdf":
        text_content = await knowledge_service.extract_pdf_text(content)
    else:
        text_content = content.decode("utf-8")

    chunk_count = await knowledge_service.add_document(
        title=file.filename,
        content=text_content,
        source=file.filename,
    )

    doc = {
        "title": file.filename,
        "content": text_content,  # Store full content
        "source": file.filename,
        "file_type": file.content_type,
        "uploaded_by": current_user["id"],
        "created_at": datetime.utcnow(),
        "chunk_count": chunk_count,
        "is_active": True,
    }

    result = await knowledge_base_collection.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return KnowledgeDocumentResponse(**doc)


@router.get("/documents", response_model=List[KnowledgeDocumentResponse])
async def list_documents(current_user: dict = Depends(require_admin)):
    """List all knowledge base documents."""
    documents = []
    cursor = knowledge_base_collection.find().sort("created_at", -1)
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        documents.append(KnowledgeDocumentResponse(**doc))
    return documents


@router.get("/documents/{doc_id}")
async def get_document(doc_id: str, current_user: dict = Depends(require_admin)):
    """Get a single document with full content."""
    doc = await knowledge_base_collection.find_one({"_id": ObjectId(doc_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "id": str(doc["_id"]),
        "title": doc.get("title"),
        "content": doc.get("content", ""),
        "source": doc.get("source"),
        "file_type": doc.get("file_type"),
        "uploaded_by": doc.get("uploaded_by"),
        "created_at": doc["created_at"].isoformat(),
        "chunk_count": doc.get("chunk_count", 0),
        "is_active": doc.get("is_active", True),
    }


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, current_user: dict = Depends(require_admin)):
    """Delete a document from the knowledge base."""
    result = await knowledge_base_collection.delete_one({"_id": ObjectId(doc_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")

    # Also remove from vector store
    await knowledge_service.delete_document(doc_id)
    return {"message": "Document deleted"}
