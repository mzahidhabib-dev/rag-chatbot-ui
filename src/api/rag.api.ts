import axios from 'axios';

// In Vite, proxy rules in vite.config.ts will map /api to http://localhost:3000
const api = axios.create({
  baseURL: '/api/rag',
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

export const ragApi = {
  /**
   * Uploads a document (PDF/DOCX) to the server
   */
  uploadDocument: async (file: File, onUploadProgress?: (progressEvent: any) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return response.data;
  },

  /**
   * Retrieves all uploaded documents
   */
  getDocuments: async (): Promise<DocumentDto[]> => {
    const response = await api.get('/documents');
    return response.data;
  },

  /**
   * Deletes a document by ID
   */
  deleteDocument: async (id: string) => {
    const response = await api.delete(`/documents/${id}`);
    return response.data;
  },

  /**
   * Sends a query to the chat service
   */
  chat: async (query: string, sessionId: string): Promise<ChatResponse> => {
    const response = await api.post('/chat', { query, sessionId });
    return response.data;
  },

  /**
   * Retrieves the conversation history for a session
   */
  getChatHistory: async (sessionId: string): Promise<ChatMessage[]> => {
    const response = await api.get(`/chat/${sessionId}`);
    return response.data;
  },
};
