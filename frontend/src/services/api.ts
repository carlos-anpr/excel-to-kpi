import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

export interface UploadResponse {
  file_id: string;
  filename: string;
  columns: string[];
  preview: any[];
  total_rows: number;
}

export const uploadFile = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post<UploadResponse>(`${API_URL}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const saveMapping = async (fileId: string, mapping: Record<string, string>) => {
  const response = await axios.post(`${API_URL}/files/${fileId}/map`, mapping);
  return response.data;
};

export const getFiles = async () => {
  const response = await axios.get<any[]>(`${API_URL}/files`);
  return response.data;
};

export const getDashboard = async (fileId: string) => {
  const response = await axios.get(`${API_URL}/dashboard/${fileId}`);
  return response.data;
};

export const saveAlerts = async (fileId: string, rules: any[]) => {
  const response = await axios.post(`${API_URL}/files/${fileId}/alerts`, rules);
  return response.data;
};
