import axios from 'axios';

// In Vite, proxy rules in vite.config.ts will map /api to http://localhost:3000
export const api = axios.create({
  baseURL: '/api',
});

export interface DocumentDto {
  id: string;
  filename: string;
  status: 'processing' | 'ready' | 'failed';
  createdAt: string;
}

export interface ChatResponse {
  answer: string;
  sourceChunkIds: string[];
  sessionId: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const authApi = {
  login: async (credentials: any) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  register: async (credentials: any) => {
    const response = await api.post('/auth/register', credentials);
    return response.data;
  },
};

export const ragApi = {
  /**
   * Sets the JWT access token for authentication
   */
  setAuthToken: (token: string | null) => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  },

  /**
   * Uploads a document (PDF/DOCX) to the server
   */
  uploadDocument: async (file: File, onUploadProgress?: (progressEvent: any) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/rag/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return response.data;
  },

  /**
   * Retrieves all uploaded documents
   */
  getDocuments: async (): Promise<DocumentDto[]> => {
    const response = await api.get('/rag/documents');
    return response.data;
  },

  /**
   * Deletes a document by ID
   */
  deleteDocument: async (id: string) => {
    const response = await api.delete(`/rag/documents/${id}`);
    return response.data;
  },

  /**
   * Sends a query to the chat service (legacy JSON endpoint)
   */
  chat: async (query: string, sessionId: string): Promise<ChatResponse> => {
    const response = await api.post('/rag/chat', { query, sessionId });
    return response.data;
  },

  /**
   * Sends a query and streams the response via Server-Sent Events
   */
  chatStream: async (
    query: string, 
    sessionId: string,
    onChunk: (text: string) => void,
    onMetadata: (metadata: any) => void
  ): Promise<void> => {
    const token = api.defaults.headers.common['Authorization'] as string;
    const response = await fetch('/api/rag/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': token } : {}),
      },
      body: JSON.stringify({ query, sessionId }),
    });

    if (!response.body) throw new Error('ReadableStream not supported in this browser.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || ''; // keep the incomplete part in the buffer

      for (const part of parts) {
        if (part.startsWith('data: ')) {
          try {
            const dataStr = part.replace('data: ', '').trim();
            if (dataStr === '[DONE]') return;
            
            const event = JSON.parse(dataStr);
            if (event.type === 'metadata') {
              onMetadata(event);
            } else if (event.type === 'chunk') {
              onChunk(event.text);
            } else if (event.type === 'done') {
              return;
            }
          } catch (e) {
            console.error('Error parsing SSE event:', e);
          }
        }
      }
    }
  },

  /**
   * Retrieves the conversation history for a session
   */
  getChatHistory: async (sessionId: string): Promise<ChatMessage[]> => {
    const response = await api.get(`/rag/chat/${sessionId}`);
    return response.data;
  },

  /**
   * Retrieves global analytics for the Admin Dashboard
   */
  getAdminStats: async (): Promise<any> => {
    const response = await api.get('/rag/admin/stats');
    return response.data;
  },

  /**
   * Retrieves tenant-specific analytics for the Client Dashboard
   */
  getClientStats: async (): Promise<any> => {
    const response = await api.get('/rag/client/stats');
    return response.data;
  },
};
