import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Info, BookOpen } from 'lucide-react';
import { type ChatMessage } from '../api/rag.api';
import { cn } from '../utils/cn';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  disabled: boolean;
}

/**
 * Parses [Source: filename.pdf, Page X] citations from assistant text
 * and renders them as styled badge chips below the message bubble.
 */
function parseSources(content: string): { text: string; sources: { filename: string; page: string }[] } {
  const sourceRegex = /\[Source:\s*([^,\]]+),\s*Page\s*([^\]]+)\]/gi;
  const sources: { filename: string; page: string }[] = [];
  let match;

  while ((match = sourceRegex.exec(content)) !== null) {
    const filename = match[1].trim();
    const page = match[2].trim();
    // Deduplicate
    if (!sources.some(s => s.filename === filename && s.page === page)) {
      sources.push({ filename, page });
    }
  }

  // Remove citation markers from the displayed text
  const text = content.replace(sourceRegex, '').replace(/\n{3,}/g, '\n\n').trim();
  return { text, sources };
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isLoading,
  disabled
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || disabled) return;
    const query = input;
    setInput('');
    await onSendMessage(query);
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      {disabled && (
        <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[1px] flex flex-col items-center justify-center p-6 text-center">
          <Info className="w-10 h-10 text-primary mb-3" />
          <h3 className="text-lg font-semibold text-text mb-1">Knowledge Base Empty</h3>
          <p className="text-sm text-textSecondary max-w-sm">
            Upload at least one document to start chatting with the AI assistant.
          </p>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && !disabled ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
            <Bot className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-lg font-medium text-text">How can I help you today?</h3>
            <p className="text-sm text-textSecondary mt-1">Ask any question based on your uploaded documents.</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isAssistant = msg.role === 'assistant';
            const { text, sources } = isAssistant ? parseSources(msg.content) : { text: msg.content, sources: [] };

            return (
              <div
                key={idx}
                className={cn(
                  'flex gap-3 max-w-3xl',
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1',
                  msg.role === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-surface border border-border text-primary'
                )}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Bubble + Citations */}
                <div className="flex flex-col gap-2">
                  <div className={cn(
                    'px-4 py-3 rounded-2xl whitespace-pre-wrap leading-relaxed shadow-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-tr-none'
                      : 'bg-surface border border-border text-text rounded-tl-none'
                  )}>
                    {text ? text : (isAssistant && isLoading && idx === messages.length - 1 ? (
                      <div className="flex items-center gap-1.5 h-5 px-1">
                        <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    ) : text)}
                  </div>

                  {/* Source Citation Badges */}
                  {sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-1">
                      {sources.map((src, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          title={`${src.filename}, Page ${src.page}`}
                        >
                          <BookOpen className="w-2.5 h-2.5" />
                          {src.filename.length > 20 ? src.filename.slice(0, 18) + '…' : src.filename}
                          {src.page !== '?' && ` · p.${src.page}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background border-t border-border shrink-0">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={disabled || isLoading}
            placeholder="Ask a question about your documents…"
            className="w-full bg-surface border border-border rounded-full pl-5 pr-14 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary/50 text-text placeholder-textSecondary disabled:opacity-50 transition-all shadow-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || disabled || isLoading}
            className="absolute right-2 top-2 p-2 rounded-full bg-primary text-white disabled:bg-surface disabled:text-textSecondary hover:bg-primaryHover transition-colors flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};
