import axios from 'axios';

// In Vite, proxy rules in vite.config.ts will map /api to http://localhost:3000
export const api = axios.create({
  baseURL: '/api',
});

// Add a request interceptor to dynamically attach the JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rag_jwt');
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add a response interceptor to catch expired tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rag_jwt');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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

export interface SessionDto {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
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
  // ─── Documents ────────────────────────────────────────────────────────────

  uploadDocument: async (file: File, onUploadProgress?: (progressEvent: any) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/rag/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return response.data;
  },

  getDocuments: async (): Promise<DocumentDto[]> => {
    const response = await api.get('/rag/documents');
    return response.data;
  },

  deleteDocument: async (id: string) => {
    const response = await api.delete(`/rag/documents/${id}`);
    return response.data;
  },

  // ─── Sessions ─────────────────────────────────────────────────────────────

  /**
   * Creates a new empty chat session. Returns the new sessionId.
   */
  createSession: async (): Promise<{ id: string; title: string }> => {
    const response = await api.post('/rag/sessions');
    return response.data;
  },

  /**
   * Lists all sessions for the current user, newest first.
   */
  listSessions: async (): Promise<SessionDto[]> => {
    const response = await api.get('/rag/sessions');
    return response.data;
  },

  /**
   * Deletes a session and all its messages.
   */
  deleteSession: async (id: string) => {
    const response = await api.delete(`/rag/sessions/${id}`);
    return response.data;
  },

  // ─── Chat ─────────────────────────────────────────────────────────────────

  /**
   * Sends a query and streams the response via Server-Sent Events.
   * NestJS @Sse() wraps each event as { data: yourPayload }, so we unwrap it.
   */
  chatStream: async (
    query: string,
    sessionId: string,
    onChunk: (text: string) => void,
    onMetadata: (metadata: any) => void
  ): Promise<void> => {
    const token = localStorage.getItem('rag_jwt');
    const response = await fetch('/api/rag/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, sessionId }),
    });

    if (!response.body) throw new Error('ReadableStream not supported in this browser.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (value) {
        const decoded = decoder.decode(value, { stream: !done });
        console.log('SSE Raw Value:', decoded);
        buffer += decoded;
      }

      const parts = buffer.split('\n\n');
      // If not done, pop the last incomplete part back into the buffer
      buffer = done ? '' : (parts.pop() || '');

      for (const part of parts) {
        if (!part.trim()) continue;

        const lines = part.split('\n');
        const dataLine = lines.find(line => line.startsWith('data: '));

        if (dataLine) {
          try {
            const dataStr = dataLine.slice('data: '.length).trim();
            if (dataStr === '[DONE]') return;

            const envelope = JSON.parse(dataStr);
            console.log('SSE Parsed Event:', envelope);

            // NestJS @Sse() wraps every emission as { data: <yourPayload> }
            const event = envelope.data ?? envelope;

            if (event.type === 'metadata' || event.type === 'tool') {
              onMetadata(event);
            } else if (event.type === 'chunk') {
              onChunk(event.text ?? '');
            } else if (event.type === 'done') {
              return;
            }
          } catch (e) {
            console.error('Error parsing SSE event:', e);
          }
        }
      }

      if (done) break;
    }
  },

  /**
   * Retrieves the conversation history for a session.
   */
  getChatHistory: async (sessionId: string): Promise<ChatMessage[]> => {
    const response = await api.get(`/rag/chat/${sessionId}`);
    return response.data;
  },

  // ─── Admin / Client Stats ─────────────────────────────────────────────────

  getAdminStats: async (): Promise<any> => {
    const response = await api.get('/rag/admin/stats');
    return response.data;
  },

  getClientStats: async (): Promise<any> => {
    const response = await api.get('/rag/client/stats');
    return response.data;
  },
};
