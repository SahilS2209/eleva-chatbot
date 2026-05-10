"""
Integration tests for API endpoints.
Tests the full request/response cycle.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock, MagicMock
from datetime import datetime
from bson import ObjectId
from app.main import app
from app.auth import create_access_token
from app.auth import hash_password


@pytest.fixture
async def client():
    """Create async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def admin_token():
    """Create a valid admin JWT token."""
    return create_access_token(data={"sub": "admin@test.com", "role": "admin"})


@pytest.fixture
def admin_headers(admin_token):
    """Create auth headers with admin token."""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.mark.asyncio
async def test_health_check(client):
    """Test that health endpoint returns healthy status."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


@pytest.mark.asyncio
async def test_root_endpoint(client):
    """Test that root endpoint returns API info."""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "version" in data


@pytest.mark.asyncio
@patch("app.routes.auth_routes.users_collection")
async def test_register_success(mock_users, client):
    """Test successful user registration."""
    mock_users.find_one = AsyncMock(return_value=None)
    mock_users.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id=ObjectId())
    )

    response = await client.post("/api/auth/register", json={
        "email": "new@test.com",
        "password": "password123",
        "name": "New User",
        "role": "admin",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "new@test.com"
    assert data["user"]["name"] == "New User"


@pytest.mark.asyncio
@patch("app.routes.auth_routes.users_collection")
async def test_register_duplicate_email(mock_users, client):
    """Test registration with existing email fails."""
    mock_users.find_one = AsyncMock(return_value={"email": "existing@test.com"})

    response = await client.post("/api/auth/register", json={
        "email": "existing@test.com",
        "password": "password123",
        "name": "User",
        "role": "admin",
    })
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]


@pytest.mark.asyncio
@patch("app.routes.auth_routes.users_collection")
async def test_login_success(mock_users, client):
    """Test successful login."""
    mock_users.find_one = AsyncMock(return_value={
        "_id": ObjectId(),
        "email": "admin@test.com",
        "name": "Admin",
        "role": "admin",
        "hashed_password": hash_password("password123"),
        "created_at": datetime.utcnow(),
        "is_active": True,
    })

    response = await client.post("/api/auth/login", json={
        "email": "admin@test.com",
        "password": "password123",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "admin@test.com"


@pytest.mark.asyncio
@patch("app.routes.auth_routes.users_collection")
async def test_login_wrong_password(mock_users, client):
    """Test login with wrong password fails."""
    from app.auth import hash_password
    mock_users.find_one = AsyncMock(return_value={
        "_id": ObjectId(),
        "email": "admin@test.com",
        "name": "Admin",
        "role": "admin",
        "hashed_password": hash_password("correctpassword"),
        "created_at": datetime.utcnow(),
        "is_active": True,
    })

    response = await client.post("/api/auth/login", json={
        "email": "admin@test.com",
        "password": "wrongpassword",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
@patch("app.routes.auth_routes.users_collection")
async def test_login_nonexistent_user(mock_users, client):
    """Test login with non-existent email fails."""
    mock_users.find_one = AsyncMock(return_value=None)

    response = await client.post("/api/auth/login", json={
        "email": "nobody@test.com",
        "password": "password123",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
@patch("app.routes.conversation_routes.conversations_collection")
async def test_create_conversation(mock_convos, client):
    """Test creating a new conversation."""
    mock_convos.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id=ObjectId())
    )

    response = await client.post("/api/conversations?user_name=TestUser")
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["status"] == "active"


@pytest.mark.asyncio
@patch("app.auth.users_collection")
@patch("app.routes.conversation_routes.conversations_collection")
@patch("app.routes.conversation_routes.messages_collection")
async def test_list_conversations_requires_auth(mock_msgs, mock_convos, mock_users, client):
    """Test that listing conversations requires authentication."""
    response = await client.get("/api/conversations")
    assert response.status_code == 401


@pytest.mark.asyncio
@patch("app.routes.ticket_routes.tickets_collection")
async def test_create_ticket(mock_tickets, client):
    """Test creating a support ticket."""
    fake_id = ObjectId()
    mock_tickets.insert_one = AsyncMock(
        return_value=MagicMock(inserted_id=fake_id)
    )

    response = await client.post("/api/tickets", json={
        "title": "Test Ticket",
        "description": "Something needs fixing",
        "priority": "high",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Ticket"
    assert data["priority"] == "high"
    assert data["status"] == "open"


@pytest.mark.asyncio
@patch("app.routes.chat_routes.messages_collection")
@patch("app.routes.chat_routes.conversations_collection")
async def test_send_message_conversation_not_found(mock_convos, mock_msgs, client):
    """Test sending message to non-existent conversation."""
    mock_convos.find_one = AsyncMock(return_value=None)

    response = await client.post(
        f"/api/chat/{str(ObjectId())}/message",
        json={"content": "Hello"}
    )
    assert response.status_code == 404
