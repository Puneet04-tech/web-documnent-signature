import axios, { AxiosError, AxiosInstance } from 'axios';
import { ApiResponse, AuthResponse, User, Document, Signature, SignatureType, SigningRequest, AuditLog, PaginatedResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiResponse<any>>) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && originalRequest) {
          const refreshToken = localStorage.getItem('refreshToken');
          
          if (refreshToken) {
            try {
              const response = await axios.post<ApiResponse<{ accessToken: string }>>(
                `${API_URL}/auth/refresh`,
                { refreshToken }
              );
              
              const { accessToken } = response.data.data;
              localStorage.setItem('accessToken', accessToken);
              
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.client(originalRequest);
            } catch {
              // Refresh failed, logout user
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              window.location.href = '/login';
            }
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Auth API
  async register(name: string, email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    const response = await this.client.post('/auth/register', { name, email, password });
    return response.data;
  }

  async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<{ accessToken: string }>> {
    const response = await this.client.post('/auth/refresh', { refreshToken });
    return response.data;
  }

  async getMe(): Promise<ApiResponse<User>> {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  // Document API
  async uploadDocument(file: File, title?: string, description?: string): Promise<ApiResponse<{ document: Document }>> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (description) formData.append('description', description);

    const response = await this.client.post('/docs/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async getDocuments(params?: { status?: string; search?: string; page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<Document>>> {
    const response = await this.client.get('/docs', { params });
    return response.data;
  }

  async getDocument(id: string): Promise<ApiResponse<{ document: Document; signatures: Signature[]; signingRequests: SigningRequest[] }>> {
    const response = await this.client.get(`/docs/${id}`);
    return response.data;
  }

  async downloadDocument(id: string, signed?: boolean): Promise<Blob> {
    const response = await this.client.get(`/docs/${id}/download`, {
      params: { signed },
      responseType: 'blob',
    });
    return response.data;
  }

  async deleteDocument(id: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete(`/docs/${id}`);
    return response.data;
  }

  // Signature API
  async createSignature(data: {
    documentId: string;
    page: number;
    x: number;
    y: number;
    width?: number;
    height?: number;
    type: SignatureType;
    signatureData: string;
    signingRequestId?: string;
  }): Promise<ApiResponse<{ signature: Signature }>> {
    const response = await this.client.post('/signatures', data);
    return response.data;
  }

  async getSignatures(docId: string): Promise<ApiResponse<{ signatures: Signature[] }>> {
    const response = await this.client.get(`/signatures/${docId}`);
    return response.data;
  }

  async removeSignature(id: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete(`/signatures/${id}`);
    return response.data;
  }

  // Signing Request API
  async createSigningRequest(data: {
    documentId: string;
    signers: { email: string; name: string; role: string }[];
    signingOrder?: 'sequential' | 'parallel';
    message?: string;
    subject?: string;
    expiresInDays?: number;
  }): Promise<ApiResponse<{ signingRequest: SigningRequest }>> {
    const response = await this.client.post('/signing-requests', data);
    return response.data;
  }

  async getSigningRequests(params?: { status?: string; page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<SigningRequest>>> {
    const response = await this.client.get('/signing-requests', { params });
    return response.data;
  }

  async getSigningRequestByToken(token: string, email?: string): Promise<ApiResponse<{ signingRequest: SigningRequest; currentSigner: any; signatures: Signature[] }>> {
    const response = await this.client.get(`/signing-requests/public/${token}`, { params: { email } });
    return response.data;
  }

  async signByToken(token: string, data: {
    email: string;
    signatureData: string;
    type: string;
    page: number;
    x: number;
    y: number;
    width?: number;
    height?: number;
    rejectReason?: string;
  }): Promise<ApiResponse<{ signature: Signature; completed: boolean }>> {
    const response = await this.client.post(`/signing-requests/public/${token}/sign`, data);
    return response.data;
  }

  async resendSigningRequest(id: string): Promise<ApiResponse<void>> {
    const response = await this.client.post(`/signing-requests/${id}/resend`);
    return response.data;
  }

  async cancelSigningRequest(id: string): Promise<ApiResponse<void>> {
    const response = await this.client.post(`/signing-requests/${id}/cancel`);
    return response.data;
  }

  // Audit API
  async getAuditLogs(docId: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<AuditLog>>> {
    const response = await this.client.get(`/audit/${docId}`, { params });
    return response.data;
  }

  // Signature Field API
  async getSignatureFields(docId: string): Promise<ApiResponse<{ fields: any[] }>> {
    const response = await this.client.get(`/signature-fields/document/${docId}`);
    return response.data;
  }

  async createSignatureField(data: {
    documentId: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    type: string;
    label?: string;
    placeholder?: string;
    required?: boolean;
    assignedTo?: string;
  }): Promise<ApiResponse<{ field: any }>> {
    const response = await this.client.post('/signature-fields', data);
    return response.data;
  }

  async updateSignatureField(id: string, data: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    label?: string;
    placeholder?: string;
    required?: boolean;
    assignedTo?: string;
  }): Promise<ApiResponse<{ field: any }>> {
    const response = await this.client.put(`/signature-fields/${id}`, data);
    return response.data;
  }

  async deleteSignatureField(id: string): Promise<ApiResponse<void>> {
    const response = await this.client.delete(`/signature-fields/${id}`);
    return response.data;
  }

  async fillSignatureField(data: {
    fieldId: string;
    value: string;
    type: string;
    signatureData?: string;
  }): Promise<ApiResponse<{ field: any }>> {
    const response = await this.client.post('/signature-fields/fill', data);
    return response.data;
  }

  // Finalize API
  async finalizeDocument(docId: string): Promise<ApiResponse<{ document: any; signedFilePath: string; fieldsEmbedded: number }>> {
    const response = await this.client.post(`/finalize/${docId}/finalize`);
    return response.data;
  }

  async previewSignedPDF(docId: string): Promise<Blob> {
    const response = await this.client.get(`/finalize/${docId}/preview`, {
      responseType: 'blob'
    });
    return response.data;
  }
}

export const api = new ApiService();
export default api;
