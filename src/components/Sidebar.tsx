import React from 'react';
import { FileText, Trash2, Loader2, Database } from 'lucide-react';
import { type DocumentDto } from '../api/rag.api';


interface SidebarProps {
  documents: DocumentDto[];
  onDelete: (id: string) => void;
  isLoading: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ documents, onDelete, isLoading }) => {
  return (
    <div className="w-64 h-full bg-surface border-r border-border flex flex-col">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Database className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-text">Knowledge Base</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="w-5 h-5 animate-spin text-textSecondary" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-sm text-textSecondary text-center p-4">
            No documents uploaded yet.
          </div>
        ) : (
          documents.map((doc) => (
            <div 
              key={doc.id} 
              className="group flex items-center justify-between p-2 rounded-md hover:bg-border/50 transition-colors"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="w-4 h-4 text-textSecondary flex-shrink-0" />
                <span className="text-sm truncate text-text" title={doc.filename}>
                  {doc.filename}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {doc.status === 'processing' && (
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                )}
                {doc.status === 'failed' && (
                  <div className="w-2 h-2 rounded-full bg-red-500" title="Processing failed" />
                )}
                {doc.status === 'ready' && (
                  <div className="w-2 h-2 rounded-full bg-green-500" title="Ready for search" />
                )}
                <button
                  onClick={() => onDelete(doc.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-textSecondary transition-all"
                  title="Delete document"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
