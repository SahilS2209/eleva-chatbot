from pymongo import AsyncMongoClient
from app.config import get_settings

settings = get_settings()

client = AsyncMongoClient(settings.mongodb_url)
db = client[settings.database_name]

# Collections
users_collection = db["users"]
conversations_collection = db["conversations"]
messages_collection = db["messages"]
knowledge_base_collection = db["knowledge_base"]
tickets_collection = db["tickets"]
analytics_collection = db["analytics"]


async def init_db():
    """Initialize database indexes."""
    await users_collection.create_index("email", unique=True)
    await conversations_collection.create_index("user_id")
    await conversations_collection.create_index("status")
    await messages_collection.create_index("conversation_id")
    await tickets_collection.create_index("status")
    await tickets_collection.create_index("conversation_id")
