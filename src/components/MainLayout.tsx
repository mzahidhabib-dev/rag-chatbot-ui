import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { FileUpload } from './FileUpload';
import { ChatInterface } from './ChatInterface';
import { AdminDashboard } from './AdminDashboard';
import { ClientDashboard } from './ClientDashboard';
import { ragApi, type DocumentDto, type ChatMessage } from '../api/rag.api';
import { BotMessageSquare, ShieldAlert, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Simple session ID generation for the MVP
const SESSION_ID = localStorage.getItem('rag_session_id') || crypto.randomUUID();
localStorage.setItem('rag_session_id', SESSION_ID);

export function MainLayout() {
  const { user, logout } = useAuth();
  const clientId = user?.tenantId || 'tenant-a';
  const isAdmin = user?.tenantId === 'acme'; // Demo condition for admin dashboard

  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const [isDocsLoading, setIsDocsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  
  const [view, setView] = useState<'chat' | 'dashboard'>('chat');

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
    // 1. Clear old tenant data while loading
    setDocuments([]);
    setMessages([]);
    setIsDocsLoading(true);

    // 2. Fetch new tenant data
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
  }, [clientId, user]);

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
    // Optimistic UI update: add user message and an empty assistant message
    const newMsg: ChatMessage = { role: 'user', content: query };
    setMessages(prev => [...prev, newMsg, { role: 'assistant', content: '' }]);
    setIsChatLoading(true);
    setToolStatus('Thinking...');

    try {
      await ragApi.chatStream(
        query, 
        SESSION_ID,
        (chunk) => {
          setIsChatLoading(false); // Turn off typing indicator once first chunk arrives
          setToolStatus(null);     // Clear tool status when text starts streaming
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              // Append the chunk to the existing text
              lastMessage.content += chunk;
            }
            return newMessages;
          });
        },
        (event) => {
          if (event.type === 'tool') {
            if (event.toolName === 'searchDatabase') {
              setToolStatus('Searching knowledge base...');
            } else if (event.toolName === 'sendEmail') {
              setToolStatus('Drafting email...');
            } else if (event.toolName === 'qualifyLead') {
              setToolStatus('Analyzing lead data...');
            } else {
              setToolStatus('Using external tool...');
            }
          } else if (event.type === 'metadata') {
            console.log('Metadata Received:', event);
          }
        }
      );
    } catch (error) {
      console.error('Chat failed', error);
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content = 'Sorry, I encountered an error while trying to answer that.';
        }
        return newMessages;
      });
    } finally {
      setIsChatLoading(false);
      setToolStatus(null);
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
              onClick={() => setView(view === 'chat' ? 'dashboard' : 'chat')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'dashboard' 
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                  : 'text-textSecondary hover:bg-surface hover:text-text'
              }`}
            >
              <ShieldAlert size={16} />
              {view === 'dashboard' ? 'Exit Dashboard' : 'Dashboard'}
            </button>
            <div className="w-px h-6 bg-border mx-1"></div>
            <span className="text-xs text-textSecondary uppercase tracking-wider font-semibold flex items-center gap-1">
              <UserIcon size={14} />
              {user?.email}
            </span>
            <div className="bg-surface border border-border px-3 py-1 rounded-full text-xs font-medium text-primary">
              {user?.tenantName || clientId}
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors ml-2"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </header>

        {view === 'dashboard' ? (
          <div className="flex-1 overflow-hidden">
            {isAdmin ? <AdminDashboard /> : <ClientDashboard />}
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full border-r border-border min-w-0 bg-background relative">
              {/* Tool Status Badge */}
              {toolStatus && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-1.5 rounded-full text-xs font-semibold shadow flex items-center gap-2 z-10 animate-pulse border border-blue-200 dark:border-blue-800">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></div>
                  {toolStatus}
                </div>
              )}
              
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

