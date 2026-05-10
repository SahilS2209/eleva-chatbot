import asyncio
from unittest.mock import patch

import pytest
from app.main import app
from httpx import AsyncClient, ASGITransport


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def client():
    """Create async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def mock_db():
    """Mock database collections."""
    with patch("app.database.users_collection") as mock_users, \
         patch("app.database.conversations_collection") as mock_convos, \
         patch("app.database.messages_collection") as mock_msgs, \
         patch("app.database.tickets_collection") as mock_tickets, \
         patch("app.database.knowledge_base_collection") as mock_kb:
        yield {
            "users": mock_users,
            "conversations": mock_convos,
            "messages": mock_msgs,
            "tickets": mock_tickets,
            "knowledge_base": mock_kb,
        }
