import React from 'react';
import {
  FileText, Trash2, Loader2, Database, MessageSquarePlus,
  MessagesSquare, Clock, CheckCircle2, XCircle,
} from 'lucide-react';
import { type DocumentDto, type SessionDto } from '../api/rag.api';
import { cn } from '../utils/cn';

interface SidebarProps {
  // Sessions
  sessions: SessionDto[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  isSessionsLoading: boolean;
  // Documents
  documents: DocumentDto[];
  onDeleteDocument: (id: string) => void;
  isDocsLoading: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isSessionsLoading,
  documents,
  onDeleteDocument,
  isDocsLoading,
}) => {
  return (
    <div className="w-64 h-full bg-surface border-r border-border flex flex-col shrink-0">

      {/* ── New Chat Button ─────────────────────────────── */}
      <div className="p-3 border-b border-border">
        <button
          id="new-chat-btn"
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-medium text-sm transition-all duration-150 group"
        >
          <MessageSquarePlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
          New Chat
        </button>
      </div>

      {/* ── Sessions List ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 pt-3 pb-1">
          <p className="text-[10px] font-semibold text-textSecondary uppercase tracking-widest flex items-center gap-1.5">
            <MessagesSquare className="w-3 h-3" />
            Recent Chats
          </p>
        </div>

        <div className="px-2 pb-2 space-y-0.5">
          {isSessionsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-textSecondary" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-textSecondary text-center py-4 px-2">
              No chats yet. Hit "New Chat" to start.
            </p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                id={`session-${session.id}`}
                className={cn(
                  'group flex items-start justify-between gap-1 px-2 py-2 rounded-lg cursor-pointer transition-all duration-100',
                  currentSessionId === session.id
                    ? 'bg-primary/15 text-primary'
                    : 'hover:bg-border/60 text-text'
                )}
                onClick={() => onSelectSession(session.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate leading-snug">
                    {session.title}
                  </p>
                  <p className="text-[10px] text-textSecondary mt-0.5 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {timeAgo(session.updatedAt)}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 text-textSecondary transition-all shrink-0 mt-0.5"
                  title="Delete session"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* ── Documents Section ─────────────────────────── */}
        <div className="border-t border-border mt-1">
          <div className="px-3 pt-3 pb-1">
            <p className="text-[10px] font-semibold text-textSecondary uppercase tracking-widest flex items-center gap-1.5">
              <Database className="w-3 h-3" />
              Knowledge Base
            </p>
          </div>

          <div className="px-2 pb-3 space-y-0.5">
            {isDocsLoading ? (
              <div className="flex justify-center py-3">
                <Loader2 className="w-4 h-4 animate-spin text-textSecondary" />
              </div>
            ) : documents.length === 0 ? (
              <p className="text-xs text-textSecondary text-center py-3 px-2">
                No documents uploaded yet.
              </p>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="group flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-border/40 transition-colors"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="w-3.5 h-3.5 text-textSecondary flex-shrink-0" />
                    <span className="text-xs truncate text-text" title={doc.filename}>
                      {doc.filename}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {doc.status === 'processing' && (
                      <span title="Processing…"><Loader2 className="w-3 h-3 animate-spin text-primary" /></span>
                    )}
                    {doc.status === 'failed' && (
                      <span title="Processing failed"><XCircle className="w-3 h-3 text-red-500" /></span>
                    )}
                    {doc.status === 'ready' && (
                      <span title="Ready"><CheckCircle2 className="w-3 h-3 text-green-500" /></span>
                    )}
                    <button
                      onClick={() => onDeleteDocument(doc.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 text-textSecondary transition-all"
                      title="Delete document"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
