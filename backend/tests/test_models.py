import pytest
from pydantic import ValidationError
from app.models.user import UserCreate, UserLogin, UserResponse, UserRole
from app.models.conversation import Conversation, ConversationStatus, Message, MessageRole
from app.models.ticket import Ticket, TicketCreate, TicketPriority, TicketStatus
from app.models.knowledge_base import KnowledgeDocumentCreate
from datetime import datetime


def test_user_create_valid():
    """Test creating a valid user."""
    user = UserCreate(
        email="test@example.com",
        password="password123",
        name="Test User",
        role=UserRole.ADMIN,
    )
    assert user.email == "test@example.com"
    assert user.name == "Test User"
    assert user.role == UserRole.ADMIN


def test_user_create_invalid_email():
    """Test that invalid email raises validation error."""
    with pytest.raises(ValidationError):
        UserCreate(
            email="not-an-email",
            password="password123",
            name="Test User",
        )


def test_user_create_short_password():
    """Test that short password raises validation error."""
    with pytest.raises(ValidationError):
        UserCreate(
            email="test@example.com",
            password="12345",
            name="Test User",
        )


def test_user_create_default_role():
    """Test that default role is customer."""
    user = UserCreate(
        email="test@example.com",
        password="password123",
        name="Test User",
    )
    assert user.role == UserRole.CUSTOMER


def test_user_login_valid():
    """Test valid login model."""
    login = UserLogin(email="test@example.com", password="password123")
    assert login.email == "test@example.com"


def test_user_response_model():
    """Test user response model."""
    response = UserResponse(
        id="123",
        email="test@example.com",
        name="Test",
        role=UserRole.ADMIN,
        created_at=datetime.utcnow(),
        is_active=True,
    )
    assert response.id == "123"
    assert response.is_active is True


def test_conversation_default_status():
    """Test that default conversation status is active."""
    conv = Conversation()
    assert conv.status == ConversationStatus.ACTIVE


def test_conversation_status_values():
    """Test all conversation status values."""
    assert ConversationStatus.ACTIVE == "active"
    assert ConversationStatus.ESCALATED == "escalated"
    assert ConversationStatus.RESOLVED == "resolved"


def test_message_roles():
    """Test all message role values."""
    assert MessageRole.USER == "user"
    assert MessageRole.ASSISTANT == "assistant"
    assert MessageRole.AGENT == "agent"
    assert MessageRole.SYSTEM == "system"


def test_message_creation():
    """Test creating a message."""
    msg = Message(
        conversation_id="conv123",
        role=MessageRole.USER,
        content="Hello",
    )
    assert msg.conversation_id == "conv123"
    assert msg.role == MessageRole.USER
    assert msg.content == "Hello"
    assert msg.timestamp is not None


def test_ticket_create_valid():
    """Test creating a valid ticket."""
    ticket = TicketCreate(
        title="Test Issue",
        description="Something is broken",
        priority=TicketPriority.HIGH,
    )
    assert ticket.title == "Test Issue"
    assert ticket.priority == TicketPriority.HIGH


def test_ticket_create_default_priority():
    """Test default ticket priority is medium."""
    ticket = TicketCreate(
        title="Test",
        description="Description",
    )
    assert ticket.priority == TicketPriority.MEDIUM


def test_ticket_priority_values():
    """Test all priority values."""
    assert TicketPriority.LOW == "low"
    assert TicketPriority.MEDIUM == "medium"
    assert TicketPriority.HIGH == "high"


def test_ticket_status_values():
    """Test all ticket status values."""
    assert TicketStatus.OPEN == "open"
    assert TicketStatus.IN_PROGRESS == "in_progress"
    assert TicketStatus.RESOLVED == "resolved"


def test_knowledge_document_create():
    """Test creating a knowledge document."""
    doc = KnowledgeDocumentCreate(
        title="FAQ",
        content="Some content here",
        source="faq.txt",
    )
    assert doc.title == "FAQ"
    assert doc.content == "Some content here"
    assert doc.source == "faq.txt"


def test_knowledge_document_optional_source():
    """Test that source is optional."""
    doc = KnowledgeDocumentCreate(
        title="Policy",
        content="Policy content",
    )
    assert doc.source is None
