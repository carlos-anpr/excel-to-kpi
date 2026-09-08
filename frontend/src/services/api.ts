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

export const getDashboardPreview = async (fileId: string, mapping: any) => {
  const response = await axios.post(`${API_URL}/dashboard/${fileId}/preview`, mapping);
  return response.data;
};

export const saveAlerts = async (fileId: string, rules: any[]) => {
  const response = await axios.post(`${API_URL}/files/${fileId}/alerts`, rules);
  return response.data;
};

export const deleteFile = async (fileId: string) => {
  const response = await axios.delete(`${API_URL}/files/${fileId}`);
  return response.data;
};

export const getFilePreview = async (fileId: string): Promise<UploadResponse> => {
  const response = await axios.get<UploadResponse>(`${API_URL}/files/${fileId}/preview`);
  return response.data;
};

export interface Insight {
  type: 'success' | 'warning' | 'info';
  icon: string;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  data?: Record<string, any>;
}

export interface InsightsResponse {
  file_id: string;
  filename: string;
  insights: Insight[];
  total_insights: number;
}

export const getInsights = async (fileId: string): Promise<InsightsResponse> => {
  const response = await axios.get<InsightsResponse>(`${API_URL}/files/${fileId}/insights`);
  return response.data;
};

// Recommendations types
export interface KPIRecommendation {
  column: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  preview_value: number;
}

export interface ChartRecommendation {
  title: string;
  xAxis: string;
  yAxis: string[];
  breakdown: string | null;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  chart_type_suggestion: string;
}

export interface RecommendationsSummary {
  total_columns: number;
  total_rows: number;
  date_columns_found: number;
  numeric_columns_found: number;
  category_columns_found: number;
  recommended_kpis: number;
  recommended_charts: number;
  message: string;
}

export interface RecommendationsResponse {
  file_id: string;
  filename: string;
  summary: RecommendationsSummary;
  kpi_recommendations: KPIRecommendation[];
  chart_recommendations: ChartRecommendation[];
  analysis: any;
}

export const getRecommendations = async (fileId: string): Promise<RecommendationsResponse> => {
  const response = await axios.get<RecommendationsResponse>(`${API_URL}/files/${fileId}/recommendations`);
  return response.data;
};

export interface NextRecommendationResponse {
  success: boolean;
  recommendation?: KPIRecommendation | ChartRecommendation;
  message?: string;
}

export const getNextRecommendation = async (
  fileId: string, 
  existingConfig: any, 
  type: 'kpi' | 'chart'
): Promise<NextRecommendationResponse> => {
  const response = await axios.post<NextRecommendationResponse>(
    `${API_URL}/files/${fileId}/recommendations/next`,
    { existing_config: existingConfig, type }
  );
  return response.data;
};

// ============== FORECAST TYPES AND FUNCTIONS ==============

export interface ForecastAnalysisResult {
  chart_id: number;
  title: string;
  predictable_metrics: {
    column: string;
    confidence_level: 'high' | 'medium' | 'low';
    r_squared: number;
    trend: 'up' | 'down' | 'stable';
    recommended_periods: number;
    reason: string;
  }[];
}

export interface ForecastDataPoint {
  x: string;
  y: number;
  type: 'historical' | 'forecast';
}

export interface ForecastConfidencePoint {
  x: string;
  y: number;
}

export interface ForecastResult {
  success: boolean;
  error?: string;
  method_used?: string;
  original_data: ForecastDataPoint[];
  forecast_data: ForecastDataPoint[];
  confidence_interval: {
    lower: ForecastConfidencePoint[];
    upper: ForecastConfidencePoint[];
  };
  metrics?: {
    r_squared: number;
    trend: 'up' | 'down' | 'stable';
    trend_value: number;
    confidence: number;
    periods_predicted: number;
  };
  analysis?: {
    can_predict: boolean;
    reason: string;
    confidence_level: string;
    r_squared: number;
    data_points: number;
    trend: string;
    recommended_periods: number;
  };
}

export interface ForecastAnalyzeResponse {
  file_id: string;
  charts_analysis: ForecastAnalysisResult[];
}

/**
 * Analiza qué gráficos pueden tener predicción
 */
export const analyzeForecastAvailability = async (
  fileId: string,
  charts: any[]
): Promise<ForecastAnalyzeResponse> => {
  const response = await axios.post<ForecastAnalyzeResponse>(
    `${API_URL}/files/${fileId}/forecast/analyze`,
    { charts }
  );
  return response.data;
};

/**
 * Genera predicción para un gráfico específico
 */
export const generateForecast = async (
  fileId: string,
  xColumn: string,
  yColumn: string,
  periods?: number,
  method: 'auto' | 'linear' | 'holt_winters' | 'exponential' = 'auto'
): Promise<ForecastResult> => {
  const response = await axios.post<ForecastResult>(
    `${API_URL}/files/${fileId}/forecast/generate`,
    {
      x_column: xColumn,
      y_column: yColumn,
      periods,
      method
    }
  );
  return response.data;
};
