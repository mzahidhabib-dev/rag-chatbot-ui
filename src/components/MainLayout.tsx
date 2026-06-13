import { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { FileUpload } from './FileUpload';
import { ChatInterface } from './ChatInterface';
import { AdminDashboard } from './AdminDashboard';
import { ClientDashboard } from './ClientDashboard';
import { ragApi, type DocumentDto, type ChatMessage, type SessionDto } from '../api/rag.api';
import { BotMessageSquare, ShieldAlert, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function MainLayout() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  // ─── Session State ─────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);

  // ─── Document State ─────────────────────────────────────────────────────────
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [isDocsLoading, setIsDocsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ─── Chat State ─────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);

  // ─── UI State ──────────────────────────────────────────────────────────────
  const [view, setView] = useState<'chat' | 'dashboard'>('chat');
  const isNewSessionRef = useRef(false);

  // ─── Data Fetchers ─────────────────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    try {
      const docs = await ragApi.getDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to fetch documents', error);
    } finally {
      setIsDocsLoading(false);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const list = await ragApi.listSessions();
      setSessions(list);
    } catch (error) {
      console.error('Failed to fetch sessions', error);
    } finally {
      setIsSessionsLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (sessionId: string) => {
    try {
      const history = await ragApi.getChatHistory(sessionId);
      setMessages(history ?? []);
    } catch (error) {
      console.error('Failed to fetch chat history', error);
      setMessages([]);
    }
  }, []);

  // ─── Initialization (runs when user changes) ────────────────────────────────
  useEffect(() => {
    if (!user) return;

    setDocuments([]);
    setMessages([]);
    setSessions([]);
    setCurrentSessionId(null);
    setIsDocsLoading(true);
    setIsSessionsLoading(true);

    fetchDocuments();
    fetchSessions();

    // Poll for processing documents every 5s
    const interval = setInterval(() => {
      setDocuments(current => {
        if (current.some(d => d.status === 'processing')) {
          fetchDocuments();
        }
        return current;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [user?.userId]);

  // Load history when the active session changes
  useEffect(() => {
    if (currentSessionId) {
      if (isNewSessionRef.current) {
        // We just created this session and optimistically set messages. 
        // Skip fetching history to preserve the optimistic UI stream.
        isNewSessionRef.current = false;
        return;
      }
      setMessages([]);
      fetchHistory(currentSessionId);
    }
  }, [currentSessionId, fetchHistory]);

  // ─── Session Handlers ──────────────────────────────────────────────────────
  const handleNewChat = async () => {
    try {
      const { id } = await ragApi.createSession();
      // Prepend new session to the top of the list
      setSessions(prev => [{ id, title: 'New Chat', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...prev]);
      setCurrentSessionId(id);
      setMessages([]);
    } catch (error) {
      console.error('Failed to create session', error);
    }
  };

  const handleSelectSession = (id: string) => {
    if (id === currentSessionId) return;
    setCurrentSessionId(id);
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Delete this conversation?')) return;
    try {
      await ragApi.deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (currentSessionId === id) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete session', error);
    }
  };

  // ─── Document Handlers ─────────────────────────────────────────────────────
  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(10);
    try {
      await ragApi.uploadDocument(file, (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(Math.min(percent, 90));
        }
      });
      await fetchDocuments();
      setUploadProgress(100);
    } catch (error) {
      console.error('Upload failed', error);
      alert('Failed to upload document. Please ensure it is a PDF or DOCX under 2MB.');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm('Remove this document from the knowledge base?')) return;
    try {
      await ragApi.deleteDocument(id);
      setDocuments(docs => docs.filter(d => d.id !== id));
    } catch (error) {
      console.error('Failed to delete', error);
      alert('Failed to delete document.');
    }
  };

  // ─── Chat Handler ──────────────────────────────────────────────────────────
  const handleSendMessage = async (query: string) => {
    // If no session is selected, auto-create one first
    let sessionId = currentSessionId;
    if (!sessionId) {
      try {
        isNewSessionRef.current = true;
        const created = await ragApi.createSession();
        sessionId = created.id;
        setCurrentSessionId(sessionId);
        setSessions(prev => [
          { id: sessionId!, title: query.slice(0, 60) || 'New Chat', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          ...prev
        ]);
      } catch {
        alert('Could not start a session. Please try again.');
        return;
      }
    }

    // Optimistic UI: add user message + empty assistant bubble
    setMessages(prev => [...prev, { role: 'user', content: query }, { role: 'assistant', content: '' }]);
    setIsChatLoading(true);
    setToolStatus('Thinking…');

    try {
      await ragApi.chatStream(
        query,
        sessionId,
        (chunk) => {
          setIsChatLoading(false);
          setToolStatus(null);
          setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            const last = updated[lastIdx];
            if (last?.role === 'assistant') {
              updated[lastIdx] = { ...last, content: last.content + chunk };
            }
            return updated;
          });
        },
        (event) => {
          if (event.type === 'tool') {
            const labels: Record<string, string> = {
              searchDatabase: '🔍 Searching knowledge base…',
              sendEmail: '📧 Drafting email…',
              qualifyLead: '🎯 Analyzing lead data…',
            };
            setToolStatus(labels[event.toolName] ?? 'Using external tool…');
          }
        }
      );
    } catch (error) {
      console.error('Chat failed', error);
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'assistant') {
          last.content = '⚠️ Sorry, I encountered an error. Please try again.';
        }
        return updated;
      });
    } finally {
      setIsChatLoading(false);
      setToolStatus(null);
      // Update the session title in the sidebar (it was set from the first message)
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? { ...s, title: messages[0]?.content?.slice(0, 60) || query.slice(0, 60) || s.title, updatedAt: new Date().toISOString() }
          : s
      ));
    }
  };

  const hasReadyDocuments = documents.some(d => d.status === 'ready');

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans text-text">
      {/* ── Left Sidebar: Sessions + Documents ──────────────── */}
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        isSessionsLoading={isSessionsLoading}
        documents={documents}
        onDeleteDocument={handleDeleteDoc}
        isDocsLoading={isDocsLoading}
      />

      {/* ── Main Content Area ────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full relative min-w-0">
        {/* Header */}
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
              id="dashboard-toggle"
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
            <div className="w-px h-6 bg-border mx-1" />
            <span className="text-xs text-textSecondary uppercase tracking-wider font-semibold flex items-center gap-1">
              <UserIcon size={14} />
              {user?.email}
            </span>
            <div className="bg-surface border border-border px-3 py-1 rounded-full text-xs font-medium text-primary">
              {user?.tenantName}
            </div>
            <button
              id="logout-btn"
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors ml-2"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </header>

        {/* Body */}
        {view === 'dashboard' ? (
          <div className="flex-1 overflow-hidden">
            {isAdmin ? <AdminDashboard /> : <ClientDashboard />}
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Chat */}
            <div className="flex-1 flex flex-col h-full border-r border-border min-w-0 bg-background relative">
              {/* Tool status pill */}
              {toolStatus && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-1.5 rounded-full text-xs font-semibold shadow flex items-center gap-2 z-10 animate-pulse border border-blue-200 dark:border-blue-800">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
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

            {/* Right panel: Upload */}
            <div className="w-80 shrink-0 bg-surface/30 p-6 overflow-y-auto">
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-text uppercase tracking-wider mb-2">Knowledge Ingestion</h2>
                <p className="text-xs text-textSecondary">
                  Upload documents (PDF or DOCX, max 2MB) to teach the AI new information.
                  Processing runs in the background — you can chat immediately after uploading.
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
