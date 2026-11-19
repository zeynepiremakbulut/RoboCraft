export type GenerationMode = 'text-to-3d' | 'image-to-3d';

export type GenerationStatus =
  | 'idle'
  | 'uploading'
  | 'queued'
  | 'generating'
  | 'processing'
  | 'completed'
  | 'failed';

export interface GenerationJob {
  id: string;
  mode: GenerationMode;
  status: GenerationStatus;
  progress: number;
  prompt?: string;
  image_filename?: string;
  model_url?: string;
  thumbnail_url?: string;
  format: string;
  created_at: string;
  updated_at: string;
  error?: string;
  provider?: string;
}

export interface ApiError {
  detail: string;
  code?: string;
}

export interface ProviderInfo {
  name: string;
  display_name: string;
  supports_text: boolean;
  supports_image: boolean;
  status: 'available' | 'unavailable' | 'unconfigured';
}

export interface DownloadFormat {
  format: string;
  label: string;
  available: boolean;
}
