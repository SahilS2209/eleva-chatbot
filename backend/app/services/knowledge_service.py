import os
import io
from typing import List
from langchain_text_splitters import RecursiveCharacterTextSplitter
import chromadb

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_data")


class KnowledgeService:
    _instance = None
    _client = None
    _collection = None

    def __new__(cls):
        """Singleton pattern to ensure one ChromaDB client across the app."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if KnowledgeService._client is None:
            KnowledgeService._client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
            KnowledgeService._collection = KnowledgeService._client.get_or_create_collection(
                name="knowledge_base",
                metadata={"hnsw:space": "cosine"}
            )
        self.client = KnowledgeService._client
        self.collection = KnowledgeService._collection
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )

    async def add_document(self, title: str, content: str, source: str = None) -> int:
        """Split document into chunks and add to vector store."""
        chunks = self.text_splitter.split_text(content)

        if not chunks:
            return 0

        ids = [f"{title}_{i}" for i in range(len(chunks))]
        metadatas = [{"title": title, "source": source or title, "chunk_index": i} for i in range(len(chunks))]

        self.collection.add(
            documents=chunks,
            ids=ids,
            metadatas=metadatas,
        )

        return len(chunks)

    async def search(self, query: str, n_results: int = 5) -> List[dict]:
        """Search the knowledge base for relevant documents."""
        if self.collection.count() == 0:
            return []

        results = self.collection.query(
            query_texts=[query],
            n_results=min(n_results, self.collection.count()),
        )

        documents = []
        if results and results["documents"]:
            for i, doc in enumerate(results["documents"][0]):
                documents.append({
                    "content": doc,
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "distance": results["distances"][0][i] if results["distances"] else 0,
                })

        return documents

    async def extract_pdf_text(self, pdf_bytes: bytes) -> str:
        """Extract text from PDF bytes."""
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(pdf_bytes))
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text

    async def delete_document(self, doc_id: str):
        """Delete document chunks from vector store."""
        try:
            all_ids = self.collection.get()["ids"]
            matching_ids = [id for id in all_ids if id.startswith(doc_id)]
            if matching_ids:
                self.collection.delete(ids=matching_ids)
        except Exception:
            pass
