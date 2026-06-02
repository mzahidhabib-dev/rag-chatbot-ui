import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { FileUpload } from './components/FileUpload';
import { ChatInterface } from './components/ChatInterface';
import { ragApi, type DocumentDto, type ChatMessage } from './api/rag.api';
import { BotMessageSquare } from 'lucide-react';

// Simple session ID generation for the MVP
const SESSION_ID = localStorage.getItem('rag_session_id') || crypto.randomUUID();
localStorage.setItem('rag_session_id', SESSION_ID);

function App() {
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const [isDocsLoading, setIsDocsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isChatLoading, setIsChatLoading] = useState(false);

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
    fetchDocuments();
    fetchHistory();
    // Start polling docs status every 5s if there are processing docs
    const interval = setInterval(() => {
      setDocuments(current => {
        if (current.some(d => d.status === 'processing')) {
          fetchDocuments();
        }
        return current;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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
        <header className="h-16 flex items-center px-6 border-b border-border bg-surface/50 backdrop-blur shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-primary/20 p-1.5 rounded-lg">
              <BotMessageSquare className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-300">
              Synapse RAG Assistant
            </h1>
          </div>
        </header>

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
      </main>
    </div>
  );
}

export default App;
