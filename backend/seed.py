"""
Seed script to load sample knowledge base documents and create a default admin user.
Run this after starting the services:
    docker exec -it chatbot-backend python seed.py
"""
import asyncio
from datetime import datetime
from pathlib import Path

from app.auth import hash_password
from app.database import users_collection, knowledge_base_collection
from app.services.knowledge_service import KnowledgeService

knowledge_service = KnowledgeService()

SEED_DATA_DIR = Path(__file__).parent / "seed_data"


async def seed_admin_user():
    """Create default admin user."""
    existing = await users_collection.find_one({"email": "admin@elementshr.com"})
    if existing:
        print("✓ Admin user already exists")
        return

    admin_doc = {
        "email": "admin@elementshr.com",
        "name": "Admin",
        "role": "admin",
        "hashed_password": hash_password("admin123"),
        "created_at": datetime.utcnow(),
        "is_active": True,
    }
    await users_collection.insert_one(admin_doc)
    print("✓ Created admin user: admin@elementshr.com / admin123")


async def seed_agent_user():
    """Create default support agent user."""
    existing = await users_collection.find_one({"email": "agent@elementshr.com"})
    if existing:
        print("✓ Agent user already exists")
        return

    agent_doc = {
        "email": "agent@elementshr.com",
        "name": "Support Agent",
        "role": "agent",
        "hashed_password": hash_password("agent123"),
        "created_at": datetime.utcnow(),
        "is_active": True,
    }
    await users_collection.insert_one(agent_doc)
    print("✓ Created agent user: agent@elementshr.com / agent123")


async def seed_knowledge_base():
    """Load seed documents into the knowledge base."""
    files = list(SEED_DATA_DIR.glob("*.txt"))

    if not files:
        print("✗ No seed data files found in seed_data/")
        return

    for file_path in files:
        title = file_path.stem.replace("_", " ").title()

        # Check if already loaded
        existing = await knowledge_base_collection.find_one({"title": title})
        if existing:
            print(f"✓ '{title}' already loaded")
            continue

        content = file_path.read_text(encoding="utf-8")

        # Add to vector store
        chunk_count = await knowledge_service.add_document(
            title=title,
            content=content,
            source=file_path.name,
        )

        # Save metadata to MongoDB
        doc = {
            "title": title,
            "content": content,
            "source": file_path.name,
            "file_type": "text/plain",
            "uploaded_by": "system",
            "created_at": datetime.utcnow(),
            "chunk_count": chunk_count,
            "is_active": True,
        }
        await knowledge_base_collection.insert_one(doc)
        print(f"✓ Loaded '{title}' ({chunk_count} chunks)")


async def main():
    print("\n🌱 Seeding database...\n")
    await seed_admin_user()
    await seed_agent_user()
    await seed_knowledge_base()
    print("\n✅ Seeding complete!\n")
    print("Login credentials:")
    print("  Admin: admin@elementshr.com / admin123")
    print("  Agent: agent@elementshr.com / agent123")
    print()


if __name__ == "__main__":
    asyncio.run(main())
