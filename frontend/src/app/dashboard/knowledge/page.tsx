'use client';

import { useEffect, useState } from 'react';
import { knowledgeAPI } from '@/lib/api';
import { BookOpen, Upload, Plus, Trash2, FileText, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Document {
  id: string;
  title: string;
  source: string | null;
  file_type: string | null;
  uploaded_by: string | null;
  created_at: string;
  chunk_count: number;
  is_active: boolean;
}

interface DocumentDetail {
  id: string;
  title: string;
  content: string;
  source: string | null;
  file_type: string | null;
  created_at: string;
  chunk_count: number;
}

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewDoc, setViewDoc] = useState<DocumentDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [source, setSource] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = async () => {
    try {
      const response = await knowledgeAPI.listDocuments();
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleViewDocument = async (id: string) => {
    setViewLoading(true);
    try {
      const response = await knowledgeAPI.getDocument(id);
      setViewDoc(response.data);
    } catch (error) {
      toast.error('Failed to load document');
    } finally {
      setViewLoading(false);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      await knowledgeAPI.addDocument({ title, content, source: source || undefined });
      toast.success('Document added to knowledge base');
      setTitle('');
      setContent('');
      setSource('');
      setShowAddForm(false);
      fetchDocuments();
    } catch (error) {
      toast.error('Failed to add document');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await knowledgeAPI.uploadFile(file);
      toast.success('File uploaded successfully');
      fetchDocuments();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await knowledgeAPI.deleteDocument(id);
      toast.success('Document deleted');
      setDeleteId(null);
      fetchDocuments();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Train Chatbot</h1>
        <div className="flex gap-3">
          <label className="btn-secondary flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            Upload File
            <input
              type="file"
              accept=".pdf,.txt,.md"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Training Data
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="font-semibold text-lg">Delete Document</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this document? This will remove it from the knowledge base and the AI will no longer use it to answer questions.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Document Modal */}
      {viewDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full h-[85vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b flex-shrink-0">
              <div>
                <h2 className="font-semibold text-lg">{viewDoc.title}</h2>
                <div className="flex gap-3 text-xs text-gray-400 mt-1">
                  <span>{viewDoc.chunk_count} chunks</span>
                  <span>{viewDoc.file_type || 'text'}</span>
                  <span>{new Date(viewDoc.created_at).toLocaleDateString()}</span>
                  {viewDoc.source && <span>Source: {viewDoc.source}</span>}
                </div>
              </div>
              <button
                onClick={() => setViewDoc(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-gray-50 p-4 rounded-lg">
                {viewDoc.content}
              </pre>
            </div>
            <div className="px-6 py-3 border-t flex justify-end flex-shrink-0">
              <button onClick={() => setViewDoc(null)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Document Form */}
      {showAddForm && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-4">Add Training Document</h2>
          <form onSubmit={handleAddDocument} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field"
                placeholder="e.g., Return Policy"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="input-field min-h-[200px]"
                placeholder="Paste your document content here..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source (optional)</label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="input-field"
                placeholder="e.g., company-policies.pdf"
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={uploading} className="btn-primary">
                {uploading ? 'Adding...' : 'Add to Knowledge Base'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Documents List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : documents.length === 0 ? (
        <div className="card text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No training documents added yet</p>
          <p className="text-sm text-gray-400">
            Add documents to train the AI chatbot on your company&apos;s information
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary-50 rounded-lg">
                  <FileText className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-medium">{doc.title}</h3>
                  <div className="flex gap-4 text-xs text-gray-400 mt-1">
                    <span>{doc.chunk_count} chunks</span>
                    <span>{doc.file_type || 'text'}</span>
                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleViewDocument(doc.id)}
                  className="text-gray-400 hover:text-primary-600 transition-colors p-2"
                  title="View document"
                >
                  <Eye className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setDeleteId(doc.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-2"
                  title="Delete document"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
