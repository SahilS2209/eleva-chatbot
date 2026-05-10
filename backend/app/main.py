from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import init_db
from app.routes import (
    auth_routes, conversation_routes, chat_routes, ticket_routes,
    knowledge_routes, analytics_routes, users_routes, feedback_routes
)
from app.services.knowledge_service import KnowledgeService
from app.database import knowledge_base_collection


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - runs on startup and shutdown."""
    await init_db()
    await load_knowledge_base()
    yield


async def load_knowledge_base():
    """Load knowledge base documents into ChromaDB on startup."""

    service = KnowledgeService()
    if service.collection.count() > 0:
        return  # Already loaded

    try:
        cursor = knowledge_base_collection.find({"is_active": True})
        count = 0
        async for doc in cursor:
            content = doc.get("content", "")
            if content:
                await service.add_document(
                    title=doc.get("title", "Untitled"),
                    content=content,
                    source=doc.get("source", ""),
                )
                count += 1
        if count > 0:
            print(f"✓ Loaded {count} documents into ChromaDB")
    except Exception as e:
        print(f"Warning: Could not load knowledge base: {e}")


app = FastAPI(
    title=settings.app_name,
    description="AI-Powered Customer Support Chatbot Platform Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_routes.router)
app.include_router(conversation_routes.router)
app.include_router(chat_routes.router)
app.include_router(ticket_routes.router)
app.include_router(knowledge_routes.router)
app.include_router(analytics_routes.router)
app.include_router(users_routes.router)
app.include_router(feedback_routes.router)


@app.get("/")
async def root():
    return {
        "message": "AI Customer Support Platform API",
        "docs": "/docs",
        "version": "1.0.0",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
