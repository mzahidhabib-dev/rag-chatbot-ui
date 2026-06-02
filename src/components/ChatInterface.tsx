import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Info } from 'lucide-react';
import { type ChatMessage } from '../api/rag.api';
import { cn } from '../utils/cn';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  disabled: boolean;
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
          messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={cn(
                "flex gap-4 max-w-3xl",
                msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                msg.role === 'user' ? "bg-primary text-white" : "bg-surface border border-border text-primary"
              )}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={cn(
                "px-4 py-3 rounded-2xl whitespace-pre-wrap leading-relaxed shadow-sm",
                msg.role === 'user' 
                  ? "bg-primary text-white rounded-tr-none" 
                  : "bg-surface border border-border text-text rounded-tl-none"
              )}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-4 max-w-3xl mr-auto">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 bg-surface border border-border text-primary">
              <Bot className="w-4 h-4" />
            </div>
            <div className="px-5 py-4 rounded-2xl bg-surface border border-border rounded-tl-none flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
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
            placeholder="Ask a question about your documents..."
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
