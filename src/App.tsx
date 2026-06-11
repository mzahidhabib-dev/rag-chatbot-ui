import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { FileUpload } from './components/FileUpload';
import { ChatInterface } from './components/ChatInterface';
import { AdminDashboard } from './components/AdminDashboard';
import { ragApi, type DocumentDto, type ChatMessage } from './api/rag.api';
import { BotMessageSquare, ShieldAlert } from 'lucide-react';

// Simple session ID generation for the MVP
const SESSION_ID = localStorage.getItem('rag_session_id') || crypto.randomUUID();
localStorage.setItem('rag_session_id', SESSION_ID);

const TENANT_OPTIONS = [
  { id: 'tenant-a', name: 'Acme Corp (Tenant A)' },
  { id: 'tenant-b', name: 'Globex (Tenant B)' },
];

function App() {
  const [clientId, setClientId] = useState(() => localStorage.getItem('rag_client_id') || 'tenant-a');
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const [isDocsLoading, setIsDocsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const [view, setView] = useState<'chat' | 'admin'>('chat');

  const fetchDocuments = async () => {
    try {
      const docs = await ragApi.getDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to fetch documents', error);
    } finally {
      setIsDocsLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const history = await ragApi.getChatHistory(SESSION_ID);
      if (history && history.length > 0) {
        setMessages(history);
      }
    } catch (error) {
      console.error('Failed to fetch chat history', error);
    }
  };

  useEffect(() => {
    // 1. Update API headers and save to local storage
    ragApi.setClientId(clientId);
    localStorage.setItem('rag_client_id', clientId);
    
    // 2. Clear old tenant data while loading
    setDocuments([]);
    setMessages([]);
    setIsDocsLoading(true);

    // 3. Fetch new tenant data
    fetchDocuments();
    fetchHistory();
    
    // 4. Start polling docs status every 5s if there are processing docs
    const interval = setInterval(() => {
      setDocuments(current => {
        if (current.some(d => d.status === 'processing')) {
          fetchDocuments();
        }
        return current;
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, [clientId]);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(10);
    try {
      await ragApi.uploadDocument(file, (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          // Upload might be fast, but processing takes time. Cap visual progress at 90% until done.
          setUploadProgress(Math.min(percent, 90));
        }
      });
      // Fetch fresh documents
      await fetchDocuments();
      setUploadProgress(100);
    } catch (error) {
      console.error('Upload failed', error);
      alert('Failed to upload document. Please ensure it is a PDF or DOCX under 10MB.');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document? It will be removed from the AI knowledge base.')) return;
    try {
      await ragApi.deleteDocument(id);
      setDocuments(docs => docs.filter(d => d.id !== id));
    } catch (error) {
      console.error('Failed to delete', error);
      alert('Failed to delete document.');
    }
  };

  const handleSendMessage = async (query: string) => {
    // Optimistic UI update
    const newMsg: ChatMessage = { role: 'user', content: query };
    setMessages(prev => [...prev, newMsg]);
    setIsChatLoading(true);

    try {
      const response = await ragApi.chat(query, SESSION_ID);
      setMessages(prev => [...prev, { role: 'assistant', content: response.answer }]);
    } catch (error) {
      console.error('Chat failed', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error while trying to answer that.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const hasReadyDocuments = documents.some(d => d.status === 'ready');

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans text-text">
      <Sidebar 
        documents={documents} 
        onDelete={handleDelete} 
        isLoading={isDocsLoading} 
      />
      
      <main className="flex-1 flex flex-col h-full relative min-w-0">
        <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-surface/50 backdrop-blur shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-primary/20 p-1.5 rounded-lg">
              <BotMessageSquare className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-300">
              Synapse RAG Assistant
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView(view === 'chat' ? 'admin' : 'chat')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'admin' 
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                  : 'text-textSecondary hover:bg-surface hover:text-text'
              }`}
            >
              <ShieldAlert size={16} />
              {view === 'admin' ? 'Exit Admin' : 'Admin'}
            </button>
            <div className="w-px h-6 bg-border mx-1"></div>
            <span className="text-xs text-textSecondary uppercase tracking-wider font-semibold">Active Tenant:</span>
            <select 
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="bg-background border border-border text-sm text-text rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {TENANT_OPTIONS.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </header>

        {view === 'admin' ? (
          <div className="flex-1 overflow-hidden">
            <AdminDashboard />
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full border-r border-border min-w-0 bg-background">
              <ChatInterface 
                messages={messages} 
                onSendMessage={handleSendMessage} 
                isLoading={isChatLoading} 
                disabled={!hasReadyDocuments}
              />
            </div>

            {/* Right Panel for Upload */}
            <div className="w-80 shrink-0 bg-surface/30 p-6 overflow-y-auto">
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-text uppercase tracking-wider mb-2">Knowledge Ingestion</h2>
                <p className="text-xs text-textSecondary">
                  Upload documents to teach the AI new information. It will instantly become searchable.
                </p>
              </div>
              <FileUpload 
                onUpload={handleUpload} 
                isUploading={isUploading} 
                uploadProgress={uploadProgress} 
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
