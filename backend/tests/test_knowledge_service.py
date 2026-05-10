import pytest
from app.services.knowledge_service import KnowledgeService
import os
import shutil

TEST_CHROMA_DIR = "./test_chroma_data"


@pytest.fixture
def knowledge_service():
    """Create a fresh knowledge service for testing."""
    # Reset singleton for testing
    KnowledgeService._instance = None
    KnowledgeService._client = None
    KnowledgeService._collection = None

    os.environ["CHROMA_PERSIST_DIR"] = TEST_CHROMA_DIR
    service = KnowledgeService()
    yield service

    # Cleanup
    KnowledgeService._instance = None
    KnowledgeService._client = None
    KnowledgeService._collection = None
    if os.path.exists(TEST_CHROMA_DIR):
        shutil.rmtree(TEST_CHROMA_DIR)


@pytest.mark.asyncio
async def test_add_document(knowledge_service):
    """Test adding a document to the knowledge base."""
    chunk_count = await knowledge_service.add_document(
        title="Test Doc",
        content="This is a test document with enough content to be meaningful. " * 10,
        source="test.txt",
    )
    assert chunk_count > 0


@pytest.mark.asyncio
async def test_add_empty_document(knowledge_service):
    """Test adding an empty document returns 0 chunks."""
    chunk_count = await knowledge_service.add_document(
        title="Empty",
        content="",
        source="empty.txt",
    )
    assert chunk_count == 0


@pytest.mark.asyncio
async def test_search_returns_results(knowledge_service):
    """Test that search returns relevant results after adding a document."""
    content = """
    Our return policy allows customers to return products within 30 days.
    Items must be unused and in original packaging.
    Refunds are processed within 5-7 business days.
    """
    await knowledge_service.add_document(
        title="Return Policy",
        content=content,
        source="policy.txt",
    )

    results = await knowledge_service.search("How do I return a product?")
    assert len(results) > 0
    assert "return" in results[0]["content"].lower()


@pytest.mark.asyncio
async def test_search_result_structure(knowledge_service):
    """Test that search results have correct structure."""
    await knowledge_service.add_document(
        title="FAQ",
        content="We offer payroll management services for all company sizes.",
        source="faq.txt",
    )

    results = await knowledge_service.search("payroll")
    assert len(results) > 0
    assert "content" in results[0]
    assert "metadata" in results[0]
    assert "distance" in results[0]


@pytest.mark.asyncio
async def test_document_chunking(knowledge_service):
    """Test that large documents are split into multiple chunks."""
    large_content = "This is a paragraph about HR services. " * 100

    chunk_count = await knowledge_service.add_document(
        title="Large Doc",
        content=large_content,
        source="large.txt",
    )
    assert chunk_count > 1


@pytest.mark.asyncio
async def test_delete_document(knowledge_service):
    """Test deleting a document from the knowledge base."""
    await knowledge_service.add_document(
        title="ToDelete",
        content="This document will be deleted soon.",
        source="delete.txt",
    )

    # Should not raise
    await knowledge_service.delete_document("ToDelete")
